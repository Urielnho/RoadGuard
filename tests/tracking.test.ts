import test from 'node:test';
import assert from 'node:assert/strict';
import { backgroundReading, completedTrackingTrip } from '../src/trackingDomain.ts';
import { emptyReading } from '../src/domain.ts';

const session = { id: '1000', start: 1000, vehicle: 'auto' as const };
test('background readings reject poor GPS and never invent movement sensors', () => {
  const location = { timestamp: 2000, coords: { latitude: 29, longitude: -110, accuracy: 10, speed: 0, altitude: null } };
  const reading = backgroundReading(location, 1000, 3000)!;
  assert.equal(reading.speed, 0); assert.equal(reading.acceleration, null); assert.equal(reading.tilt, null);
  assert.equal(backgroundReading({ ...location, timestamp: 0 }, 1000, 3000), null);
  assert.equal(backgroundReading({ ...location, coords: { ...location.coords, accuracy: 100 } }, 1000, 3000), null);
});
test('recovery merges foreground/background once and preserves missing values', () => {
  const fg = { ...emptyReading(), time: 2000, acceleration: 1 };
  const bg = { ...emptyReading(), time: 2100, speed: 80 };
  const trip = completedTrackingTrip(session, [fg], [bg], 3000);
  assert.equal(trip.readings.length, 1); assert.equal(trip.readings[0].acceleration, 1);
  assert.equal(trip.distance, null);
  assert.equal(completedTrackingTrip(session, [], [], 3000).averageRisk, null);
});
test('GPS distance includes short background gaps, rejects long gaps', () => {
  const a = { ...emptyReading(), time: 2000, latitude: 0, longitude: 0 };
  const b = { ...a, time: 7000, longitude: 0.001 };
  assert.ok(completedTrackingTrip(session, [a], [b], 8000).distance! > 100);
  assert.equal(completedTrackingTrip(session, [a], [{ ...b, time: 90000 }], 100000).distance, 0);
});
