import { useEffect, useState } from 'react';
import { AppState, Text } from 'react-native';
import { enablePush, testPush } from './push';
import { Button, Card, useStyles } from './ui';

export function NotificationSettings() {
  const s = useStyles();
  const [message, setMessage] = useState('Recibe avisos de tu suscripción y comprueba las notificaciones push.');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    // Refresh registration after restart/foreground without prompting for permission.
    const refresh = () => { void enablePush(false).catch(() => {}); };
    refresh();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => listener.remove();
  }, []);
  async function run(test: boolean) {
    setBusy(true);
    try {
      if (test) await testPush(); else await enablePush();
      setMessage(test ? 'Prueba en cola. Bloquea la pantalla; el servidor intentará enviarla en unos 15–30 segundos.' : 'Dispositivo registrado para recibir notificaciones.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudieron activar las notificaciones.'); }
    finally { setBusy(false); }
  }
  return <Card><Text style={s.title}>Notificaciones push</Text><Text accessibilityLiveRegion="polite" style={s.description}>{message}</Text><Button title="Activar notificaciones" disabled={busy} onPress={() => void run(false)} /><Button title="Enviar push de prueba" secondary disabled={busy} onPress={() => void run(true)} /></Card>;
}
