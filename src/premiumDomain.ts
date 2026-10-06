import type { Trip, Vehicle } from './domain';
export type Accent = 'green' | 'blue' | 'violet';
export type Preferences = { premiumDemo: boolean; activatedAt: number | null; displayName: string; avatarUri: string | null; accent: Accent; vehicleNames: Record<Vehicle, string> };
export const defaultPreferences = (): Preferences => ({ premiumDemo: false, activatedAt: null, displayName: '', avatarUri: null, accent: 'green', vehicleNames: { auto: '', moto: '', bici: '' } });
export const accents: Record<Accent, { name: string; color: string; soft: string }> = {
  green: { name: 'Bosque', color: '#16735A', soft: '#EAF4F0' },
  blue: { name: 'Océano', color: '#2563A8', soft: '#EDF3FB' },
  violet: { name: 'Lavanda', color: '#7550A4', soft: '#F3EEFA' },
};
export function analyzeTrips(trips: Trip[]) {
  const real = trips.filter(trip => trip.simulated === false);
  const riskTrips = real.filter(trip => trip.averageRisk !== null);
  const speeds = real.flatMap(trip => trip.readings.map(reading => reading.speed).filter((speed): speed is number => speed !== null && Number.isFinite(speed)));
  const counts: Record<string, number> = {};
  real.forEach(trip => trip.events.forEach(event => { counts[event.type] = (counts[event.type] ?? 0) + 1; }));
  const eventCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    count: real.length,
    distance: real.some(trip => trip.distance !== null) ? real.reduce((total, trip) => total + (trip.distance ?? 0), 0) : null,
    averageRisk: riskTrips.length ? riskTrips.reduce((sum, trip) => sum + trip.averageRisk!, 0) / riskTrips.length : null,
    maxSpeed: speeds.length ? speeds.reduce((max, speed) => Math.max(max, speed), 0) : null,
    duration: real.reduce((sum, trip) => sum + (trip.end - trip.start) / 1000, 0),
    eventCounts, events: eventCounts.reduce((sum, [, count]) => sum + count, 0),
    riskChange: riskTrips.length >= 2 ? riskTrips[0].averageRisk! - riskTrips[1].averageRisk! : null,
  };
}
export function tripAdvice(type: string | undefined) {
  if (type === 'Frenada brusca') return 'Anticipa las detenciones y mantén una distancia suficiente con el vehículo de adelante.';
  if (type === 'Velocidad elevada') return 'Revisa tu velocidad y adapta el recorrido a las condiciones de la vía.';
  if (type === 'Giro brusco del teléfono' || type === 'Inclinación elevada') return 'Comprueba que el teléfono esté bien fijado y calibra su posición antes de salir.';
  if (type === 'Aceleración brusca' || type === 'Movimiento brusco') return 'Procura movimientos graduales y revisa que el soporte del teléfono no vibre.';
  return 'Mantén el teléfono fijo durante el viaje y consulta las lecturas cuando estés detenido.';
}
