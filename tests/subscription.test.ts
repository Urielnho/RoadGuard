import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPremium } from '../src/subscriptionDomain.ts';
test('Premium needs a verified provider, test mode, active status and unexpired period', () => {
  const value = { provider: 'stripe', testMode: true, active: true, status: 'active', expiresAt: 2000 };
  assert.equal(hasPremium(value, 1000), true);
  assert.equal(hasPremium(value, 3000), false);
  assert.equal(hasPremium({ ...value, status: 'past_due' }, 1000), false);
  assert.equal(hasPremium({ ...value, provider: 'demo' }, 1000), false);
  assert.equal(hasPremium(null, 1000), false);
});
