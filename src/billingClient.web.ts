import * as WebBrowser from 'expo-web-browser';
import { apiPost } from './api';

export async function openBilling(kind: 'checkout' | 'card' = 'checkout') {
  if (kind === 'card') throw new Error('Cambia la tarjeta desde la app Android.');
  const result = await apiPost<{ url: string }>(`/billing/${kind}`);
  const url = new URL(result.url);
  const expected = 'checkout.stripe.com';
  if (url.protocol !== 'https:' || url.hostname !== expected) throw new Error('El servidor devolvió un enlace de pago inválido.');
  await WebBrowser.openBrowserAsync(result.url);
  return true;
}
