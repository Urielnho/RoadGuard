import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import Stripe from 'stripe';

test('HTTP API rejects unauthenticated payments and unsigned/tampered webhooks', async () => {
  const port = 32187;
  const child = spawn(process.execPath, ['index.mjs'], { cwd: new URL('..', import.meta.url), env: { ...process.env, PORT: String(port), FIREBASE_PROJECT_ID: 'roadguard-unit-test', STRIPE_SECRET_KEY: 'sk_test_unit', STRIPE_WEBHOOK_SECRET: 'whsec_unit', PUBLIC_BASE_URL: `http://localhost:${port}`, ALLOWED_ORIGINS: 'http://localhost:8081', GOOGLE_APPLICATION_CREDENTIALS: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => { throw new Error('El servidor no pudo iniciar.'); }), new Promise((_, reject) => { const t = setTimeout(() => reject(new Error('Tiempo de inicio agotado')), 10000); t.unref(); })]);
    const base = `http://127.0.0.1:${port}`;
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await fetch(`${base}/billing/checkout`, { method: 'POST', body: '{}' })).status, 401);
    for (const path of ['/billing/manage','/billing/cancel','/billing/card/setup','/billing/card/confirm','/push/unregister']) assert.equal((await fetch(base + path, { method: 'POST', body: '{}' })).status, 401);
    assert.equal((await fetch(`${base}/push/register`, { method: 'POST', body: '{}' })).status, 401);
    assert.equal((await fetch(`${base}/health`, { headers: { Origin: 'https://untrusted.example' } })).status, 403);
    assert.equal((await fetch(`${base}/stripe/webhook`, { method: 'POST', body: '{}' })).status, 400);
    const stripe = new Stripe('sk_test_unit');
    const payload = JSON.stringify({ id: 'evt_unit', type: 'test.unhandled', livemode: false, data: { object: {} } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_unit' });
    const signed = { method: 'POST', headers: { 'stripe-signature': signature }, body: payload };
    assert.equal((await fetch(`${base}/stripe/webhook`, signed)).status, 200);
    assert.equal((await fetch(`${base}/stripe/webhook`, { ...signed, body: payload + ' ' })).status, 400);
  } finally { child.kill(); await once(child, 'exit').catch(() => {}); }
});
