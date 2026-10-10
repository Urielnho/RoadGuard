import type { Trip } from './domain';

// Bounded summary: no raw GPS, photo, Premium entitlement or sensor arrays.
export function tripSummary(trip: Trip) {
  if (trip.simulated !== false) throw new Error('Solo se respaldan viajes reales.');
  return {
    schemaVersion: 1,
    id: trip.id,
    vehicle: trip.vehicle,
    start: trip.start,
    end: trip.end,
    distance: trip.distance,
    averageRisk: trip.averageRisk,
    readingCount: trip.readings.length,
    eventCount: trip.events.length,
  };
}

export function cloudErrorMessage(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'permission-denied') return 'Falta publicar las reglas de acceso de Firestore. Tus viajes siguen guardados en este dispositivo.';
  if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') return 'Activa el acceso anónimo en Firebase Authentication.';
  if (code === 'auth/invalid-api-key' || code === 'auth/configuration-not-found') return 'Revisa la configuración del proyecto de Firebase.';
  return 'No se pudo confirmar el respaldo. Revisa tu conexión y vuelve a intentar. Tus viajes siguen en este dispositivo.';
}
