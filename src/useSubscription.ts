import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { anonymousUserId } from './cloudSync';
import { getFirebaseDatabase, isFirebaseConfigured } from './firebase';
import { hasPremium, type Subscription } from './subscriptionDomain';

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    const connect = async () => {
      try {
        if (!isFirebaseConfigured()) throw new Error('Falta configurar Firebase.');
        const uid = await anonymousUserId();
        if (!alive) return;
        unsubscribe = onSnapshot(doc(getFirebaseDatabase(), 'users', uid, 'billing', 'subscription'), { includeMetadataChanges: true }, snapshot => {
          if (!alive) return;
          // A local demo or a locally pending write must never grant Premium.
          if (snapshot.metadata.hasPendingWrites || snapshot.metadata.fromCache) return;
          setSubscription(snapshot.exists() ? snapshot.data() as Subscription : null);
          setReady(true); setError(''); setNow(Date.now());
        }, () => { if (alive) { setSubscription(null); setReady(true); setError('No se pudo verificar Premium. Revisa la conexión y las reglas de Firebase.'); } });
      } catch { if (alive) { setSubscription(null); setReady(true); setError('No se pudo conectar con Firebase para verificar Premium.'); } }
    };
    void connect();
    return () => { alive = false; unsubscribe?.(); };
  }, [attempt]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') { setNow(Date.now()); setAttempt(value => value + 1); } });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setAttempt(value => value + 1), 30000);
    return () => clearTimeout(timer);
  }, [error, attempt]);
  return { active: hasPremium(subscription, now), subscription, error, ready, refresh: () => setAttempt(value => value + 1) };
}
