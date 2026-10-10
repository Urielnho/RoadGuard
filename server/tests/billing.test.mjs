import test from 'node:test';
import assert from 'node:assert/strict';
import { entitlement, checkoutOptions, requireTestKey } from '../billing.mjs';
test('only unexpired, active TEST subscriptions grant access', () => {
  const sub = { id: 'sub_x', livemode: false, status: 'active', items: { data: [{ current_period_end: 200 }] }, cancel_at_period_end: true };
  assert.equal(entitlement(sub, 100000).active, true);
  for (const status of ['past_due', 'unpaid', 'canceled', 'incomplete', 'trialing']) assert.equal(entitlement({ ...sub, status }, 100000).active, false);
  assert.equal(entitlement(sub, 300000).active, false);
  assert.equal(entitlement({ ...sub, livemode: true }, 100000).active, false);
});
test('checkout pins amount and recurring plan on the server', () => {
  const c = checkoutOptions('uid', 'cus_x', 'https://example.com');
  assert.equal(c.mode, 'subscription');
  assert.equal(c.line_items[0].price_data.unit_amount, 4999);
  assert.equal(c.line_items[0].price_data.recurring.interval, 'month');
  assert.equal(c.subscription_data.metadata.firebaseUid, 'uid');
});
test('live and malformed keys are refused', () => {
  assert.throws(() => requireTestKey('sk_live_abc'));
  assert.throws(() => requireTestKey('sk_test_abc.'));
  assert.doesNotThrow(() => requireTestKey('sk_test_abc'));
});
