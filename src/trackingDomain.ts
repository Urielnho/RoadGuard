import { distanceBetween, emptyReading, evaluate, riskScore, type Reading, type Trip, type Vehicle } from './domain.ts';
export type TrackingSession = { id: string; start: number; vehicle: Vehicle };
type LocationSample = { timestamp: number; coords: { latitude: number; longitude: number; accuracy: number | null; speed: number | null; altitude: number | null } };

export function backgroundReading(location: LocationSample, start: number, now: number): Reading | null {
  const c = location.coords;
  if (!Number.isFinite(location.timestamp) || location.timestamp < start || location.timestamp > now + 1000) return null;
  if (c.accuracy === null || !Number.isFinite(c.accuracy) || c.accuracy < 0 || c.accuracy > 35) return null;
  if (!Number.isFinite(c.latitude) || Math.abs(c.latitude) > 90 || !Number.isFinite(c.longitude) || Math.abs(c.longitude) > 180) return null;
  return { ...emptyReading(), time: location.timestamp, latitude: c.latitude, longitude: c.longitude,
    speed: c.speed !== null && Number.isFinite(c.speed) && c.speed >= 0 ? c.speed * 3.6 : null,
    altitude: c.altitude !== null && Number.isFinite(c.altitude) ? c.altitude : null };
}

export function completedTrackingTrip(session: TrackingSession, foreground: Reading[], background: Reading[], end: number): Trip {
  const bySecond = new Map<number, Reading>();
  // Foreground measurements take precedence if callbacks overlap during transitions.
  for (const reading of [...background, ...foreground]) {
    if (reading.time >= session.start && reading.time <= end) bySecond.set(Math.floor(reading.time / 1000), reading);
  }
  const readings = [...bySecond.values()].sort((a, b) => a.time - b.time);
  const events: Trip['events'] = [];
  const cooldowns: Record<string, number> = {};
  const scores: number[] = [];
  let distance: number | null = null;
  let previous: Reading | null = null;
  for (const reading of readings) {
    if (reading.latitude !== null && reading.longitude !== null) distance ??= 0;
    if (previous) {
      const seconds = (reading.time - previous.time) / 1000;
      const meters = distanceBetween(previous, reading);
      if (seconds > 0 && seconds <= 30 && meters > 3 && meters / seconds < 60) distance = (distance ?? 0) + meters;
    }
    const found = evaluate(reading, previous, session.vehicle);
    if ([reading.speed, reading.acceleration, reading.rotation, reading.tilt].some(value => value !== null)) scores.push(riskScore(found));
    for (const event of found) {
      if (event.time - (cooldowns[event.type] ?? -Infinity) > 10000) { events.push(event); cooldowns[event.type] = event.time; }
    }
    previous = reading;
  }
  return { ...session, simulated: false, end, distance, readings, events, averageRisk: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null };
}
