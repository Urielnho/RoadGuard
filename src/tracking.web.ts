import { storageSuffix } from './storageScope';
import type { Reading } from './domain';
import type { TrackingSession } from './trackingDomain';
const key = async () => 'roadguard.web.active-trip' + await storageSuffix();
type Journal = { session: TrackingSession; readings: Reading[]; active: boolean };
const read = async (): Promise<Journal | null> => JSON.parse(localStorage.getItem(await key()) || 'null');
export async function pendingTracking() { return (await read())?.session ?? null; }
export async function allowBackgroundTracking(): Promise<void> { throw new Error('El registro en segundo plano requiere la compilación móvil de RoadGuard.'); }
export async function beginTracking(session: TrackingSession, background: boolean) {
  if (background) await allowBackgroundTracking();
  if (await read()) throw new Error('Guarda primero el viaje pendiente de recuperación.');
  localStorage.setItem(await key(), JSON.stringify({ session, readings: [], active: true }));
}
export async function recordForeground(id: string, reading: Reading) {
  const data = await read();
  if (data?.active && data.session.id === id) { data.readings.push(reading); localStorage.setItem(await key(), JSON.stringify(data)); }
}
export async function stopTracking(id: string) {
  const data = await read();
  if (data?.session.id === id) { data.active = false; localStorage.setItem(await key(), JSON.stringify(data)); }
}
export async function trackingReadings(id: string) { const data = await read(); return { foreground: data?.session.id === id ? data.readings : [], background: [] as Reading[] }; }
export async function clearTracking(id: string) { if ((await read())?.session.id === id) localStorage.removeItem(await key()); }
