import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
// Firebase 12 exposes this at runtime under Metro's react-native condition,
// but its default TypeScript entry describes the browser exports.
// @ts-expect-error React Native conditional export, verified by native bundling.
import { getReactNativePersistence } from 'firebase/auth';
import storage from './cloudStorage';
import { getFirebaseApp } from './firebase';

let auth: Auth | undefined;
export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  try {
    auth = initializeAuth(getFirebaseApp(), { persistence: getReactNativePersistence(storage) });
  } catch (error) {
    if ((error as { code?: string }).code !== 'auth/already-initialized') throw error;
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}
