import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, EmailAuthProvider, linkWithCredential, onIdTokenChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { getFirebaseAuth } from './firebaseAuth';
import { storageSuffix } from './storageScope';
import { pendingTracking } from './tracking';
import { disablePush } from './push';
import { Button, Card, colors, s } from './ui';

function message(error: unknown) {
 const code = (error as { code?: string })?.code;
 const messages: Record<string, string> = {
  'auth/invalid-email': 'Escribe un correo válido.',
  'auth/invalid-credential': 'Revisa tu correo y contraseña.',
  'auth/wrong-password': 'Revisa tu correo y contraseña.',
  'auth/user-not-found': 'Revisa tu correo y contraseña.',
  'auth/email-already-in-use': 'Ese correo ya tiene cuenta. Usa Iniciar sesión.',
  'auth/weak-password': 'Utiliza una contraseña de al menos 6 caracteres.',
  'auth/network-request-failed': 'No hay conexión con Firebase. Revisa tu internet.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
  'auth/operation-not-allowed': 'Falta activar Correo electrónico/contraseña en Firebase Authentication.',
 };
 return messages[code ?? ''] ?? (error instanceof Error ? error.message : 'No se pudo completar la operación.');
}
export function AccountGate({ children }: { children: (uid: string) => React.ReactNode }) {
 const [session, setSession] = useState<{ user: User | null; anonymous: boolean } | null>(null);
 const [error, setError] = useState('');
 useEffect(() => {
  let current = 0;
  const unsubscribe = onIdTokenChanged(getFirebaseAuth(), user => {
   const revision = ++current;
   void (async () => {
    if (user) await storageSuffix();
    if (revision === current) { setError(''); setSession({ user, anonymous: !!user?.isAnonymous }); }
   })().catch(err => { if (revision === current) setError(message(err)); });
  }, err => setError(message(err)));
  return () => { current++; unsubscribe(); };
 }, []);
 if (error) return <SafeAreaView style={s.safe}><View style={s.content}><Text style={s.description}>{error}</Text><Text style={s.muted}>Cierra y vuelve a abrir la app para reintentar.</Text></View></SafeAreaView>;
 if (!session) return <SafeAreaView style={s.safe}><ActivityIndicator accessibilityLabel="Abriendo tu cuenta" color={colors.accent} /></SafeAreaView>;
 if (session.user && !session.anonymous) return <React.Fragment key={session.user.uid}>{children(session.user.uid)}</React.Fragment>;
 return <LoginForm guest={session.user} onRegistered={user => setSession({ user, anonymous: false })} />;
}
function LoginForm({ guest, onRegistered }: { guest: User | null; onRegistered: (user: User) => void }) {
 const [mode, setMode] = useState<'register' | 'login' | 'reset'>(guest ? 'register' : 'login');
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [confirmation, setConfirmation] = useState('');
 const [busy, setBusy] = useState(false);
 const [notice, setNotice] = useState('');
 async function submit() {
  if (busy) return;
  setBusy(true); setNotice('');
  try {
   const auth = getFirebaseAuth();
   if (!email.trim()) throw new Error('Escribe tu correo electrónico.');
   if (mode === 'reset') {
    await sendPasswordResetEmail(auth, email.trim());
    setNotice('Si ese correo tiene una cuenta, recibirás un enlace para cambiar la contraseña. Revisa también spam.');
   } else if (mode === 'register') {
    if (password.length < 6) throw new Error('Utiliza una contraseña de al menos 6 caracteres.');
    if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
    const result = auth.currentUser?.isAnonymous
     ? await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email.trim(), password))
     : await createUserWithEmailAndPassword(auth, email.trim(), password);
    onRegistered(result.user);
   } else {
    if (guest) throw new Error('Primero crea una cuenta para conservar los viajes y pagos de este dispositivo. Después podrás cerrar sesión y entrar con otra cuenta.');
    await signInWithEmailAndPassword(auth, email.trim(), password);
   }
  } catch (err) { setNotice(message(err)); }
  finally { setBusy(false); }
 }
 const input = { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 15, color: colors.ink, backgroundColor: colors.surface, fontSize: 16 };
 return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
  <Text style={s.eyebrow}>RoadGuard</Text><Text style={s.hero}>{mode === 'register' ? 'Crea tu cuenta' : mode === 'reset' ? 'Recupera tu acceso' : 'Bienvenido'}</Text>
  <Text style={s.description}>{guest ? 'Crea tu cuenta en este dispositivo para conservar tus viajes y tu suscripción actual.' : 'Accede a tu cuenta para usar RoadGuard.'}</Text>
  <Card><Text style={s.body}>Correo electrónico</Text><TextInput accessibilityLabel="Correo electrónico" style={input} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" editable={!busy} placeholder="tu@correo.com" />
  {mode !== 'reset' && <><Text style={s.body}>Contraseña</Text><TextInput accessibilityLabel="Contraseña" style={input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} editable={!busy} placeholder="Al menos 6 caracteres" /></>}
  {mode === 'register' && <><Text style={s.body}>Repite la contraseña</Text><TextInput accessibilityLabel="Repite la contraseña" style={input} value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" editable={!busy} /></>}
  {!!notice && <Text accessibilityLiveRegion="polite" style={s.description}>{notice}</Text>}
  <Button title={busy ? 'Espera…' : mode === 'register' ? 'Crear cuenta' : mode === 'reset' ? 'Enviar enlace' : 'Iniciar sesión'} disabled={busy} onPress={() => void submit()} />
  {!guest && <Button secondary disabled={busy} title={mode === 'login' ? 'Crear una cuenta' : 'Ya tengo cuenta'} onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setNotice(''); setPassword(''); setConfirmation(''); }} />}
  {mode === 'login' && <Button secondary title="Olvidé mi contraseña" disabled={busy} onPress={() => { setMode('reset'); setNotice(''); setPassword(''); }} />}
  </Card></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
export function AccountPanel({ blocked }: { blocked: boolean }) {
 const [busy, setBusy] = useState(false);
 const [notice, setNotice] = useState('');
 async function logout() {
  setBusy(true); setNotice('');
  try {
   if (blocked || await pendingTracking()) throw new Error('Finaliza o recupera tu viaje antes de cerrar sesión.');
   await disablePush();
   await signOut(getFirebaseAuth());
  } catch (err) { setNotice(message(err)); }
  finally { setBusy(false); }
 }
 return <Card><Text style={s.title}>Sesión</Text>{blocked && <Text style={s.description}>Finaliza o recupera tu viaje para cerrar sesión.</Text>}<Button secondary title={busy ? 'Cerrando sesión…' : 'Cerrar sesión'} disabled={busy || blocked} onPress={() => void logout()} />{!!notice && <Text accessibilityLiveRegion="polite" style={s.description}>{notice}</Text>}</Card>;
}
