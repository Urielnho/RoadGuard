import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { router, Slot, usePathname } from 'expo-router';
import { Alert, AppState, BackHandler, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { distanceBetween, emptyReading, evaluate, Reading, RiskEvent, riskLabel, riskScore, Trip, Vehicle, vehicles } from './src/domain';
import { loadTrips, saveTrip } from './src/storage';
import { useSensors } from './src/useSensors';

type Page = 'home' | 'prepare' | 'monitor' | 'history' | 'detail';
const ScreenContext = createContext<React.ReactNode>(null);
export function RoadGuardScreen() { return useContext(ScreenContext); }
const fmt = (n: number | null, decimals = 1) => n === null ? '—' : n.toFixed(decimals);
const duration = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, (pressed || disabled) && { opacity: 0.5 }]}><Text style={[s.buttonText, secondary && { color: '#DCE8ED' }]}>{title}</Text></Pressable>;
}
function Card({ children }: { children: React.ReactNode }) { return <View style={s.card}>{children}</View>; }
function Metric({ label, value, unit }: { label: string; value: string; unit: string }) { return <View style={s.metric}><Text style={s.caption}>{label}</Text><Text style={s.metricValue}>{value}</Text><Text style={s.muted}>{unit}</Text></View>; }
function Awake() { useKeepAwake(); return null; }
function RoadGuard() {
  const pathname = usePathname();
  const route = pathname.slice(1);
  const page: Page = ['home', 'prepare', 'monitor', 'history', 'detail'].includes(route) ? route as Page : 'home';
  const setPage = useCallback((next: Page) => router.replace(`/${next}`), []);
  const [vehicle, setVehicle] = useState<Vehicle>('auto');
  const [simulated, setSimulated] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selected, setSelected] = useState<Trip | null>(null);
  const [reading, setReading] = useState<Reading>(emptyReading());
  const [score, setScore] = useState(0);
  const [reasons, setReasons] = useState<RiskEvent[]>([]);
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const session = useRef<{ start: number; readings: Reading[]; events: RiskEvent[]; scores: number[]; distance: number } | null>(null);
  const previous = useRef<Reading | null>(null);
  const cooldowns = useRef<Record<string, number>>({});
  const scenario = useRef<'normal' | 'brake' | 'accident'>('normal');
  const foreground = useRef(true);
  const sensors = useSensors((page === 'prepare' || page === 'monitor') && !simulated);
  const sampleRef = useRef(sensors.sample);
  useEffect(() => { sampleRef.current = sensors.sample; }, [sensors.sample]);
  useEffect(() => { loadTrips().then(setTrips).catch(() => setNotice('No se pudo abrir el historial local.')); }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      foreground.current = state === 'active';
      if (state !== 'active') previous.current = null;
      if (session.current) setNotice('Monitoreo solo con la app abierta. Se omiten las muestras en segundo plano.');
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
      let next = sampleRef.current();
      if (simulated) {
        const step = scenario.current;
        next = { ...emptyReading(), speed: step === 'normal' ? 25 : 0, acceleration: step === 'accident' ? 22 : 0.2, rotation: step === 'accident' ? 2 : 0.1, tilt: step === 'accident' ? 65 : 2, heading: 90, altitude: 100, pressure: 1000 };
        scenario.current = 'normal';
      }
      const found = evaluate(next, previous.current, vehicle);
      const value = riskScore(found);
      const newEvents = found.filter(event => next.time - (cooldowns.current[event.type] ?? 0) > 10000);
      newEvents.forEach(event => { cooldowns.current[event.type] = next.time; });
      current.events.push(...newEvents);
      if (previous.current && !simulated) {
        const seconds = (next.time - previous.current.time) / 1000;
        const meters = distanceBetween(previous.current, next);
        if (seconds > 0 && seconds <= 5 && meters > 3 && meters / seconds < 60) current.distance += meters;
      }
      current.readings.push(next); current.scores.push(value); previous.current = next;
      setReading(next); setScore(value); setReasons(found); setEvents([...current.events].reverse());
      setDistance(current.distance); setElapsed((Date.now() - current.start) / 1000);
      if (newEvents.some(event => event.type === 'Posible accidente')) setCountdown(10);
    }, 1000);
    return () => clearInterval(timer);
  }, [page, simulated, vehicle]);
  useEffect(() => {
    if (countdown === null || countdown === 0) return;
    const timer = setTimeout(() => setCountdown(value => value === null ? null : value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);
  function start() {
    sampleRef.current(); // Discard preparation peaks before evaluating the trip.
    session.current = { start: Date.now(), readings: [], events: [], scores: [], distance: 0 };
    previous.current = null; cooldowns.current = {}; scenario.current = 'normal';
    setReading(emptyReading()); setScore(0); setEvents([]); setReasons([]); setDistance(0); setElapsed(0); setCountdown(null); setPage('monitor');
  }
  async function finish() {
    const current = session.current;
    if (!current || saving) return;
    setSaving(true);
    const trip: Trip = { id: `${current.start}`, vehicle, simulated, start: current.start, end: Date.now(), distance: current.distance, averageRisk: current.scores.length ? current.scores.reduce((a, b) => a + b, 0) / current.scores.length : 0, readings: [...current.readings], events: [...current.events] };
    try { await saveTrip(trip); setTrips(old => [trip, ...old.filter(t => t.id !== trip.id)]); session.current = null; setCountdown(null); setSelected(trip); setPage('detail'); }
    catch { Alert.alert('No se pudo guardar', 'Puedes volver a intentar guardar el viaje.'); }
    finally { setSaving(false); }
  }
  const color = score >= 70 ? '#FF727C' : score >= 40 ? '#FFD166' : '#54E0B0';
  return <SafeAreaView style={s.safe}>
    <StatusBar style="light" />{page === 'monitor' && <Awake />}
    <View style={s.header}><View><Text style={s.brand}>◈ RoadGuard</Text><Text style={s.muted}>TU VIAJE, CON MÁS INFORMACIÓN</Text></View><Text style={s.badge}>BETA</Text></View>
    <ScreenContext.Provider value={<ScrollView contentContainerStyle={s.content}>
      {!!notice && <Text style={s.notice}>{notice}</Text>}
      {page === 'home' && <>
        <Text style={s.eyebrow}>SEGURIDAD EN MOVIMIENTO</Text><Text style={s.hero}>Cada viaje{'\n'}cuenta.</Text><Text style={s.description}>Conoce tu recorrido y las señales de riesgo usando los sensores de tu teléfono.</Text>
        <Card><Text style={s.title}>¿Cómo vas a viajar?</Text><View style={s.row}>{(Object.keys(vehicles) as Vehicle[]).map(key => <Pressable accessibilityRole="button" accessibilityState={{ selected: vehicle === key }} key={key} onPress={() => setVehicle(key)} style={[s.vehicle, vehicle === key && s.vehicleSelected]}><Text style={{ fontSize: 26 }}>{vehicles[key].icon}</Text><Text style={s.vehicleText}>{vehicles[key].name}</Text></Pressable>)}</View></Card>
        <Card><View style={s.row}><View style={{ flex: 1 }}><Text style={s.title}>Modo de demostración</Text><Text style={s.muted}>Datos simulados y escenarios controlados</Text></View><Switch value={simulated} onValueChange={setSimulated} trackColor={{ true: '#54E0B0', false: '#334A59' }} /></View>{simulated && <Text style={s.notice}>SIMULACIÓN · Sin sensores reales.</Text>}</Card>
        <Button title="Preparar mi viaje →" onPress={() => { setCalibrated(false); setNotice(''); setPage('prepare'); }} />
        <View style={s.row}><Metric label="VIAJES REALES" value={`${trips.filter(t => !t.simulated).length}`} unit="guardados en este teléfono" /><Metric label="DISTANCIA REAL" value={(trips.filter(t => !t.simulated).reduce((a, t) => a + t.distance, 0) / 1000).toFixed(2)} unit="kilómetros" /></View>
        <Button title="Ver historial de viajes" secondary onPress={() => setPage('history')} /><Text style={s.footnote}>Prototipo académico. Las reglas identifican señales de riesgo; no predicen accidentes con certeza. Monitoreo con la app abierta.</Text>
      </>}
      {page === 'prepare' && <>
        <Text style={s.eyebrow}>ANTES DE SALIR</Text><Text style={s.hero}>Todo listo.</Text><Text style={s.description}>{vehicles[vehicle].icon} {vehicles[vehicle].name} · {simulated ? 'SIMULACIÓN' : 'Sensores reales'}</Text>
        <Card><Text style={s.title}>1. Coloca el teléfono</Text><Text style={s.description}>Fíjalo en una posición estable. Déjalo quieto unos segundos y calibra antes de iniciar.</Text><Button title={calibrated ? '✓ Calibrado · recalibrar' : 'Calibrar posición'} onPress={() => { if (simulated || sensors.calibrate()) setCalibrated(true); else Alert.alert('Esperando sensor', 'Aún no hay lecturas del acelerómetro. Revisa los permisos de movimiento.'); }} /></Card>
        <Card><Text style={s.title}>2. Comprueba los sensores</Text>{simulated ? <Text style={s.notice}>Todos los datos serán simulados.</Text> : ['GPS', 'Acelerómetro', 'Giroscopio', 'Magnetómetro', 'Barómetro'].map(name => <View key={name} style={s.row}><Text style={s.body}>{name}</Text><Text style={s.muted}>{sensors.availability[name] ?? 'Comprobando…'}</Text></View>)}{!!sensors.error && <Text style={s.notice}>{sensors.error}</Text>}</Card>
        <Card><Text style={s.title}>Reglas para {vehicles[vehicle].name.toLowerCase()}</Text><Text style={s.description}>Velocidad &gt; {vehicles[vehicle].speed} km/h: +35{'\n'}Frenada GPS &gt; {vehicles[vehicle].acceleration} m/s²: +30{'\n'}Movimiento brusco: +20 · Giro: +20{'\n'}Inclinación &gt; {vehicles[vehicle].tilt}°: +20</Text><Text style={s.footnote}>Umbrales académicos, no límites legales. Puntuación limitada a 100. Dirección magnética aproximada con el teléfono fijo; altitud del GPS y presión del barómetro.</Text></Card>
        <Button title="Iniciar viaje" disabled={!calibrated} onPress={start} /><Button title="Volver" secondary onPress={() => setPage('home')} />
      </>}
      {page === 'monitor' && <>
        <View style={s.row}><Text style={s.eyebrow}>{simulated ? '● SIMULACIÓN' : '● VIAJE EN CURSO'}</Text><Text style={s.body}>{duration(elapsed)}</Text></View>
        <View style={s.riskCard}><Text style={s.caption}>ÍNDICE DE RIESGO</Text><Text style={[s.riskNumber, { color }]}>{score}<Text style={{ fontSize: 20, color: '#8DA8B6' }}> /100</Text></Text><Text style={[s.title, { color }]}>{riskLabel(score)}</Text><Text style={s.muted}>Puntuación de reglas · no probabilidad</Text>{reading.speed === null && <Text style={s.notice}>Sin velocidad GPS válida: evaluación incompleta.</Text>}</View>
        <View style={s.row}><Metric label="VELOCIDAD" value={fmt(reading.speed)} unit="km/h" /><Metric label="DISTANCIA" value={(distance / 1000).toFixed(2)} unit={simulated ? 'km · no simulada' : 'km'} /></View>
        <View style={s.row}><Metric label="ACELERACIÓN PICO" value={fmt(reading.acceleration)} unit="m/s² · sin gravedad" /><Metric label="INCLINACIÓN" value={fmt(reading.tilt, 0)} unit="° desde calibración" /></View>
        <View style={s.row}><Metric label="DIRECCIÓN APROX." value={fmt(reading.heading, 0)} unit="° magnéticos" /><Metric label="ALTITUD GPS" value={fmt(reading.altitude, 0)} unit="m" /></View>
        <Text style={s.muted}>Presión: {fmt(reading.pressure)} hPa · Rotación pico: {fmt(reading.rotation, 2)} rad/s</Text>
        <Card><Text style={s.title}>¿Por qué este riesgo?</Text>{reasons.length ? reasons.map((event, i) => <Text key={i} style={s.description}>+{event.points} · {event.type}{'\n'}{event.reason}</Text>) : <Text style={s.description}>Ninguna regla se activó en la última lectura. Los datos ausentes no se evalúan.</Text>}</Card>
        {simulated && <Card><Text style={s.title}>Escenarios de demostración</Text><Text style={s.muted}>Espera a ver 25 km/h antes de activar un escenario.</Text><Button title="Simular frenada" secondary onPress={() => { scenario.current = 'brake'; }} /><Button title="Simular posible accidente" secondary onPress={() => { scenario.current = 'accident'; }} /></Card>}
        <Button title={saving ? 'Guardando…' : 'Finalizar y guardar viaje'} disabled={saving} onPress={() => void finish()} /><Text style={s.footnote}>Mantén la aplicación abierta. No manipules el teléfono durante la conducción.</Text>
        <Text style={s.title}>Eventos · {events.length}</Text>{events.slice(0, 10).map((event, i) => <Card key={`${event.time}-${i}`}><Text style={s.body}>{event.type}</Text><Text style={s.muted}>{event.reason}</Text></Card>)}
      </>}
      {page === 'history' && <>
        <Text style={s.eyebrow}>TUS RECORRIDOS</Text><Text style={s.hero}>Historial.</Text><Text style={s.description}>Guardado localmente en este dispositivo.</Text>
        {!trips.length && <Card><Text style={s.title}>Tu primer viaje te espera</Text><Text style={s.description}>Al finalizar un viaje aparecerá aquí su resumen y sus eventos.</Text></Card>}
        {trips.map(trip => <Pressable accessibilityRole="button" key={trip.id} onPress={() => { setSelected(trip); setPage('detail'); }}><Card><View style={s.row}><Text style={s.title}>{vehicles[trip.vehicle].icon} {vehicles[trip.vehicle].name}</Text><Text style={s.badge}>{trip.simulated ? 'SIMULACIÓN' : 'REAL'}</Text></View><Text style={s.description}>{new Date(trip.start).toLocaleString('es-MX')}</Text><Text style={s.body}>{(trip.distance / 1000).toFixed(2)} km · Riesgo {trip.averageRisk.toFixed(0)} · {trip.events.length} eventos →</Text></Card></Pressable>)}
        <Button title="Volver al inicio" secondary onPress={() => setPage('home')} />
      </>}
      {page === 'detail' && selected && <>
        <Text style={s.eyebrow}>{selected.simulated ? 'RESUMEN · SIMULACIÓN' : 'RESUMEN DEL VIAJE'}</Text><Text style={s.hero}>Viaje guardado.</Text><Text style={s.description}>{vehicles[selected.vehicle].name} · {new Date(selected.start).toLocaleString('es-MX')}</Text>
        <View style={s.row}><Metric label="DISTANCIA" value={(selected.distance / 1000).toFixed(2)} unit="km" /><Metric label="DURACIÓN" value={duration((selected.end - selected.start) / 1000)} unit="min : seg" /></View>
        <Card><Text style={s.title}>Riesgo promedio: {selected.averageRisk.toFixed(0)} /100</Text><Text style={s.description}>{riskLabel(selected.averageRisk)} · {selected.readings.length} muestras guardadas</Text><Text style={s.footnote}>Promedio por segundo monitoreado. Las muestras sin GPS pueden tener evaluación parcial.</Text></Card>
        <Text style={s.title}>Eventos detectados</Text>{!selected.events.length && <Text style={s.description}>No se detectaron eventos con las reglas actuales.</Text>}{selected.events.map((event, i) => <Card key={i}><Text style={s.title}>{event.type}</Text><Text style={s.description}>{event.reason}</Text><Text style={s.muted}>{new Date(event.time).toLocaleTimeString('es-MX')} · +{event.points} puntos</Text></Card>)}
        <Button title="Ver historial" onPress={() => setPage('history')} /><Button title="Volver al inicio" secondary onPress={() => setPage('home')} />
      </>}
    </ScrollView>}><Slot /></ScreenContext.Provider>
    <Modal visible={countdown !== null} transparent animationType="fade" onRequestClose={() => {}}><View style={s.overlay}><View style={s.alertCard}><Text style={s.eyebrow}>POSIBLE ACCIDENTE{simulated ? ' · SIMULACIÓN' : ''}</Text><Text style={s.hero}>¿Estás bien?</Text><Text style={s.description}>Se activó la combinación experimental de impacto, inclinación y caída de velocidad.</Text><Text style={[s.riskNumber, { color: '#FF727C' }]}>{countdown}</Text><Text style={s.description}>{countdown === 0 ? 'Alerta local generada. Esta versión no envía mensajes a contactos ni a servicios de emergencia.' : 'Al terminar la cuenta se generará una alerta local de demostración.'}</Text><Button title="Estoy bien" onPress={() => setCountdown(null)} /><Button title={countdown === 0 ? 'Cerrar alerta local' : 'Generar alerta local'} secondary onPress={() => { if (countdown === 0) setCountdown(null); else setCountdown(0); }} /></View></View></Modal>
  </SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><RoadGuard /></SafeAreaProvider>; }
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#091820' }, header: { padding: 22, borderBottomWidth: 1, borderBottomColor: '#203540', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#F2F8FA', fontSize: 25, fontWeight: '800', marginBottom: 5 }, badge: { color: '#54E0B0', fontSize: 10, fontWeight: '800', backgroundColor: '#173F37', padding: 8, borderRadius: 12 },
  content: { padding: 22, gap: 16, paddingBottom: 45 }, eyebrow: { color: '#54E0B0', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, hero: { color: '#F2F8FA', fontSize: 42, fontWeight: '800', letterSpacing: -1.5 }, description: { color: '#B8CCD6', fontSize: 15, lineHeight: 24 },
  card: { backgroundColor: '#122731', borderWidth: 1, borderColor: '#233D48', borderRadius: 20, padding: 18, gap: 12 }, title: { color: '#F2F8FA', fontSize: 17, fontWeight: '700' }, body: { color: '#DCE8ED', fontSize: 14 }, muted: { color: '#8DA8B6', fontSize: 11, lineHeight: 18 }, caption: { color: '#8DA8B6', fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  button: { backgroundColor: '#54E0B0', padding: 17, borderRadius: 14, alignItems: 'center', minHeight: 52 }, secondary: { backgroundColor: '#1D3541', borderWidth: 1, borderColor: '#334D5A' }, buttonText: { color: '#08271E', fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, vehicle: { flex: 1, paddingVertical: 15, alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#2B424E', borderRadius: 14 }, vehicleSelected: { backgroundColor: '#173F37', borderColor: '#54E0B0' }, vehicleText: { color: '#DCE8ED', fontSize: 10, fontWeight: '700' },
  metric: { flex: 1, backgroundColor: '#122731', padding: 16, borderRadius: 16, gap: 6 }, metricValue: { color: '#F2F8FA', fontSize: 29, fontWeight: '700' }, riskCard: { backgroundColor: '#122731', borderRadius: 24, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#285246' }, riskNumber: { fontSize: 76, fontWeight: '800' },
  footnote: { color: '#8DA8B6', fontSize: 12, lineHeight: 19 }, notice: { color: '#FFD166', fontSize: 12, lineHeight: 20 }, overlay: { flex: 1, backgroundColor: '#000C', padding: 24, justifyContent: 'center' }, alertCard: { backgroundColor: '#122731', borderRadius: 24, padding: 24, gap: 14 },
});
