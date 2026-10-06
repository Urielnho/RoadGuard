// Browser preview only. The Android/iOS build continues to use SQLite.
import { Trip } from './domain';
import { defaultPreferences, Preferences } from './premiumDomain';
const key = 'roadguard.preview.trips';
export async function loadTrips(): Promise<Trip[]> {
  const data = localStorage.getItem(key);
  return data ? (JSON.parse(data) as Trip[]).filter(trip => trip.simulated === false) : [];
}
export async function loadPreferences(): Promise<Preferences> {
  const data = localStorage.getItem('roadguard.preview.preferences');
  return data ? { ...defaultPreferences(), ...JSON.parse(data) } : defaultPreferences();
}
export async function savePreferences(preferences: Preferences) {
  localStorage.setItem('roadguard.preview.preferences', JSON.stringify(preferences));
}
export async function saveTrip(trip: Trip) {
  if (trip.simulated) throw new Error('Solo se permiten viajes con sensores reales.');
  const trips = await loadTrips();
  localStorage.setItem(key, JSON.stringify([trip, ...trips.filter(item => item.id !== trip.id)]));
}
