import fs from 'node:fs';
import Stripe from 'stripe';
import { requireTestKey } from './billing.mjs';

const url = new URL(process.argv[2]);
if (url.protocol !== 'https:' || !url.hostname.endsWith('.trycloudflare.com') || url.pathname !== '/') throw new Error('Se requiere la URL HTTPS del túnel local.');
requireTestKey(process.env.STRIPE_SECRET_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const base = url.origin;
const events = ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'];
const envPath = new URL('.env', import.meta.url);
let env = fs.readFileSync(envPath, 'utf8');
function set(name, value) {
  const line = `${name}=${value}`;
  const re = new RegExp(`^${name}=.*$`, 'm');
  env = re.test(env) ? env.replace(re, line) : `${env.trimEnd()}\n${line}\n`;
}
const id = process.env.STRIPE_LOCAL_WEBHOOK_ID;
if (id && process.env.STRIPE_WEBHOOK_SECRET) {
  const prior = await stripe.webhookEndpoints.retrieve(id);
  if (prior.livemode || prior.metadata?.purpose !== 'roadguard-laptop') throw new Error('El webhook guardado no corresponde a esta demostración.');
  await stripe.webhookEndpoints.update(id, { url: `${base}/stripe/webhook`, enabled_events: events, disabled: false });
} else {
  const endpoint = await stripe.webhookEndpoints.create({ url: `${base}/stripe/webhook`, enabled_events: events, description: 'RoadGuard: demostración escolar en laptop', metadata: { purpose: 'roadguard-laptop' } });
  set('STRIPE_LOCAL_WEBHOOK_ID', endpoint.id);
  set('STRIPE_WEBHOOK_SECRET', endpoint.secret);
}
set('PUBLIC_BASE_URL', base);
fs.writeFileSync(envPath, env);
const rootEnv = new URL('../.env', import.meta.url);
const content = fs.readFileSync(rootEnv, 'utf8');
fs.writeFileSync(rootEnv, /^EXPO_PUBLIC_API_URL=.*$/m.test(content) ? content.replace(/^EXPO_PUBLIC_API_URL=.*$/m, `EXPO_PUBLIC_API_URL=${base}`) : `${content}\nEXPO_PUBLIC_API_URL=${base}\n`);
const configs = await stripe.billingPortal.configurations.list({ limit: 100 });
if (!configs.data.some(c => c.active && c.metadata?.purpose === 'roadguard-laptop')) {
  const config = await stripe.billingPortal.configurations.create({ business_profile: { headline: 'RoadGuard Premium · Pruebas escolares' }, features: { subscription_cancel: { enabled: true, mode: 'at_period_end' }, invoice_history: { enabled: true }, payment_method_update: { enabled: true } }, metadata: { purpose: 'roadguard-laptop' } });
  set('STRIPE_PORTAL_CONFIGURATION', config.id);
} else set('STRIPE_PORTAL_CONFIGURATION', configs.data.find(c => c.active && c.metadata?.purpose === 'roadguard-laptop').id);
fs.writeFileSync(envPath, env);
console.log('Stripe de prueba conectado al servidor local. No se hicieron cobros.');
