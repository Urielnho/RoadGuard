import { anonymousUserId } from './cloudSync';
import { getFirebaseAuth } from './firebaseAuth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { getFirebaseDatabase } from './firebase';

export async function apiPost<T>(path: string, body: object = {}): Promise<T> {
  await anonymousUserId();
  let base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (process.env.EXPO_PUBLIC_SCHOOL_SERVER === 'true') {
    const config = (await getDocFromServer(doc(getFirebaseDatabase(), 'appConfig', 'schoolServer'))).data();
    if (!config || typeof config.expiresAt !== 'number' || config.expiresAt <= Date.now()) throw new Error('El servidor de la laptop está apagado. Inicia la demostración e intenta de nuevo.');
    const url = new URL(config.url);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.trycloudflare.com') || url.pathname !== '/' || url.username || url.password || url.search || url.hash) throw new Error('La dirección del servidor no es válida.');
    base = url.origin;
  }
  if (!base) throw new Error('Falta conectar el servidor de pagos y notificaciones.');
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (!token) throw new Error('No se pudo iniciar la sesión de Firebase.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal: controller.signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'El servidor no pudo completar la solicitud.');
    return result as T;
  } finally { clearTimeout(timer); }
}
