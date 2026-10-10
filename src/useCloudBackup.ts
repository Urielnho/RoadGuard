import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Trip } from './domain';
import { getFirebaseDatabase, isFirebaseConfigured } from './firebase';
import { anonymousUserId, backUpTrip } from './cloudSync';
import { cloudErrorMessage } from './cloudDomain';

export function useCloudBackup(trips: Trip[]) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState(() => isFirebaseConfigured() ? 'Conectando con Firebase…' : 'Respaldo sin configurar. Guardado local activo.');
  const [recentCount, setRecentCount] = useState<number | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const retry = () => setAttempt(value => value + 1);

  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') setAttempt(value => value + 1);
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    let active = true;
    const timer = setTimeout(() => {
      if (active) { setFailed(true); setMessage('Respaldo pendiente de conexión. Tus viajes están guardados en este dispositivo.'); }
    }, 15000);
    void (async () => {
      try {
        const userId = await anonymousUserId();
        if (!active) return;
        setUid(userId);
        setMessage('Respaldando resúmenes…');
        const realTrips = trips.filter(trip => trip.simulated === false);
        for (const trip of realTrips) {
          if (!active) return;
          await backUpTrip(userId, trip);
        }
        if (active) { setFailed(false); setMessage(realTrips.length ? 'Resúmenes respaldados en Firebase.' : 'Acceso a Firebase listo. Completa un viaje para respaldarlo.'); }
      } catch (error) {
        if (active) { setFailed(true); setMessage(cloudErrorMessage(error)); }
      } finally { clearTimeout(timer); }
    })();
    return () => { active = false; clearTimeout(timer); };
  }, [trips, attempt]);

  const [readError, setReadError] = useState('');
  useEffect(() => {
    if (!uid) return;
    const recent = query(collection(getFirebaseDatabase(), 'users', uid, 'trips'), orderBy('end', 'desc'), limit(20));
    return onSnapshot(recent, { includeMetadataChanges: true }, snapshot => {
      // Never advertise local pending writes as server-confirmed data.
      if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) {
        setRecentCount(snapshot.size); setReadError('');
      } else { setRecentCount(null); }
    }, error => { setRecentCount(null); setReadError(cloudErrorMessage(error)); });
  }, [uid, attempt]);

  const canRetry = failed || Boolean(readError);
  useEffect(() => {
    if (!canRetry) return;
    const timer = setTimeout(() => { if (AppState.currentState === 'active') setAttempt(value => value + 1); }, 30000);
    return () => clearTimeout(timer);
  }, [canRetry, attempt]);

  return { canRetry, message: readError || message, recentCount, retry };
}
