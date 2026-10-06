import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { router, Slot, usePathname } from 'expo-router';
import { Alert, AppState, BackHandler, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { distanceBetween, emptyReading, evaluate, Reading, RiskEvent, riskLabel, riskScore, Trip, Vehicle, vehicles } from './src/domain';
import { loadTrips, saveTrip } from './src/storage';
import { useSensors } from './src/useSensors';
import { Button, Card, colors, Disclosure, Metric, s, ValueRow } from './src/ui';
import { Premium } from './src/Premium';

type Page = 'home' | 'prepare' | 'monitor' | 'history' | 'detail' | 'premium';
const ScreenContext = createContext<React.ReactNode>(null);
export function RoadGuardScreen() { return useContext(ScreenContext); }
const fmt = (n: number | null, decimals = 1) => n === null ? '—' : n.toFixed(decimals);
const duration = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
function Awake() { useKeepAwake(); return null; }
function RoadGuard() {
  const pathname = usePathname();
  const route = pathname.slice(1);
  const page: Page = ['home', 'prepare', 'monitor', 'history', 'detail', 'premium'].includes(route) ? route as Page : 'home';
  const setPage = useCallback((next: Page) => router.replace(`/${next}`), []);
  const [vehicle, setVehicle] = useState<Vehicle>('auto');
  const [calibrated, setCalibrated] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selected, setSelected] = useState<Trip | null>(null);
  const [reading, setReading] = useState<Reading>(emptyReading());
  const [score, setScore] = useState(0);
  const [reasons, setReasons] = useState<RiskEvent[]>([]);
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [about, setAbout] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const session = useRef<{ start: number; readings: Reading[]; events: RiskEvent[]; scores: number[]; distance: number | null } | null>(null);
  const previous = useRef<Reading | null>(null);
  const cooldowns = useRef<Record<string, number>>({});
  const foreground = useRef(true);
  const sensors = useSensors(page === 'prepare' || page === 'monitor');
  const sampleRef = useRef(sensors.sample);
  useEffect(() => { sampleRef.current = sensors.sample; }, [sensors.sample]);
  useEffect(() => { loadTrips().then(setTrips).catch(() => setNotice('No se pudo abrir el historial local.')); }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      foreground.current = state === 'active';
      if (state !== 'active') previous.current = null;
      if (session.current) setNotice('El monitoreo continúa al mantener la app abierta.');
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (page === 'monitor') { Alert.alert('Viaje activo', 'Usa “Finalizar viaje” para guardar el recorrido.'); return true; }
      if (page !== 'home') { setPage('home'); return true; }
      return false;
    });
    return () => listener.remove();
  }, [page, setPage]);
  useEffect(() => {
    if (page !== 'monitor') return;
    const timer = setInterval(() => {
      const current = session.current;
      if (!current || !foreground.current) return;
      const next = sampleRef.current();
      const found = evaluate(next, previous.current, vehicle);
      const value = riskScore(found);
      const newEvents = found.filter(event => next.time - (cooldowns.current[event.type] ?? 0) > 10000);
      newEvents.forEach(event => { cooldowns.current[event.type] = next.time; });
      current.events.push(...newEvents);
      if (current.distance === null && next.latitude !== null && next.longitude !== null) current.distance = 0;
      if (previous.current) {
        const seconds = (next.time - previous.current.time) / 1000;
        const meters = distanceBetween(previous.current, next);
        if (seconds > 0 && seconds <= 5 && meters > 3 && meters / seconds < 60) current.distance = (current.distance ?? 0) + meters;
      }
      current.readings.push(next);
      if (next.speed !== null || next.acceleration !== null || next.rotation !== null || next.tilt !== null) current.scores.push(value);
      previous.current = next;
      setReading(next); setScore(value); setReasons(found); setEvents([...current.events].reverse());
      setDistance(current.distance); setElapsed((Date.now() - current.start) / 1000);
      if (newEvents.some(event => event.type === 'Posible accidente')) { setAbout(false); setCountdown(10); }
    }, 1000);
    return () => clearInterval(timer);
  }, [page, vehicle]);
  useEffect(() => {
    if (countdown === null || countdown === 0) return;
    const timer = setTimeout(() => setCountdown(value => value === null ? null : value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);
  function start() {
    sampleRef.current(); // Discard preparation peaks before evaluating the trip.
    session.current = { start: Date.now(), readings: [], events: [], scores: [], distance: null };
    previous.current = null; cooldowns.current = {};
    setReading(emptyReading()); setScore(0); setEvents([]); setReasons([]); setDistance(null); setElapsed(0); setCountdown(null); setPage('monitor');
  }
  async function finish() {
    const current = session.current;
    if (!current || saving) return;
    setSaving(true);
    const trip: Trip = { id: `${current.start}`, vehicle, simulated: false, start: current.start, end: Date.now(), distance: current.distance, averageRisk: current.scores.length ? current.scores.reduce((a, b) => a + b, 0) / current.scores.length : null, readings: [...current.readings], events: [...current.events] };
    try { await saveTrip(trip); setTrips(old => [trip, ...old.filter(t => t.id !== trip.id)]); session.current = null; setCountdown(null); setSelected(trip); setPage('detail'); }
    catch { Alert.alert('No se pudo guardar', 'Puedes volver a intentar guardar el viaje.'); }
    finally { setSaving(false); }
  }
  const hasReadings = reading.speed !== null || reading.acceleration !== null || reading.rotation !== null;
  const color = !hasReadings ? colors.muted : score >= 70 ? colors.danger : score >= 40 ? colors.warning : colors.accent;
  const realTrips = trips.filter(trip => !trip.simulated);
  const renderEvents = (items: RiskEvent[]) => items.map((event, index) => (
    <View key={`${event.time}-${index}`} style={s.eventRow}>
      <View style={s.row}><Text style={[s.body, { flex: 1 }]}>{event.type}</Text><Text style={s.muted}>{new Date(event.time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</Text></View>
      <Text style={s.muted}>{event.reason}</Text>
    </View>
  ));
  return <SafeAreaView style={s.safe}>
    <StatusBar style="dark" />
    {page === 'monitor' && <Awake />}
    <View style={s.header}>
      <View style={s.brandRow}><View style={s.brandMark}><View style={s.lane} /><View style={s.lane} /></View><Text style={s.brand}>RoadGuard</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Acerca de RoadGuard" onPress={() => setAbout(true)} style={s.headerAction}><Text style={s.headerLink}>Acerca de</Text></Pressable>
    </View>
    <ScreenContext.Provider value={<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      {!!notice && <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
      {page === 'home' && <>
        <View style={s.pageHeading}><Text style={s.eyebrow}>Tu próximo recorrido</Text><Text style={s.hero}>Nuevo viaje</Text><Text style={s.description}>Elige tu vehículo y comienza cuando estés listo.</Text></View>
        <View style={s.stacked}><Text style={s.caption}>Vehículo</Text><View style={s.vehicleGroup}>
          {(Object.keys(vehicles) as Vehicle[]).map(key => <Pressable accessibilityRole="radio" accessibilityLabel={vehicles[key].name} accessibilityState={{ checked: vehicle === key }} aria-checked={vehicle === key} key={key} onPress={() => setVehicle(key)} style={({ pressed }) => [s.vehicle, vehicle === key && s.vehicleSelected, pressed && { opacity: 0.7 }]}>
            <Text style={s.vehicleText}>{vehicles[key].name}</Text><View style={[s.selection, vehicle === key && s.selectionActive]}>{vehicle === key && <View style={s.selectionDot} />}</View>
          </Pressable>)}
        </View></View>
        <Button title="Preparar viaje" onPress={() => { setCalibrated(false); setNotice(''); setPage('prepare'); }} />
        <Card><Text style={s.caption}>Tus recorridos</Text><View style={s.row}><Metric label="Viajes" value={`${realTrips.length}`} unit="completados" /><View style={s.metricDivider} /><Metric label="Distancia" value={(realTrips.reduce((total, trip) => total + (trip.distance ?? 0), 0) / 1000).toFixed(2)} unit="km registrados" /></View></Card>
        <Card><View style={s.row}><Text style={s.title}>RoadGuard Premium</Text><Text style={s.badge}>Próximamente</Text></View><Text style={s.description}>Descubre el plan con análisis, alertas y reportes completos.</Text><Button title="Hazte Premium" secondary onPress={() => setPage('premium')} /></Card>
        <Text style={s.footnote}>Mantén la app abierta durante el viaje.</Text>
      </>}
      {page === 'prepare' && <>
        <View style={s.pageHeading}><Text style={s.eyebrow}>{vehicles[vehicle].name}</Text><Text style={s.hero}>Antes de salir</Text><Text style={s.description}>Fija el teléfono y déjalo quieto unos segundos.</Text></View>
        <Card><View style={s.row}><Text style={s.title}>Posición del teléfono</Text>{calibrated && <Text style={s.badge}>Calibrado</Text>}</View><Text style={s.description}>Esta posición será la referencia para medir la inclinación.</Text>
          <Button title={calibrated ? 'Volver a calibrar' : 'Calibrar posición'} secondary={calibrated} onPress={() => { if (sensors.calibrate()) setCalibrated(true); else Alert.alert('Esperando sensor', 'Aún no hay lecturas del acelerómetro. Revisa los permisos de movimiento.'); }} />
        </Card>
        <View style={s.stacked}><Text style={s.title}>Sensores</Text>{['GPS', 'Acelerómetro', 'Giroscopio', 'Magnetómetro', 'Barómetro'].map(name => <ValueRow key={name} label={name} value={sensors.availability[name] ?? 'Comprobando…'} />)}{!!sensors.error && <Text style={s.notice}>{sensors.error}</Text>}</View>
        <Disclosure title="Cómo se calcula el riesgo">
          <ValueRow label={`Velocidad > ${vehicles[vehicle].speed} km/h`} value="+35 puntos" />
          <ValueRow label={`Frenada GPS > ${vehicles[vehicle].acceleration} m/s²`} value="+30 puntos" />
          <ValueRow label={`Aceleración GPS > ${vehicles[vehicle].acceleration} m/s²`} value="+25 puntos" />
          <ValueRow label="Movimiento o giro brusco" value="+20 cada uno" />
          <ValueRow label={`Inclinación > ${vehicles[vehicle].tilt}°`} value="+20 puntos" />
          <Text style={s.footnote}>La suma se limita a 100. Los umbrales son académicos y no representan límites legales ni probabilidad de accidente.</Text>
        </Disclosure>
        <Button title="Iniciar viaje" disabled={!calibrated} onPress={start} />
        <Button title="Cambiar vehículo" secondary onPress={() => setPage('home')} />
      </>}
      {page === 'monitor' && <>
        <View style={s.row}><View style={[s.row, { justifyContent: 'flex-start', gap: 8 }]}><View style={s.dot} /><Text style={s.eyebrow}>Sensores en vivo</Text></View><Text style={s.body}>{duration(elapsed)}</Text></View>
        <Card>
          <View style={s.row}><Text style={s.caption}>Nivel de riesgo</Text><Text style={[s.body, { color }]}>{hasReadings ? riskLabel(score) : 'Esperando datos'}</Text></View>
          <Text style={[s.riskNumber, { color }]}>{hasReadings ? score : '—'}<Text style={s.riskTotal}> / 100</Text></Text>
          <View accessibilityRole="progressbar" accessibilityLabel="Índice de riesgo" accessibilityValue={hasReadings ? { min: 0, max: 100, now: score } : { text: 'Esperando datos' }} style={s.riskTrack}><View style={[s.riskFill, { width: `${score}%`, backgroundColor: color }]} /></View>
          {reading.speed === null && <Text style={s.notice}>Esperando velocidad GPS. Evaluación parcial.</Text>}
        </Card>
        <View style={s.row}><Metric label="Velocidad" value={fmt(reading.speed)} unit="km/h" /><View style={s.metricDivider} /><Metric label="Distancia" value={fmt(distance === null ? null : distance / 1000, 2)} unit="km" /></View>
        <View style={s.stacked}><View style={s.row}><Text style={s.title}>Sensores en tiempo real</Text><Text style={s.muted}>Cada segundo</Text></View>
          <ValueRow label="Aceleración pico" value={`${fmt(reading.acceleration)} m/s²`} />
          <ValueRow label="Inclinación" value={`${fmt(reading.tilt, 0)}°`} />
          <ValueRow label="Dirección aproximada" value={`${fmt(reading.heading, 0)}°`} />
          <ValueRow label="Altitud GPS" value={`${fmt(reading.altitude, 0)} m`} />
          <ValueRow label="Presión" value={`${fmt(reading.pressure)} hPa`} />
          <ValueRow label="Rotación pico" value={`${fmt(reading.rotation, 2)} rad/s`} />
        </View>
        <Disclosure title="Explicación del riesgo">
          {reasons.length ? reasons.map((event, index) => <View key={index} style={s.stacked}><ValueRow label={event.type} value={`+${event.points} puntos`} /><Text style={s.muted}>{event.reason}</Text></View>) : <Text style={s.description}>No hay reglas activas en esta lectura.</Text>}
          <Text style={s.footnote}>Es un índice basado en reglas. Los sensores sin datos no se evalúan.</Text>
        </Disclosure>
        <Button title={saving ? 'Guardando…' : 'Finalizar viaje'} disabled={saving} onPress={() => void finish()} />
        <View><View style={s.row}><Text style={s.title}>Eventos</Text><Text style={s.muted}>{events.length}</Text></View>{events.length ? renderEvents(events.slice(0, 3)) : <Text style={[s.description, { marginTop: 10 }]}>Sin eventos registrados.</Text>}{events.length > 3 && <Text style={[s.muted, { marginTop: 10 }]}>El resumen incluirá todos los eventos.</Text>}</View>
        <Text style={s.footnote}>Consulta la pantalla cuando estés detenido.</Text>
      </>}
      {page === 'history' && <>
        <View style={s.pageHeading}><Text style={s.eyebrow}>Tus recorridos</Text><Text style={s.hero}>Historial</Text><Text style={s.description}>{trips.length ? `${trips.length} ${trips.length === 1 ? 'viaje guardado' : 'viajes guardados'} en este teléfono.` : 'Aquí encontrarás tus viajes completados.'}</Text></View>
        {!trips.length && <View style={s.empty}><Text style={s.emptySymbol}>↗</Text><Text style={s.title}>Tu primer viaje te espera</Text><Text style={[s.description, { textAlign: 'center' }]}>Inicia un recorrido y guarda su resumen al terminar.</Text></View>}
        {trips.map(trip => <Pressable accessibilityRole="button" accessibilityLabel={`Ver viaje en ${vehicles[trip.vehicle].name}, ${new Date(trip.start).toLocaleDateString('es-MX')}`} key={trip.id} onPress={() => { setSelected(trip); setPage('detail'); }} style={({ pressed }) => pressed && { opacity: 0.65 }}>
          <Card><View style={s.row}><Text style={s.title}>{vehicles[trip.vehicle].name}</Text></View><Text style={s.muted}>{new Date(trip.start).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text><View style={s.row}><Text style={s.body}>{fmt(trip.distance === null ? null : trip.distance / 1000, 2)} km · {duration((trip.end - trip.start) / 1000)} min</Text><Text style={s.eyebrow}>Ver detalle ›</Text></View></Card>
        </Pressable>)}
        {!trips.length && <Button title="Iniciar un viaje" onPress={() => setPage('home')} />}
      </>}
      {page === 'detail' && selected && <>
        <View style={s.pageHeading}><Text style={s.eyebrow}>Recorrido completado</Text><Text style={s.hero}>Resumen del viaje</Text><Text style={s.description}>{vehicles[selected.vehicle].name} · {new Date(selected.start).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text></View>
        <Card><View style={s.row}><Metric label="Distancia" value={fmt(selected.distance === null ? null : selected.distance / 1000, 2)} unit="km" /><View style={s.metricDivider} /><Metric label="Duración" value={duration((selected.end - selected.start) / 1000)} unit="min : seg" /></View></Card>
        <View style={s.stacked}><Text style={s.caption}>Riesgo promedio</Text><View style={s.row}><Text style={s.metricValue}>{fmt(selected.averageRisk, 0)}<Text style={s.riskTotal}> / 100</Text></Text><Text style={s.badge}>{selected.averageRisk === null ? 'Sin datos' : riskLabel(selected.averageRisk)}</Text></View></View>
        <Disclosure title="Información del recorrido"><ValueRow label="Muestras guardadas" value={`${selected.readings.length}`} /><Text style={s.footnote}>El riesgo promedio usa las muestras monitoreadas. Si faltan datos GPS, la evaluación es parcial. La duración incluye las pausas.</Text></Disclosure>
        <View><View style={s.row}><Text style={s.title}>Eventos registrados</Text><Text style={s.muted}>{selected.events.length}</Text></View>{selected.events.length ? renderEvents(selected.events) : <Text style={[s.description, { marginTop: 10 }]}>No se registraron eventos durante este viaje.</Text>}</View>
        <Button title="Ver todos mis viajes" secondary onPress={() => setPage('history')} />
      </>}
      {page === 'detail' && !selected && <><Text style={s.hero}>Detalle del viaje</Text><Text style={s.description}>Selecciona un recorrido desde tu historial.</Text><Button title="Abrir historial" onPress={() => setPage('history')} /></>}
      {page === 'premium' && <Premium />}
    </ScrollView>}><Slot /></ScreenContext.Provider>
    {page !== 'monitor' && <View style={s.nav}>{(['home', 'history', 'premium'] as const).map(destination => {
      const active = destination === 'home' ? page === 'home' || page === 'prepare' : destination === 'history' ? page === 'history' || page === 'detail' : page === 'premium';
      return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} aria-selected={active} key={destination} onPress={() => setPage(destination)} style={[s.navItem, active && s.navItemActive]}><Text style={[s.navText, active && s.navTextActive]}>{destination === 'home' ? 'Inicio' : destination === 'history' ? 'Historial' : 'Premium'}</Text></Pressable>;
    })}</View>}
    <Modal visible={countdown !== null} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={s.overlay}><View style={s.alertCard}><ScrollView contentContainerStyle={s.modalContent}>
        <Text style={[s.eyebrow, { color: colors.danger }]}>Posible accidente</Text><Text style={s.hero}>¿Estás bien?</Text><Text style={s.description}>Detectamos un cambio brusco de movimiento y velocidad.</Text>
        <Text style={[s.riskNumber, { color: colors.danger }]}>{countdown}<Text style={s.riskTotal}> s</Text></Text>
        <Text style={s.description}>{countdown === 0 ? 'Alerta local generada. No se enviaron mensajes.' : 'Confirma que estás bien antes de que termine la cuenta.'}</Text>
        <Button title="Estoy bien" onPress={() => setCountdown(null)} /><Button title={countdown === 0 ? 'Cerrar alerta' : 'Generar alerta local'} secondary onPress={() => { if (countdown === 0) setCountdown(null); else setCountdown(0); }} />
        <Text style={s.footnote}>Esta alerta solo aparece en la app. No contacta a servicios de emergencia ni a tus contactos.</Text>
      </ScrollView></View></View>
    </Modal>
    <Modal visible={about} transparent animationType="fade" onRequestClose={() => setAbout(false)}>
      <View style={s.overlay}><View style={s.alertCard}><ScrollView contentContainerStyle={s.modalContent}>
        <Text style={s.eyebrow}>RoadGuard · 1.0</Text><Text style={s.hero}>Sobre la app</Text><Text style={s.description}>Monitorea tu recorrido y consulta señales de riesgo con los sensores del teléfono.</Text>
        <ValueRow label="Almacenamiento" value="En este dispositivo" /><ValueRow label="Monitoreo" value="Con la app abierta" />
        <Text style={s.footnote}>Proyecto académico. El índice de riesgo se calcula con reglas experimentales y no equivale a una probabilidad de accidente. Las alertas son locales; no se envían mensajes ni se contactan servicios de emergencia.</Text>
        <Text style={s.footnote}>Los viajes se guardan al finalizar. Las lecturas provienen exclusivamente de los sensores del dispositivo.</Text><Button title="Entendido" onPress={() => setAbout(false)} />
      </ScrollView></View></View>
    </Modal>
  </SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><RoadGuard /></SafeAreaProvider>; }
