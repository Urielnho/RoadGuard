// Browser preview only. The Android/iOS build continues to use SQLite.
import { Trip } from './domain';
const key = 'roadguard.preview.trips';
export async function loadTrips(): Promise<Trip[]> {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}
export async function saveTrip(trip: Trip) {
  const trips = await loadTrips();
  localStorage.setItem(key, JSON.stringify([trip, ...trips.filter(item => item.id !== trip.id)]));
}
