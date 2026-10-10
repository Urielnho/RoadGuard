import { storageSuffix } from './storageScope';
import * as SQLite from 'expo-sqlite';
import { Trip } from './domain';
import { defaultPreferences, Preferences } from './premiumDomain';
const databases = new Map<string, Promise<SQLite.SQLiteDatabase>>();
async function db() {
  const name = 'roadguard' + await storageSuffix() + '.db';
  if (!databases.has(name)) databases.set(name, SQLite.openDatabaseAsync(name).catch(error => { databases.delete(name); throw error; }));
  const connection = await databases.get(name)!;
  await connection.execAsync('CREATE TABLE IF NOT EXISTS trips (id TEXT PRIMARY KEY NOT NULL, ended INTEGER NOT NULL, data TEXT NOT NULL);');
  await connection.execAsync('CREATE TABLE IF NOT EXISTS preferences (id INTEGER PRIMARY KEY NOT NULL, data TEXT NOT NULL);');
  return connection;
}
export async function loadPreferences(): Promise<Preferences> {
  const connection = await db();
  const row = await connection.getFirstAsync<{ data: string }>('SELECT data FROM preferences WHERE id = 1');
  return row ? { ...defaultPreferences(), ...JSON.parse(row.data) } : defaultPreferences();
}
export async function savePreferences(preferences: Preferences) {
  const connection = await db();
  await connection.runAsync('INSERT OR REPLACE INTO preferences (id, data) VALUES (1, ?)', JSON.stringify(preferences));
}
export async function saveTrip(trip: Trip) {
  if (trip.simulated) throw new Error('Solo se permiten viajes con sensores reales.');
  const connection = await db();
  await connection.runAsync('INSERT OR REPLACE INTO trips (id, ended, data) VALUES (?, ?, ?)', trip.id, trip.end, JSON.stringify(trip));
}
export async function loadTrips(): Promise<Trip[]> {
  const connection = await db();
  const rows = await connection.getAllAsync<{ data: string }>('SELECT data FROM trips ORDER BY ended DESC');
  return rows.map(row => JSON.parse(row.data) as Trip).filter(trip => trip.simulated === false);
}
