const idOf = value => typeof value === 'string' ? value : value?.id;
const fail = message => Object.assign(new Error(message), { status: 409 });
export function verifySetup(setup, uid, customerId, subscriptionId, latestId) {
  if (setup.livemode || setup.id !== latestId || setup.status !== 'succeeded' || idOf(setup.customer) !== customerId || setup.metadata?.firebaseUid !== uid || setup.metadata?.subscriptionId !== subscriptionId || !idOf(setup.payment_method)) throw fail('No se pudo confirmar el cambio de tarjeta.');
}
export function createBillingManager(stripe, db) {
  async function owned(uid) {
    const ref = db.doc('stripeCustomers/' + uid); const saved = (await ref.get()).data();
    if (!saved?.customerId) throw fail('Todavía no tienes una suscripción.');
    const list = await stripe.subscriptions.list({ customer: saved.customerId, status: 'all', limit: 100, expand: ['data.default_payment_method'] });
    const owned = list.data.filter(s => !s.livemode && s.metadata.firebaseUid === uid && s.metadata.product === 'roadguard-premium');
    const sub = owned.find(s => ['active','trialing','past_due','unpaid','incomplete'].includes(s.status)) || owned[0];
    if (!sub) throw fail('Todavía no tienes una suscripción.');
    return { ref, saved, sub };
  }
  async function summary(uid) {
    const { sub, saved } = await owned(uid);
    let method = sub.default_payment_method;
    if (!method) { const customer = await stripe.customers.retrieve(saved.customerId, { expand: ['invoice_settings.default_payment_method'] }); method = customer.invoice_settings?.default_payment_method; }
    const card = typeof method === 'object' ? method?.card : null;
    const end = sub.items.data[0]?.current_period_end || sub.current_period_end;
    return { status: sub.status, cancelAtPeriodEnd: sub.cancel_at_period_end, periodEnd: end ? end * 1000 : null, amount: sub.items.data[0]?.price.unit_amount, currency: sub.currency, card: card ? { brand: card.brand, last4: card.last4, expMonth: card.exp_month, expYear: card.exp_year } : null, canManage: ['active','trialing','past_due'].includes(sub.status) };
  }
  async function cancel(uid, cancelAtPeriodEnd) {
    if (typeof cancelAtPeriodEnd !== 'boolean') throw fail('Acción inválida.');
    const { sub } = await owned(uid);
    if (!['active','trialing','past_due'].includes(sub.status)) throw fail('Esta suscripción no puede modificarse.');
    await stripe.subscriptions.update(sub.id, { cancel_at_period_end: cancelAtPeriodEnd });
    return summary(uid);
  }
  async function setup(uid) {
    const { ref, saved, sub } = await owned(uid);
    if (!['active','trialing','past_due'].includes(sub.status)) throw fail('Primero activa tu suscripción.');
    const intent = await stripe.setupIntents.create({ customer: saved.customerId, payment_method_types: ['card'], usage: 'off_session', metadata: { firebaseUid: uid, subscriptionId: sub.id } });
    await ref.set({ latestCardSetupId: intent.id }, { merge: true });
    return { clientSecret: intent.client_secret, setupId: intent.id };
  }
  async function confirm(uid, setupId) {
    if (typeof setupId !== 'string' || !/^seti_[a-zA-Z0-9]+$/.test(setupId)) throw fail('Cambio de tarjeta inválido.');
    const { saved, sub } = await owned(uid);
    const setup = await stripe.setupIntents.retrieve(setupId);
    verifySetup(setup, uid, saved.customerId, sub.id, saved.latestCardSetupId);
    const method = await stripe.paymentMethods.retrieve(idOf(setup.payment_method));
    if (idOf(method.customer) !== saved.customerId || method.type !== 'card') throw fail('La tarjeta no corresponde a tu cuenta.');
    await stripe.subscriptions.update(sub.id, { default_payment_method: method.id });
    return summary(uid);
  }
  return { summary, cancel, setup, confirm };
}
