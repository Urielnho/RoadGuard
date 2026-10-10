import { useState } from 'react';
import { Alert, Pressable, Share, Text, TextInput, View } from 'react-native';
import { SubscriptionManager } from './SubscriptionManager';
import { openBilling } from './billingClient';
import type { useSubscription } from './useSubscription';
import { Trip, vehicles, Vehicle } from './domain';
import { Accent, accents, analyzeTrips, Preferences, tripAdvice } from './premiumDomain';
import { pickAvatar } from './avatar';
import { ProfileAvatar } from './ProfileAvatar';
import { Button, Card, colors, Disclosure, Metric, useStyles, ValueRow } from './ui';

const benefits = [
  { title: 'Tu estilo', description: 'Elige tu foto, personaliza tu nombre y cambia el color de acento de la app.' },
  { title: 'Tu vehículo', description: 'Ponle un nombre a tu automóvil, motocicleta o bicicleta.' },
  { title: 'Análisis de tus viajes', description: 'Consulta estadísticas reales, compara el riesgo de tus últimos viajes y revisa eventos frecuentes.' },
  { title: 'Reportes y recomendaciones', description: 'Comparte un resumen de tus recorridos y consulta sugerencias basadas en los eventos registrados.' },
];

export function Premium({ preferences, trips, onChange, billing }: { preferences: Preferences; trips: Trip[]; onChange: (next: Preferences) => Promise<void>; billing: ReturnType<typeof useSubscription> }) {
  const s = useStyles();
  const [managing, setManaging] = useState(false);
  const [verifying, setVerifying] = useState(false);
  if (billing.active && verifying) setVerifying(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(preferences.displayName);
  const [vehicle, setVehicle] = useState<Vehicle>('auto');
  const [alias, setAlias] = useState(preferences.vehicleNames.auto);
  const analytics = analyzeTrips(trips);
  const fmt = (value: number | null, digits = 1) => value === null ? '—' : value.toFixed(digits);
  async function update(next: Preferences) {
    setBusy(true);
    try { await onChange(next); }
    catch { Alert.alert('No se pudo guardar', 'Intenta de nuevo. Los cambios no se guardaron.'); }
    finally { setBusy(false); }
  }
  async function pay() {
    setBusy(true); setError('');
    try {
      if (await openBilling('checkout')) setVerifying(true);
      billing.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo abrir Stripe.'); }
    finally { setBusy(false); }
  }
  async function changePhoto() {
    setBusy(true);
    try {
      const avatarUri = await pickAvatar();
      if (avatarUri) await onChange({ ...preferences, avatarUri });
    } catch { Alert.alert('No se pudo cambiar la foto', 'Intenta elegir otra imagen desde tu galería.'); }
    finally { setBusy(false); }
  }
  async function shareReport() {
    const message = `RoadGuard · Reporte de viajes\nViajes reales: ${analytics.count}\nDistancia registrada: ${fmt(analytics.distance === null ? null : analytics.distance / 1000, 2)} km\nRiesgo medio por viaje: ${fmt(analytics.averageRisk, 0)} /100\nVelocidad máxima registrada: ${fmt(analytics.maxSpeed)} km/h\nEventos registrados: ${analytics.events}\n${analytics.eventCounts.map(([type, count]) => `${type}: ${count}`).join('\n')}\nÍndice académico basado en reglas, no probabilidad de accidente.`;
    try { await Share.share({ title: 'Reporte RoadGuard', message }); }
    catch { Alert.alert('No se pudo compartir', 'Intenta de nuevo desde tu teléfono.'); }
  }
  if (managing) return <SubscriptionManager onClose={() => setManaging(false)} onChanged={billing.refresh} />;
  return <>
    <View style={s.pageHeading}>
      <Text style={s.eyebrow}>RoadGuard Premium</Text>
      <Text style={s.hero}>{preferences.premiumDemo ? 'Tu espacio Premium' : 'Más sobre tus viajes'}</Text>
      <Text style={s.description}>{preferences.premiumDemo ? 'Personaliza tu experiencia y conoce mejor tus recorridos.' : 'Dale tu estilo a RoadGuard y desbloquea el análisis de tus viajes.'}</Text>
    </View>
    <Card>
      <View style={s.row}><Text style={s.title}>{preferences.premiumDemo ? 'Premium activo' : 'Plan mensual'}</Text><Text style={s.badge}>Stripe · Prueba</Text></View>
      <Text style={s.premiumPrice}>$49.99<Text style={s.premiumCurrency}> MXN / mes</Text></Text>
      <Text style={s.muted}>Suscripción mensual de prueba. No se cobra dinero real.</Text>
      {!preferences.premiumDemo && !verifying && <Button title={busy ? 'Abriendo Stripe…' : 'Suscribirme con Stripe'} disabled={busy} onPress={() => void pay()} />}
      <Button title="Administrar suscripción" secondary disabled={busy} onPress={() => setManaging(true)} />
      {verifying && !billing.active && <Text accessibilityLiveRegion="polite" style={s.muted}>Verificando pago… Premium se actualizará automáticamente al recibir la confirmación.</Text>}
      {!!(error || billing.error) && <Text accessibilityRole="alert" style={s.notice}>{error || billing.error}</Text>}
      {!billing.ready && <Text style={s.muted}>Esperando verificación de Premium…</Text>}
      {billing.subscription?.cancelAtPeriodEnd && <Text style={s.notice}>Cancelación programada al finalizar el período pagado.</Text>}
      <Text style={s.footnote}>Usa una tarjeta de prueba de Stripe. Ingresa tu tarjeta en el formulario seguro. Premium se activa cuando el servidor confirma el pago.</Text>
    </Card>
    {!preferences.premiumDemo && <View style={s.stacked}>
      <Text style={s.title}>{preferences.premiumDemo ? 'Tus beneficios' : 'Incluido en Premium'}</Text>
      {benefits.map((benefit, index) => <View key={benefit.title} style={s.premiumBenefit}>
        <Text style={s.premiumNumber}>{String(index + 1).padStart(2, '0')}</Text>
        <View style={{ flex: 1, gap: 5 }}><Text style={s.body}>{benefit.title}</Text><Text style={s.description}>{benefit.description}</Text></View>
      </View>)}
    </View>}
    {preferences.premiumDemo && <>
      <Card><Text style={s.title}>Tu perfil</Text><View style={s.row}><ProfileAvatar preferences={preferences} /><View style={{ flex: 1 }}><Text style={s.body}>{preferences.displayName || 'Tu nombre'}</Text><Text style={s.muted}>Premium · Stripe prueba</Text></View></View>
        <Button title="Cambiar foto" secondary disabled={busy} onPress={() => void changePhoto()} />
        <Text style={s.caption}>Nombre visible</Text><TextInput accessibilityLabel="Nombre visible" value={name} onChangeText={setName} maxLength={30} placeholder="¿Cómo te llamas?" placeholderTextColor={colors.muted} style={s.input} />
        <Button title="Guardar nombre" disabled={busy || name.trim() === preferences.displayName} onPress={() => void update({ ...preferences, displayName: name.trim() })} />
        <Text style={s.caption}>Color de acento</Text><View style={s.row}>{(Object.keys(accents) as Accent[]).map(key => <Pressable key={key} accessibilityRole="radio" accessibilityLabel={accents[key].name} accessibilityState={{ checked: preferences.accent === key, disabled: busy }} aria-checked={preferences.accent === key} disabled={busy} onPress={() => void update({ ...preferences, accent: key })} style={[s.swatch, { backgroundColor: accents[key].color, borderColor: preferences.accent === key ? colors.ink : accents[key].color }]}><Text style={{ color: '#FFFFFF', fontSize: 18 }}>{preferences.accent === key ? '✓' : ''}</Text></Pressable>)}</View>
        <Text style={s.footnote}>La foto y la personalización se guardan para tu cuenta en este dispositivo.</Text>
      </Card>
      <Card><Text style={s.title}>Tu vehículo, con tu nombre</Text><View style={s.vehicleGroup}>{(Object.keys(vehicles) as Vehicle[]).map(key => <Pressable key={key} accessibilityRole="radio" accessibilityLabel={vehicles[key].name} accessibilityState={{ checked: vehicle === key }} aria-checked={vehicle === key} onPress={() => { setVehicle(key); setAlias(preferences.vehicleNames[key]); }} style={[s.vehicle, vehicle === key && s.vehicleSelected]}><Text style={s.body}>{vehicles[key].name}</Text><Text style={s.muted}>{preferences.vehicleNames[key]}</Text></Pressable>)}</View>
        <TextInput accessibilityLabel="Nombre de tu vehículo" value={alias} onChangeText={setAlias} maxLength={30} placeholder="Ej. Mi bicicleta" placeholderTextColor={colors.muted} style={s.input} />
        <Button title="Guardar vehículo" disabled={busy || alias.trim() === preferences.vehicleNames[vehicle]} onPress={() => void update({ ...preferences, vehicleNames: { ...preferences.vehicleNames, [vehicle]: alias.trim() } })} />
      </Card>
      <Card><Text style={s.title}>Estadísticas de tus viajes</Text><View style={s.row}><Metric label="Riesgo medio" value={fmt(analytics.averageRisk, 0)} unit="por viaje · /100" /><Metric label="Distancia" value={fmt(analytics.distance === null ? null : analytics.distance / 1000, 2)} unit="km registrados" /></View><ValueRow label="Viajes reales" value={`${analytics.count}`} /><ValueRow label="Velocidad máxima registrada" value={`${fmt(analytics.maxSpeed)} km/h`} /><ValueRow label="Eventos registrados" value={`${analytics.events}`} />
        {!analytics.count && <Text style={s.description}>Completa tu primer viaje para comenzar a ver tus estadísticas.</Text>}
        <Text style={s.footnote}>Calculado únicamente con viajes reales guardados. Los datos ausentes no se inventan.</Text>
      </Card>
      <Card><Text style={s.title}>Evolución del riesgo</Text><Text style={s.description}>{analytics.riskChange === null ? 'Necesitas dos viajes con datos de riesgo para comparar.' : analytics.riskChange < 0 ? `El riesgo medio de tu último viaje bajó ${Math.abs(analytics.riskChange).toFixed(0)} puntos frente al anterior.` : analytics.riskChange > 0 ? `El riesgo medio de tu último viaje subió ${analytics.riskChange.toFixed(0)} puntos frente al anterior.` : 'El riesgo medio de tus dos últimos viajes es similar.'}</Text>
        {analytics.eventCounts.slice(0, 3).map(([type, count]) => <ValueRow key={type} label={type} value={`${count} eventos`} />)}
        <Text style={s.caption}>Sugerencia para tu próximo viaje</Text><Text style={s.description}>{tripAdvice(analytics.eventCounts[0]?.[0])}</Text>
      </Card>
      <Button title="Compartir reporte de viajes" disabled={!analytics.count} onPress={() => void shareReport()} />
      <Disclosure title="Tu suscripción"><Text style={s.footnote}>Gestiona la cancelación desde Administrar suscripción. Conservas los beneficios hasta finalizar el período confirmado por Stripe. Tus viajes y personalización permanecen guardados.</Text></Disclosure>
    </>}
    <Text style={s.footnote}>Tu suscripción está vinculada a tu cuenta de RoadGuard. Los viajes completos y la personalización se guardan en este dispositivo.</Text>
  </>;
}
