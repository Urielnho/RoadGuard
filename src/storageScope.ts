import { accountSuffix } from './accountDomain';
import storage from './cloudStorage';
import { getFirebaseAuth } from './firebaseAuth';
let claiming: Promise<string> | undefined;
export async function storageSuffix() {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Inicia sesión para abrir tus datos.');
  claiming ??= (async () => {
    const existing = await storage.getItem('roadguard.legacyOwner');
    if (existing) return existing;
    await storage.setItem('roadguard.legacyOwner', uid);
    return uid;
  })().catch(error => { claiming = undefined; throw error; });
  const owner = await claiming;
  return accountSuffix(uid, owner);
}
