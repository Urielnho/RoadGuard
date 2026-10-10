import { Trip } from './domain';
import { defaultPreferences, Preferences } from './premiumDomain';
import { storageSuffix } from './storageScope';
export async function loadTrips(): Promise<Trip[]> {
 const data = localStorage.getItem('roadguard.preview.trips' + await storageSuffix());
 return data ? (JSON.parse(data) as Trip[]).filter(trip => trip.simulated === false) : [];
}
export async function loadPreferences(): Promise<Preferences> {
 const data = localStorage.getItem('roadguard.preview.preferences' + await storageSuffix());
 return data ? { ...defaultPreferences(), ...JSON.parse(data) } : defaultPreferences();
}
export async function savePreferences(preferences: Preferences) {
 localStorage.setItem('roadguard.preview.preferences' + await storageSuffix(), JSON.stringify(preferences));
}
export async function saveTrip(trip: Trip) {
 if (trip.simulated) throw new Error('Solo se permiten viajes con sensores reales.');
 const key = 'roadguard.preview.trips' + await storageSuffix();
 const trips: Trip[] = JSON.parse(localStorage.getItem(key) || '[]');
 localStorage.setItem(key, JSON.stringify([trip, ...trips.filter(item => item.id !== trip.id)]));
}
