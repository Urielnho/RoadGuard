import { storageSuffix } from './storageScope';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as SQLite from 'expo-sqlite';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AppState } from 'react-native';
import type { Reading } from './domain';
import { backgroundReading, type TrackingSession } from './trackingDomain';

const TASK = 'roadguard-background-location-v1';
const connections = new Map<string, Promise<SQLite.SQLiteDatabase>>();
async function database() {
  const name = 'roadguard-tracking' + await storageSuffix() + '.db';
  let connection = connections.get(name);
  connection ??= (async () => {
    const db = await SQLite.openDatabaseAsync(name);
    await db.execAsync('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, start REAL NOT NULL, vehicle TEXT NOT NULL, active INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS samples (sessionId TEXT NOT NULL, time REAL NOT NULL, source TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (sessionId,time,source));');
    return db;
  })().catch(error => { connections.delete(name); throw error; });
  connections.set(name, connection);
  return connection;
}

export async function pendingTracking(): Promise<TrackingSession | null> {
  return (await database()).getFirstAsync<TrackingSession>('SELECT id,start,vehicle FROM sessions ORDER BY start DESC LIMIT 1');
}

async function storeReading(id: string, reading: Reading, source: string) {
  await (await database()).runAsync('INSERT OR REPLACE INTO samples (sessionId,time,source,data) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM sessions WHERE id = ? AND active = 1)', id, reading.time, source, JSON.stringify(reading), id);
}

if (!TaskManager.isTaskDefined(TASK)) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
    if (error || !data || AppState.currentState === 'active') return;
    const session = await pendingTracking();
    if (!session) return;
    for (const location of data.locations) {
      const reading = backgroundReading(location, session.start, Date.now());
      if (reading) await storeReading(session.id, reading, 'background');
    }
  });
}

export async function allowBackgroundTracking() {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient || !await TaskManager.isAvailableAsync()) throw new Error('El GPS en segundo plano requiere la compilación de RoadGuard; no funciona en Expo Go.');
  if (!(await Location.requestForegroundPermissionsAsync()).granted) throw new Error('Autoriza primero la ubicación durante el uso.');
  if (!(await Location.requestBackgroundPermissionsAsync()).granted) throw new Error('Autoriza ubicación “Siempre” o “Permitir todo el tiempo” en Ajustes.');
}

export async function beginTracking(session: TrackingSession, background: boolean) {
  if (await pendingTracking()) throw new Error('Guarda primero el viaje pendiente de recuperación.');
  if (background) await allowBackgroundTracking();
  await (await database()).runAsync('INSERT INTO sessions (id,start,vehicle,active) VALUES (?,?,?,1)', session.id, session.start, session.vehicle);
  try {
    if (background) await Location.startLocationUpdatesAsync(TASK, { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 3,
      deferredUpdatesInterval: 5000, pausesUpdatesAutomatically: false, showsBackgroundLocationIndicator: true,
      foregroundService: { notificationTitle: 'RoadGuard · Viaje activo', notificationBody: 'Registrando ubicación. Abre RoadGuard para finalizar.', notificationColor: '#16735A', killServiceOnDestroy: true } });
  } catch (error) { await (await database()).runAsync('DELETE FROM sessions WHERE id = ?', session.id); throw error; }
}

export async function recordForeground(id: string, reading: Reading) { await storeReading(id, reading, 'foreground'); }
export async function stopTracking(id: string) {
  await (await database()).runAsync('UPDATE sessions SET active = 0 WHERE id = ?', id);
  if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient && await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
}
export async function trackingReadings(id: string) {
  const rows = await (await database()).getAllAsync<{ source: string; data: string }>('SELECT source,data FROM samples WHERE sessionId = ? ORDER BY time', id);
  return { foreground: rows.filter(row => row.source === 'foreground').map(row => JSON.parse(row.data) as Reading), background: rows.filter(row => row.source === 'background').map(row => JSON.parse(row.data) as Reading) };
}
export async function clearTracking(id: string) {
  const db = await database();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM samples WHERE sessionId = ?', id);
    await db.runAsync('DELETE FROM sessions WHERE id = ?', id);
  });
}
