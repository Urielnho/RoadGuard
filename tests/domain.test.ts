import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceBetween, emptyReading, emptySensorTimes, evaluate, freshReading, riskLabel, riskScore } from '../src/domain.ts';
test('missing sensors never fabricate events', () => {
  assert.deepEqual(evaluate(emptyReading(), null, 'auto'), []);
});
test('vehicle thresholds differ and boundaries are explicit', () => {
  const r = { ...emptyReading(), speed: 50 };
  assert.equal(riskScore(evaluate(r, null, 'auto')), 0);
  assert.equal(riskScore(evaluate(r, null, 'bici')), 35);
  assert.equal(riskLabel(39), 'Bajo'); assert.equal(riskLabel(40), 'Moderado'); assert.equal(riskLabel(70), 'Alto');
});
test('braking needs two fresh speed samples', () => {
  const previous = { ...emptyReading(), time: 1000, speed: 25 };
  const current = { ...previous, time: 2000, speed: 0 };
  assert.ok(evaluate(current, previous, 'auto').some(e => e.type === 'Frenada brusca'));
  assert.deepEqual(evaluate({ ...current, time: 10000 }, previous, 'auto'), []);
});
test('accident requires the combined evidence, never impact alone', () => {
  const previous = { ...emptyReading(), time: 1000, speed: 25 };
  const current = { ...previous, time: 2000, speed: 0, acceleration: 22, tilt: 65, rotation: 2 };
  const events = evaluate(current, previous, 'auto');
  assert.ok(events.some(e => e.type === 'Posible accidente'));
  assert.equal(riskScore(events), 100);
  assert.ok(!evaluate({ ...current, tilt: null }, previous, 'auto').some(e => e.type === 'Posible accidente'));
  assert.ok(!evaluate(current, null, 'auto').some(e => e.type === 'Posible accidente'));
});
test('distance calculation handles absent data and known coordinates', () => {
  assert.equal(distanceBetween(emptyReading(), emptyReading()), 0);
  const a = { ...emptyReading(), latitude: 0, longitude: 0 };
  const b = { ...a, longitude: 0.001 };
  assert.ok(Math.abs(distanceBetween(a, b) - 111.195) < 0.1);
});
test('unreceived sensor data cannot become live numbers', () => {
  const latest = { ...emptyReading(), speed: 25, acceleration: 2, rotation: 1, tilt: 5, heading: 90, pressure: 1000, altitude: 100, latitude: 1, longitude: 1 };
  assert.deepEqual(freshReading(latest, emptySensorTimes(), 20000), { ...emptyReading(), time: 20000 });
});
test('expired sensors are invalidated independently while real zero is preserved', () => {
  const latest = { ...emptyReading(), acceleration: 0, rotation: 1, tilt: 5, heading: 90, pressure: 1000, speed: 25, latitude: 1, longitude: 1, altitude: 100 };
  const times = { acceleration: 19500, rotation: 16000, heading: 16000, pressure: 15000, gps: 14000 };
  const reading = freshReading(latest, times, 20000);
  assert.equal(reading.acceleration, 0); assert.equal(reading.tilt, 5);
  assert.equal(reading.pressure, 1000); assert.equal(reading.rotation, null); assert.equal(reading.heading, null);
  assert.equal(reading.speed, null); assert.equal(reading.latitude, null); assert.equal(reading.altitude, null);
  assert.equal(freshReading(latest, times, 26000).pressure, null);
});
