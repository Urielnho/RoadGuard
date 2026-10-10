import test from 'node:test';
import assert from 'node:assert/strict';
import { tripSummary, cloudErrorMessage } from '../src/cloudDomain.ts';
import { emptyReading, type Trip } from '../src/domain.ts';

const trip: Trip = { id: '1000', vehicle: 'auto', simulated: false, start: 1000, end: 2000, distance: null, averageRisk: null, readings: [{ ...emptyReading(), latitude: 29, longitude: -110 }], events: [] };
test('cloud summaries preserve missing measurements and exclude raw location', () => {
  const summary = tripSummary(trip);
  assert.equal(summary.distance, null);
  assert.equal(summary.averageRisk, null);
  assert.equal(summary.readingCount, 1);
  assert.equal('readings' in summary, false);
  assert.equal('latitude' in summary, false);
  assert.equal('premiumDemo' in summary, false);
  assert.equal(tripSummary({ ...trip, distance: 0, averageRisk: 0 }).distance, 0);
});
test('simulated trips cannot be uploaded', () => {
  assert.throws(() => tripSummary({ ...trip, simulated: true }));
});
test('cloud failures explain the necessary action without exposing raw errors', () => {
  assert.match(cloudErrorMessage({ code: 'permission-denied' }), /reglas/);
  assert.match(cloudErrorMessage({ code: 'auth/operation-not-allowed' }), /anónimo/);
  assert.match(cloudErrorMessage(null), /conexión/);
});
