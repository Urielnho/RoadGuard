
import { doc, setDoc } from 'firebase/firestore';
import type { Trip } from './domain';
import { getFirebaseAuth } from './firebaseAuth';
import { getFirebaseDatabase } from './firebase';
import storage from './cloudStorage';
import { tripSummary } from './cloudDomain';

let signingIn: Promise<string> | undefined;
export function anonymousUserId(): Promise<string> {
  if (!signingIn) {
    signingIn = (async () => {
      const auth = getFirebaseAuth();
      await auth.authStateReady();
      if (!auth.currentUser) throw new Error('Inicia sesión para continuar.');
      return auth.currentUser.uid;
    })().finally(() => { signingIn = undefined; });
  }
  return signingIn;
}

const uploads = new Map<string, Promise<void>>();
export function backUpTrip(uid: string, trip: Trip): Promise<void> {
  const db = getFirebaseDatabase();
  const key = `roadguard.cloud.v1.${db.app.options.projectId}.${uid}.${trip.id}`;
  const current = uploads.get(key);
  if (current) return current;
  const task = (async () => {
    const summary = tripSummary(trip);
    const fingerprint = JSON.stringify(summary);
    if (await storage.getItem(key) === fingerprint) return;
    await setDoc(doc(db, 'users', uid, 'trips', trip.id), summary);
    // Only mark as backed up after the server acknowledges the write.
    await storage.setItem(key, fingerprint);
  })().finally(() => { uploads.delete(key); });
  uploads.set(key, task);
  return task;
}
