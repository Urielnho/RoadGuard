import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import https from 'node:https';
import { Resolver } from 'node:dns';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const cwd = fileURLToPath(new URL('.', import.meta.url));
process.chdir(cwd);
process.loadEnvFile('.env');
// Reserve the launcher before modifying Stripe, .env or Firebase.
const publicDns = new Resolver();
publicDns.setServers(['1.1.1.1', '8.8.8.8']);
function publicHealth(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { lookup: (hostname, options, callback) => publicDns.resolve4(hostname, (error, addresses) => { if (error) return callback(error); if (options.all) callback(null, addresses.map(address => ({ address, family: 4 }))); else callback(null, addresses[0], 4); }) }, res => {
      let body = ''; res.on('data', chunk => { body += chunk; }); res.on('end', () => { try { resolve(res.statusCode === 200 ? JSON.parse(body) : null); } catch (error) { reject(error); } });
    });
    req.setTimeout(5000, () => req.destroy(new Error('Timeout'))); req.on('error', reject);
  });
}
let readyState = false;
const guard = http.createServer((_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ service: 'roadguard-launcher', ready: readyState })); });
try {
  await new Promise((resolve, reject) => { guard.once('error', reject); guard.listen(3002, '127.0.0.1', resolve); });
} catch (error) {
  if (error.code !== 'EADDRINUSE') throw error;
  try {
    const existing = await (await fetch('http://127.0.0.1:3002', { signal: AbortSignal.timeout(2000) })).json();
    if (existing.service === 'roadguard-launcher') {
      console.log(existing.ready ? 'EL SERVIDOR YA ESTÁ ENCENDIDO. Puedes usar RoadGuard en tu teléfono.' : 'RoadGuard ya se está iniciando. Espera a que termine la primera instancia.');
      process.exit(0);
    }
  } catch {}
  console.error('El puerto de control 3002 está ocupado por otro programa. No se cambió ninguna configuración.');
  process.exit(1);
}
try {
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(3001, '0.0.0.0', resolve); });
  await new Promise(resolve => probe.close(resolve));
} catch {
  guard.close();
  console.error('El puerto 3001 ya está ocupado. Cierra la instancia anterior de RoadGuard antes de iniciar otra. No se cambió Stripe.');
  process.exit(1);
}
const instanceId = randomUUID();
initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID });
const ref = getFirestore().doc('appConfig/schoolServer');
const binary = fileURLToPath(new URL('tools/cloudflared.exe', import.meta.url));
if (!fs.existsSync(binary)) throw new Error('Falta server/tools/cloudflared.exe.');
let api; let timer; let closing = false;
fs.mkdirSync('.local', { recursive: true });
const tunnelLog = fs.createWriteStream('.local/tunnel.log', { flags: 'w' });
const tunnel = spawn(binary, ['tunnel', '--protocol', 'http2', '--url', 'http://127.0.0.1:3001', '--no-autoupdate'], { cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
tunnel.stderr.pipe(tunnelLog);
async function stop() {
  if (closing) return;
  closing = true;
  clearInterval(timer);
  api?.kill(); tunnel.kill();
  guard.close();
  await getFirestore().runTransaction(async tx => {
    const current = await tx.get(ref);
    if (current.data()?.instanceId === instanceId) tx.update(ref, { expiresAt: 0 });
  }).catch(() => {});
}
process.on('SIGINT', () => void stop().finally(() => process.exit(0)));
process.on('SIGTERM', () => void stop().finally(() => process.exit(0)));
try {
  const url = await new Promise((resolve, reject) => {
    let text = '';
    const timeout = setTimeout(() => reject(new Error('No se pudo abrir el túnel. Revisa Internet.')), 60000);
    function read(chunk) {
      text = (text + chunk.toString()).slice(-16000);
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) { clearTimeout(timeout); resolve(match[0]); }
    }
    tunnel.stdout.on('data', read); tunnel.stderr.on('data', read);
    tunnel.once('error', reject);
    tunnel.once('exit', () => { clearTimeout(timeout); reject(new Error('El túnel se cerró.')); });
  });
  console.log('Conectando Stripe de prueba…');
  await new Promise((resolve, reject) => {
    const configure = spawn(process.execPath, ['--env-file=.env', 'configure-local.mjs', url], { cwd, windowsHide: true, stdio: 'inherit' });
    configure.once('error', reject);
    configure.once('exit', code => code === 0 ? resolve() : reject(new Error('No se pudo configurar Stripe.')));
  });
  // Spawn with a fresh environment: .env now contains the new URL and webhook.
  const env = { ...process.env, ROADGUARD_INSTANCE_ID: instanceId };
  for (const key of ['PUBLIC_BASE_URL', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PORTAL_CONFIGURATION', 'STRIPE_LOCAL_WEBHOOK_ID']) delete env[key];
  api = spawn(process.execPath, ['--env-file=.env', 'index.mjs'], { cwd, env, windowsHide: true, stdio: 'inherit' });
  api.once('exit', () => { if (!closing) { console.error('El servidor se detuvo.'); void stop().finally(() => process.exit(1)); } });
  tunnel.once('exit', () => { if (!closing) { console.error('El túnel se detuvo.'); void stop().finally(() => process.exit(1)); } });
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { const response = await publicHealth(`${url}/health`); if (response?.instanceId === instanceId) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error('No se pudo comprobar el servidor desde Internet.');
  const publish = () => ref.set({ url, instanceId, expiresAt: Date.now() + 180000 });
  await publish();
  timer = setInterval(() => void publish().catch(() => console.error('No se pudo renovar la conexión con Firebase.')), 60000);
  readyState = true;
  console.log('DEMOSTRACIÓN LISTA. Abre RoadGuard en tu teléfono.');
  console.log('Mantén esta ventana abierta y la laptop encendida. Ctrl+C detiene el servidor.');
} catch (error) { console.error(error.message); await stop(); process.exitCode = 1; }
