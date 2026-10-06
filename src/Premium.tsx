import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { Trip, vehicles, Vehicle } from './domain';
import { Accent, accents, analyzeTrips, Preferences, tripAdvice } from './premiumDomain';
import { pickAvatar } from './avatar';
import { ProfileAvatar } from './ProfileAvatar';
import { Button, Card, colors, Disclosure, Metric, s, ValueRow } from './ui';

const benefits = [
  { title: 'Tu estilo', description: 'Elige tu foto, personaliza tu nombre y cambia el color de acento de la app.' },
  { title: 'Tu vehículo', description: 'Ponle un nombre a tu automóvil, motocicleta o bicicleta.' },
  { title: 'Análisis de tus viajes', description: 'Consulta estadísticas reales, compara el riesgo de tus últimos viajes y revisa eventos frecuentes.' },
  { title: 'Reportes y recomendaciones', description: 'Comparte un resumen de tus recorridos y consulta sugerencias basadas en los eventos registrados.' },
];

export function Premium({ preferences, trips, onChange }: { preferences: Preferences; trips: Trip[]; onChange: (next: Preferences) => Promise<void> }) {
  const [checkout, setCheckout] = useState(false);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [method, setMethod] = useState<'card' | 'wallet'>('card');
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
  async function confirmPayment() {
    setBusy(true); setError('');
    try {
      await onChange({ ...preferences, premiumDemo: true, activatedAt: Date.now() });
      setSuccess(true);
    } catch { setError('No se pudo guardar la activación. No se realizó ningún cobro.'); }
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
  return <>
    <View style={s.pageHeading}>
      <Text style={s.eyebrow}>RoadGuard Premium</Text>
      <Text style={s.hero}>{preferences.premiumDemo ? 'Tu espacio Premium' : 'Más sobre tus viajes'}</Text>
      <Text style={s.description}>{preferences.premiumDemo ? 'Personaliza tu experiencia y conoce mejor tus recorridos.' : 'Dale tu estilo a RoadGuard y desbloquea el análisis de tus viajes.'}</Text>
    </View>
    <Card>
      <View style={s.row}><Text style={s.title}>{preferences.premiumDemo ? 'Premium activo' : 'Plan mensual'}</Text><Text style={s.badge}>{preferences.premiumDemo ? 'Demo' : 'Pago simulado'}</Text></View>
      <Text style={s.premiumPrice}>$49.99<Text style={s.premiumCurrency}> MXN / mes</Text></Text>
      <Text style={s.muted}>Precio de referencia para la suscripción mensual.</Text>
      {!preferences.premiumDemo && <Button title="Probar Premium" onPress={() => { setSuccess(false); setError(''); setCheckout(true); }} />}
      <Text style={s.footnote}>Demostración local. No se cobra dinero ni se crea una suscripción en Stripe.</Text>
    </Card>
    {!preferences.premiumDemo && <View style={s.stacked}>
      <Text style={s.title}>{preferences.premiumDemo ? 'Tus beneficios' : 'Incluido en Premium'}</Text>
      {benefits.map((benefit, index) => <View key={benefit.title} style={s.premiumBenefit}>
        <Text style={s.premiumNumber}>{String(index + 1).padStart(2, '0')}</Text>
        <View style={{ flex: 1, gap: 5 }}><Text style={s.body}>{benefit.title}</Text><Text style={s.description}>{benefit.description}</Text></View>
      </View>)}
    </View>}
    {preferences.premiumDemo && <>
      <Card><Text style={s.title}>Tu perfil</Text><View style={s.row}><ProfileAvatar preferences={preferences} /><View style={{ flex: 1 }}><Text style={s.body}>{preferences.displayName || 'Tu nombre'}</Text><Text style={s.muted}>Premium · Demo</Text></View></View>
        <Button title="Cambiar foto" secondary disabled={busy} onPress={() => void changePhoto()} />
        <Text style={s.caption}>Nombre visible</Text><TextInput accessibilityLabel="Nombre visible" value={name} onChangeText={setName} maxLength={30} placeholder="¿Cómo te llamas?" placeholderTextColor={colors.muted} style={s.input} />
        <Button title="Guardar nombre" disabled={busy || name.trim() === preferences.displayName} onPress={() => void update({ ...preferences, displayName: name.trim() })} />
        <Text style={s.caption}>Color de acento</Text><View style={s.row}>{(Object.keys(accents) as Accent[]).map(key => <Pressable key={key} accessibilityRole="radio" accessibilityLabel={accents[key].name} accessibilityState={{ checked: preferences.accent === key, disabled: busy }} aria-checked={preferences.accent === key} disabled={busy} onPress={() => void update({ ...preferences, accent: key })} style={[s.swatch, { backgroundColor: accents[key].color, borderColor: preferences.accent === key ? colors.ink : accents[key].color }]}><Text style={{ color: '#FFFFFF', fontSize: 18 }}>{preferences.accent === key ? '✓' : ''}</Text></Pressable>)}</View>
        <Text style={s.footnote}>Perfil local en este dispositivo. No es una cuenta ni requiere iniciar sesión.</Text>
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
      <Disclosure title="Administrar demostración"><Text style={s.footnote}>Puedes volver al plan gratuito. Tus viajes y personalización se conservan; los beneficios Premium se ocultan hasta que vuelvas a activarlos.</Text><Button title="Volver al plan gratuito" secondary disabled={busy} onPress={() => void update({ ...preferences, premiumDemo: false })} /></Disclosure>
    </>}
    <Disclosure title="Servicio Premium en desarrollo"><Text style={s.description}>Las notificaciones push, el envío a contactos y la integración de pago real con Stripe se incorporarán más adelante. La alerta de accidente actual sigue siendo local.</Text><Text style={s.footnote}>Solo se simula el pago. Los sensores y las estadísticas siempre usan datos reales.</Text></Disclosure>
    <Modal visible={checkout} transparent animationType="fade" onRequestClose={() => { if (!busy) setCheckout(false); }}><View style={s.overlay}><View style={s.alertCard}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.modalContent}>
      <Text style={s.eyebrow}>Simulación de pago</Text><Text style={s.hero}>{success ? 'Premium activado' : 'Confirmar Premium'}</Text>
      {success ? <><Text style={s.description}>Ya puedes personalizar tu perfil y consultar las herramientas Premium. No se realizó ningún cobro.</Text><Text style={s.badge}>Activación de demostración</Text><Button title="Explorar mi Premium" onPress={() => setCheckout(false)} /></> : <>
        <ValueRow label="Plan mensual" value="$49.99 MXN" />
        <Text style={s.caption}>Método de demostración</Text>
        {(['card', 'wallet'] as const).map(key => <Pressable key={key} accessibilityRole="radio" accessibilityLabel={key === 'card' ? 'Tarjeta demo' : 'Billetera demo'} accessibilityState={{ checked: method === key, disabled: busy }} aria-checked={method === key} disabled={busy} onPress={() => setMethod(key)} style={[s.vehicle, method === key && s.vehicleSelected]}><View style={{ flex: 1 }}><Text style={s.body}>{key === 'card' ? 'Tarjeta demo' : Platform.OS === 'ios' ? 'Apple Pay · Demo' : Platform.OS === 'android' ? 'Google Pay · Demo' : 'Billetera · Demo'}</Text><Text style={s.muted}>{key === 'card' ? '•••• 4242 · Datos ficticios' : 'Método simulado, sin conexión'}</Text></View><View style={[s.selection, method === key && s.selectionActive]}>{method === key && <View style={s.selectionDot} />}</View></Pressable>)}
        <Text style={s.footnote}>No introduzcas datos bancarios. Este flujo no se conecta con Stripe, Apple Pay ni Google Pay.</Text>
        {!!error && <Text style={s.notice}>{error}</Text>}
        <Button title={busy ? 'Activando…' : 'Confirmar pago simulado'} disabled={busy} onPress={() => void confirmPayment()} /><Button title="Cancelar" secondary disabled={busy} onPress={() => setCheckout(false)} />
      </>}
    </ScrollView></View></View></Modal>
  </>;
}
