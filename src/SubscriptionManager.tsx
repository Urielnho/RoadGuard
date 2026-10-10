import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { apiPost } from './api';
import { openBilling } from './billingClient';
import { Button, Card, useStyles, ValueRow } from './ui';

type Details = { status: string; cancelAtPeriodEnd: boolean; periodEnd: number | null; canManage: boolean; card: { brand: string; last4: string; expMonth: number; expYear: number } | null };
const labels: Record<string, string> = { active: 'Activa', trialing: 'En prueba', past_due: 'Pago pendiente', unpaid: 'Pago pendiente', incomplete: 'Pago sin completar', incomplete_expired: 'Pago vencido', canceled: 'Cancelada', paused: 'Pausada' };
export function SubscriptionManager({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const s = useStyles();
  const [details, setDetails] = useState<Details | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try { setDetails(await apiPost<Details>('/billing/manage')); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo consultar tu suscripción.'); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => {
    let active = true;
    void apiPost<Details>('/billing/manage').then(data => { if (active) setDetails(data); }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'No se pudo consultar tu suscripción.'); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);
  async function renewal(cancelAtPeriodEnd: boolean) {
    setBusy(true); setError(''); setMessage('');
    try { setDetails(await apiPost<Details>('/billing/cancel', { cancelAtPeriodEnd })); setConfirmCancel(false); setMessage(cancelAtPeriodEnd ? 'Cancelación programada. Conservas Premium hasta la fecha indicada.' : 'Tu suscripción volverá a renovarse automáticamente.'); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar la suscripción.'); }
    finally { setBusy(false); }
  }
  async function card() {
    setBusy(true); setError(''); setMessage('');
    try { if (await openBilling('card')) { setDetails(await apiPost<Details>('/billing/manage')); setMessage('Tarjeta actualizada para los próximos cobros.'); } }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cambiar la tarjeta.'); }
    finally { setBusy(false); }
  }
  return <>
    <Button title="Volver a Premium" secondary disabled={busy} onPress={onClose} />
    <Card><Text style={s.title}>Mi suscripción</Text><Text style={s.muted}>RoadGuard Premium · $49.99 MXN/mes · Prueba</Text>
      {busy && <Text accessibilityLiveRegion="polite" style={s.muted}>Actualizando…</Text>}
      {details && <>
        <ValueRow label="Estado" value={labels[details.status] || details.status} />
        {!!details.periodEnd && <ValueRow label={details.status === 'canceled' ? 'Fin del período' : details.cancelAtPeriodEnd ? 'Disponible hasta' : 'Fin del período / renovación'} value={new Date(details.periodEnd).toLocaleDateString('es-MX')} />}
        <ValueRow label="Tarjeta" value={details.card ? details.card.brand + ' •••• ' + details.card.last4 : 'Sin tarjeta guardada'} />
        {details.canManage && <>
          <Button title="Cambiar tarjeta" disabled={busy} onPress={() => void card()} />
          {confirmCancel ? <><Text style={s.notice}>¿Cancelar la renovación? No habrá un nuevo cobro y conservarás Premium hasta finalizar el período actual.</Text><Button title="Sí, cancelar renovación" disabled={busy} onPress={() => void renewal(true)} /><Button title="Mantener mi suscripción" secondary disabled={busy} onPress={() => setConfirmCancel(false)} /></> : details.cancelAtPeriodEnd ? <><Text style={s.notice}>La renovación está cancelada.</Text><Button title="Reactivar renovación mensual" secondary disabled={busy} onPress={() => void renewal(false)} /></> : <Button title="Cancelar renovación" secondary disabled={busy} onPress={() => setConfirmCancel(true)} />}
        </>}
      </>}
      {!!message && <Text accessibilityLiveRegion="polite" style={s.description}>{message}</Text>}
      {!!error && <><Text accessibilityRole="alert" style={s.notice}>{error}</Text><Button title="Reintentar consulta" secondary disabled={busy} onPress={() => void load()} /></>}
      <Text style={s.footnote}>La tarjeta se captura de forma segura con Stripe. No se cobra dinero real en esta versión de prueba.</Text>
    </Card>
  </>;
}
