import { getAuth } from 'firebase/auth';
import { getFirebaseApp } from './firebase';

export function getFirebaseAuth() { return getAuth(getFirebaseApp()); }
