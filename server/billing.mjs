export function entitlement(subscription, now = Date.now()) {
  const periods = subscription.items?.data?.map(item => item.current_period_end).filter(Number.isFinite) ?? [];
  const end = periods.length ? Math.min(...periods) : subscription.current_period_end;
  const expiresAt = Number.isFinite(end) ? end * 1000 : 0;
  return {
    provider: 'stripe', testMode: true,
    subscriptionId: subscription.id,
    status: subscription.status,
    active: !subscription.livemode && subscription.status === 'active' && expiresAt > now,
    expiresAt,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  };
}

export function requireTestKey(key) {
  if (!/^sk_test_[A-Za-z0-9]+$/.test(key ?? '')) throw new Error('Configura una clave secreta de prueba válida en server/.env.');
}

export function checkoutOptions(uid, customer, baseUrl) {
  return {
    mode: 'subscription', customer, client_reference_id: uid,
    payment_method_types: ['card'], locale: 'es',
    line_items: [{ quantity: 1, price_data: { currency: 'mxn', unit_amount: 4999,
      recurring: { interval: 'month' }, product_data: { name: 'RoadGuard Premium · Prueba' } } }],
    subscription_data: { metadata: { firebaseUid: uid, product: 'roadguard-premium' } },
    success_url: `${baseUrl}/billing/return`, cancel_url: `${baseUrl}/billing/cancel`,
  };
}
