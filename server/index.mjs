import http from 'node:http';
import { Buffer } from 'node:buffer';
import { randomUUID, createHash } from 'node:crypto';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { validDevice, sendAndroidNotification } from './push.mjs';
import Stripe from 'stripe';
import { createBillingManager } from './manage-billing.mjs';
import { checkoutOptions, entitlement, requireTestKey } from './billing.mjs';

requireTestKey(process.env.STRIPE_SECRET_KEY);
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('Falta FIREBASE_PROJECT_ID.');
const baseUrl = (process.env.PUBLIC_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const base = new URL(baseUrl);
if (base.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(base.hostname)) throw new Error('PUBLIC_BASE_URL requiere HTTPS.');
initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 20000 });
const management = createBillingManager(stripe, db);
const origins = new Set((process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean));
const idOf = value => typeof value === 'string' ? value : value?.id;
const httpError = (status, message) => Object.assign(new Error(message), { status });

async function body(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 256000) throw httpError(413, 'Solicitud demasiado grande.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function user(req) {
  const match = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!match) throw httpError(401, 'Inicia sesión para continuar.');
  try { return (await getAuth().verifyIdToken(match[1], true)).uid; }
  catch { throw httpError(401, 'Sesión inválida. Abre la app e intenta de nuevo.'); }
}

async function throttle(uid, action, seconds) {
  const ref = db.doc(`serverRateLimits/${uid}_${action}`);
  await db.runTransaction(async tx => {
    const prior = await tx.get(ref);
    if ((prior.data()?.until || 0) > Date.now()) throw httpError(429, 'Espera unos segundos antes de reintentar.');
    tx.set(ref, { until: Date.now() + seconds * 1000 });
  });
}

async function checkout(uid, native = false) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw httpError(503, 'Los pagos todavía no están configurados. Intenta más tarde.');
  const ref = db.doc(`stripeCustomers/${uid}`);
  const leaseId = randomUUID();
  const saved = await db.runTransaction(async tx => {
    const snap = await tx.get(ref); const data = snap.data() || {};
    if ((data.leaseUntil || 0) > Date.now()) throw httpError(409, 'Ya se está preparando tu pago. Espera y reintenta.');
    tx.set(ref, { leaseId, leaseUntil: Date.now() + 120000 }, { merge: true });
    return data;
  });
  try {
    const customerId = saved.customerId || (await stripe.customers.create({ metadata: { firebaseUid: uid, projectId } }, { idempotencyKey: `roadguard-customer-${projectId}-${uid}` })).id;
    await ref.set({ customerId }, { merge: true });
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
    const resumable = native && subscriptions.data.find(s => s.status === 'incomplete' && s.metadata.product === 'roadguard-premium' && s.metadata.channel === 'payment-sheet');
    if (subscriptions.data.some(s => !['canceled', 'incomplete_expired'].includes(s.status) && s.id !== resumable?.id)) {
      throw httpError(409, 'Ya tienes una suscripción. Usa Administrar suscripción.');
    }
    if (native) {
      if (saved.sessionId) {
        const hosted = await stripe.checkout.sessions.retrieve(saved.sessionId);
        if (hosted.status === 'open') await stripe.checkout.sessions.expire(hosted.id);
        if (hosted.status === 'complete') throw httpError(409, 'El pago anterior se está verificando. Comprueba el estado.');
      }
      let sub;
      if (resumable) sub = await stripe.subscriptions.retrieve(resumable.id, { expand: ['latest_invoice.confirmation_secret'] });
      else {
        const productId = 'roadguard_premium_monthly';
        try { await stripe.products.retrieve(productId); }
        catch (error) { if (error.code !== 'resource_missing') throw error; await stripe.products.create({ id: productId, name: 'RoadGuard Premium · Prueba' }, { idempotencyKey: 'roadguard-premium-product-v1' }); }
        const attempt = saved.nativeAttempt && !saved.nativeSubscriptionId ? saved.nativeAttempt : randomUUID();
        await ref.set({ nativeAttempt: attempt, nativeSubscriptionId: null }, { merge: true });
        sub = await stripe.subscriptions.create({ customer: customerId,
          items: [{ price_data: { currency: 'mxn', product: productId, unit_amount: 4999, recurring: { interval: 'month' } } }],
          payment_behavior: 'default_incomplete', payment_settings: { payment_method_types: ['card'], save_default_payment_method: 'on_subscription' },
          metadata: { firebaseUid: uid, product: 'roadguard-premium', channel: 'payment-sheet' },
          expand: ['latest_invoice.confirmation_secret'],
        }, { idempotencyKey: 'roadguard-native-' + attempt });
        await ref.set({ nativeSubscriptionId: sub.id }, { merge: true });
      }
      const clientSecret = sub.latest_invoice?.confirmation_secret?.client_secret;
      if (sub.livemode || !clientSecret) throw httpError(409, 'Comprueba el estado del pago antes de volver a intentarlo.');
      return { clientSecret, subscriptionId: sub.id };
    }
    if (saved.sessionId) {
      const existing = await stripe.checkout.sessions.retrieve(saved.sessionId);
      if (existing.status === 'open' && existing.url) return existing.url;
    }
    // Persist the attempt before the Stripe request so a lost response is retried idempotently.
    const attemptId = saved.attemptId && !saved.sessionId ? saved.attemptId : randomUUID();
    await ref.set({ attemptId, sessionId: null }, { merge: true });
    const session = await stripe.checkout.sessions.create(checkoutOptions(uid, customerId, baseUrl), { idempotencyKey: `roadguard-checkout-${attemptId}` });
    if (session.livemode || !session.url) throw new Error('Stripe no devolvió un pago de prueba.');
    await ref.set({ sessionId: session.id }, { merge: true });
    return session.url;
  } finally {
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.data()?.leaseId === leaseId) tx.set(ref, { leaseUntil: 0 }, { merge: true });
    });
  }
}

async function webhook(raw, signature) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw httpError(503, 'Webhook sin configurar.');
  let event;
  try { event = stripe.webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET); }
  catch { throw httpError(400, 'Firma de Stripe inválida.'); }
  if (event.livemode) throw httpError(400, 'Solo se aceptan eventos de prueba.');
  const object = event.data.object;
  const subscriptionId = event.type.startsWith('customer.subscription.') ? object.id
    : event.type === 'checkout.session.completed' ? idOf(object.subscription) : null;
  if (!subscriptionId) return;
  const receipt = db.doc(`stripeEvents/${event.id}`);
  // Fetch current Stripe state inside the transaction: retries/out-of-order events
  // never blindly replay the older event's status into the entitlement.
  await db.runTransaction(async tx => {
    if ((await tx.get(receipt)).exists) return;
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const uid = sub.metadata.firebaseUid;
    if (!uid || sub.metadata.product !== 'roadguard-premium' || sub.livemode) return;
    const customer = await tx.get(db.doc(`stripeCustomers/${uid}`));
    if (customer.data()?.customerId !== idOf(sub.customer)) throw new Error('Cliente Stripe no coincide.');
    const ref = db.doc(`users/${uid}/billing/subscription`);
    const previous = await tx.get(ref);
    const next = entitlement(sub);
    // A canceled older subscription must not revoke a newer active one.
    if (previous.exists && previous.data().subscriptionId !== sub.id && !next.active) {
      tx.set(receipt, { processedAt: Date.now(), ignored: true }); return;
    }
    tx.set(ref, { ...next, updatedAt: Date.now() });
    tx.set(receipt, { processedAt: Date.now() });
    if (next.active && !previous.data()?.active) {
      tx.set(db.doc(`pushOutbox/${event.id}`), { uid, title: 'RoadGuard Premium', body: 'Tu suscripción de prueba está activa.', dueAt: Date.now(), attempts: 0 });
    }
  });
}

async function sendPush(job) {
  const data = job.data();
  const devices = await db.collection(`users/${data.uid}/pushDevices`).limit(10).get();
  const eligible = devices.docs.filter(d => validDevice(d.data()));
  if (!eligible.length) throw new Error('No hay dispositivos Android registrados.');
  const completed = new Set(data.completedDevices || []);
  for (const device of eligible) {
    if (completed.has(device.id)) continue;
    const result = await sendAndroidNotification(getMessaging(), device.data().token, data.title, data.body);
    if (result.invalidToken) await device.ref.delete();
    if (result.messageId) await db.collection('pushReceipts').add({ provider: 'fcm', messageId: result.messageId, acceptedAt: Date.now(), devicePath: device.ref.path });
    completed.add(device.id);
    await job.ref.update({ completedDevices: [...completed] });
  }
}

let working = false;
async function work() {
  if (working) return; working = true;
  try {
    const jobs = await db.collection('pushOutbox').where('dueAt', '<=', Date.now()).limit(10).get();
    for (const job of jobs.docs) {
      const data = job.data();
      try { await sendPush(job); await job.ref.delete(); }
      catch {
        const attempts = (data.attempts || 0) + 1;
        if (attempts >= 5) { await db.collection('pushFailures').doc(job.id).set({ failedAt: Date.now(), reason: 'delivery-retries-exhausted' }); await job.ref.delete(); }
        else await job.ref.update({ attempts, dueAt: Date.now() + 60000 * attempts });
      }
    }
  } catch { console.error('No se pudo procesar la cola push; se reintentará.'); }
  finally { working = false; }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const origin = req.headers.origin;
  if (origin && !origins.has(origin)) { res.writeHead(403); res.end(); return; }
  if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const reply = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  try {
    const path = new URL(req.url, baseUrl).pathname;
    if (req.method === 'GET' && path === '/health') return reply(200, { ok: true, testMode: true, service: 'roadguard', instanceId: process.env.ROADGUARD_INSTANCE_ID || null });
    if (req.method === 'GET' && ['/billing/return', '/billing/cancel'].includes(path)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" });
      res.end('<!doctype html><meta name="viewport" content="width=device-width"><title>RoadGuard</title><h1>Vuelve a RoadGuard</h1><p>Puedes cerrar esta ventana. Premium se activa únicamente después de verificar el pago con Stripe.</p>'); return;
    }
    if (req.method === 'POST' && path === '/stripe/webhook') { await webhook(await body(req), req.headers['stripe-signature']); return reply(200, { received: true }); }
    if (req.method !== 'POST') return reply(404, { error: 'Ruta no encontrada.' });
    const uid = await user(req);
    let data;
    try { data = JSON.parse((await body(req)).toString() || '{}'); } catch (error) { if (error.status) throw error; throw httpError(400, 'JSON inválido.'); }
    if (path === '/billing/manage') return reply(200, await management.summary(uid));
    if (path === '/billing/cancel') { await throttle(uid, 'manage', 2); return reply(200, await management.cancel(uid, data.cancelAtPeriodEnd)); }
    if (path === '/billing/card/setup') { await throttle(uid, 'card', 3); return reply(200, await management.setup(uid)); }
    if (path === '/billing/card/confirm') { await throttle(uid, 'card-confirm', 2); return reply(200, await management.confirm(uid, data.setupId)); }
    if (path === '/billing/payment-sheet') { await throttle(uid, 'checkout', 3); return reply(200, await checkout(uid, true)); }
    if (path === '/billing/checkout') { await throttle(uid, 'checkout', 3); return reply(200, { url: await checkout(uid) }); }
    if (path === '/billing/portal') {
      await throttle(uid, 'portal', 5);
      const customer = (await db.doc(`stripeCustomers/${uid}`).get()).data()?.customerId;
      if (!customer) throw httpError(409, 'Todavía no tienes una suscripción.');
      const portal = await stripe.billingPortal.sessions.create({ customer, return_url: `${baseUrl}/billing/return`, ...(process.env.STRIPE_PORTAL_CONFIGURATION ? { configuration: process.env.STRIPE_PORTAL_CONFIGURATION } : {}) });
      return reply(200, { url: portal.url });
    }
    if (path === '/push/unregister') {
      if (typeof data.token !== 'string' || !/^[A-Za-z0-9:_-]{20,4096}$/.test(data.token)) throw new Error('Token inválido.');
      const id = createHash('sha256').update(data.token).digest('hex');
      await db.doc(`users/${uid}/pushDevices/${id}`).delete();
      return reply(200, { ok: true });
    }
    if (path === '/push/register') {
      await throttle(uid, 'register', 2);
      if (!validDevice(data)) throw httpError(400, 'Token push inválido.');
      const id = createHash('sha256').update(data.token).digest('hex');
      await db.doc(`users/${uid}/pushDevices/${id}`).set({ token: data.token, platform: 'android', provider: 'fcm', updatedAt: Date.now() });
      return reply(200, { registered: true });
    }
    if (path === '/push/test') {
      await throttle(uid, 'test', 30);
      await db.collection('pushOutbox').add({ uid, title: 'RoadGuard', body: 'Notificación push de prueba recibida.', dueAt: Date.now() + 15000, attempts: 0 });
      return reply(200, { queued: true });
    }
    return reply(404, { error: 'Ruta no encontrada.' });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Fallo del servidor:', error.code || error.type || 'internal');
    reply(status, { error: status < 500 ? error.message : 'El servidor no pudo completar la operación. Revisa su configuración.' });
  }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'El puerto 3001 ya está ocupado por otro servidor.' : 'No se pudo iniciar el servidor: ' + error.code); process.exit(1); });
server.requestTimeout = 30000;
server.listen(Number(process.env.PORT || 3001), '0.0.0.0', () => console.log('RoadGuard API lista en modo de prueba.'));
// This deployment needs ONE always-running instance (not a sleeping/serverless host).
setInterval(() => void work(), 15000).unref();
