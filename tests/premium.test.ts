import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeTrips } from '../src/premiumDomain.ts';
import { emptyReading, type Trip } from '../src/domain.ts';
const trip = (overrides: Partial<Trip> = {}): Trip => ({ id: 'test', vehicle: 'auto', simulated: false, start: 0, end: 1000, distance: null, averageRisk: null, readings: [], events: [], ...overrides });
test('premium analytics preserves missing values and excludes simulated trips', () => {
  const result = analyzeTrips([trip(), trip({ simulated: true, distance: 5000, averageRisk: 90, readings: [{ ...emptyReading(), speed: 100 }] })]);
  assert.equal(result.count, 1);
  assert.equal(result.distance, null);
  assert.equal(result.averageRisk, null);
  assert.equal(result.maxSpeed, null);
  assert.equal(result.riskChange, null);
});
test('premium compares real risk and counts measured events without treating absent data as zero', () => {
  const result = analyzeTrips([trip({ averageRisk: 10, distance: 0, readings: [{ ...emptyReading(), speed: 0 }] }), trip(), trip({ averageRisk: 30, distance: 1000, readings: [{ ...emptyReading(), speed: 20 }], events: [{ type: 'Frenada brusca', reason: 'test', points: 30, time: 0 }] })]);
  assert.equal(result.averageRisk, 20);
  assert.equal(result.riskChange, -20);
  assert.equal(result.maxSpeed, 20);
  assert.equal(result.distance, 1000);
  assert.deepEqual(result.eventCounts, [['Frenada brusca', 1]]);
});
