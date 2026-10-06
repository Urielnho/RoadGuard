export type Vehicle = 'auto' | 'moto' | 'bici';
export type Reading = { time: number; speed: number | null; acceleration: number | null; rotation: number | null; tilt: number | null; heading: number | null; altitude: number | null; pressure: number | null; latitude: number | null; longitude: number | null };
export type RiskEvent = { time: number; type: string; points: number; reason: string };
export type Trip = { id: string; vehicle: Vehicle; simulated: boolean; start: number; end: number; distance: number | null; averageRisk: number | null; readings: Reading[]; events: RiskEvent[] };
export const vehicles: Record<Vehicle, { name: string; icon: string; speed: number; acceleration: number; rotation: number; tilt: number }> = {
  auto: { name: 'Automóvil', icon: '🚗', speed: 80, acceleration: 3.5, rotation: 1.2, tilt: 35 },
  moto: { name: 'Motocicleta', icon: '🏍️', speed: 70, acceleration: 4, rotation: 1.5, tilt: 50 },
  bici: { name: 'Bicicleta', icon: '🚲', speed: 30, acceleration: 2.5, rotation: 1.8, tilt: 40 },
};
export const emptyReading = (): Reading => ({ time: Date.now(), speed: null, acceleration: null, rotation: null, tilt: null, heading: null, altitude: null, pressure: null, latitude: null, longitude: null });
export type SensorTimes = { acceleration: number; rotation: number; heading: number; pressure: number; gps: number };
export const emptySensorTimes = (): SensorTimes => ({ acceleration: 0, rotation: 0, heading: 0, pressure: 0, gps: 0 });
export function freshReading(latest: Reading, times: SensorTimes, now: number): Reading {
  const reading = { ...latest, time: now };
  const stale = (timestamp: number, limit: number) => timestamp <= 0 || now - timestamp > limit || timestamp > now;
  if (stale(times.acceleration, 3000)) { reading.acceleration = null; reading.tilt = null; }
  if (stale(times.rotation, 3000)) reading.rotation = null;
  if (stale(times.heading, 3000)) reading.heading = null;
  if (stale(times.pressure, 10000)) reading.pressure = null;
  if (stale(times.gps, 5000)) { reading.speed = null; reading.latitude = null; reading.longitude = null; reading.altitude = null; }
  return reading;
}
export function evaluate(reading: Reading, previous: Reading | null, vehicle: Vehicle): RiskEvent[] {
  const limits = vehicles[vehicle];
  const events: RiskEvent[] = [];
  const add = (type: string, points: number, reason: string) => events.push({ time: reading.time, type, points, reason });
  if (reading.speed !== null && reading.speed > limits.speed) add('Velocidad elevada', 35, `${reading.speed.toFixed(1)} km/h > umbral académico ${limits.speed} km/h`);
  const dt = previous ? (reading.time - previous.time) / 1000 : 0;
  if (previous && dt >= 0.5 && dt <= 5 && reading.speed !== null && previous.speed !== null) {
    const a = (reading.speed - previous.speed) / 3.6 / dt;
    if (a < -limits.acceleration) add('Frenada brusca', 30, `Cambio GPS ${a.toFixed(1)} m/s²`);
    if (a > limits.acceleration) add('Aceleración brusca', 25, `Cambio GPS +${a.toFixed(1)} m/s²`);
  }
  if (reading.acceleration !== null && reading.acceleration > limits.acceleration) add('Movimiento brusco', 20, `Aceleración sin gravedad ${reading.acceleration.toFixed(1)} m/s²`);
  if (reading.rotation !== null && reading.rotation > limits.rotation) add('Giro brusco del teléfono', 20, `Rotación ${reading.rotation.toFixed(2)} rad/s`);
  if (reading.tilt !== null && reading.tilt > limits.tilt) add('Inclinación elevada', 20, `${reading.tilt.toFixed(0)}° respecto a la calibración`);
  if (reading.acceleration !== null && reading.acceleration > 18 && reading.tilt !== null && reading.tilt > limits.tilt && reading.speed !== null && reading.speed < 5 && previous?.speed !== null && previous?.speed !== undefined && previous.speed > 15 && dt > 0 && dt <= 5) {
    add('Posible accidente', 80, 'Impacto >18 m/s² + inclinación + caída de velocidad de >15 a <5 km/h. Heurística experimental.');
  }
  return events;
}
export const riskScore = (events: RiskEvent[]) => Math.min(100, events.reduce((sum, event) => sum + event.points, 0));
export const riskLabel = (score: number) => score >= 70 ? 'Alto' : score >= 40 ? 'Moderado' : 'Bajo';
export function distanceBetween(a: Reading, b: Reading) {
  if (a.latitude === null || a.longitude === null || b.latitude === null || b.longitude === null) return 0;
  const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude), dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
