import { Linking } from 'react-native';
import { apiPost } from './api';

export async function openBilling(kind: 'checkout' | 'card' = 'checkout') {
  const key = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key?.startsWith('pk_test_')) throw new Error('Falta la configuración de Stripe de prueba.');
  const stripe = await import('@stripe/stripe-react-native');
  await stripe.initStripe({ publishableKey: key, urlScheme: 'roadguard' });
  const listener = Linking.addEventListener('url', ({ url }) => { void stripe.handleURLCallback(url); });
  try {
    const result = await apiPost<{ clientSecret: string; setupId?: string }>(kind === 'card' ? '/billing/card/setup' : '/billing/payment-sheet');
    const initialized = await stripe.initPaymentSheet({ merchantDisplayName: 'RoadGuard', ...(kind === 'card' ? { setupIntentClientSecret: result.clientSecret } : { paymentIntentClientSecret: result.clientSecret }), returnURL: 'roadguard://premium', allowsDelayedPaymentMethods: false, primaryButtonLabel: kind === 'card' ? 'Guardar tarjeta' : 'Suscribirme por $49.99 MXN/mes' });
    if (initialized.error) throw new Error(initialized.error.message);
    const payment = await stripe.presentPaymentSheet();
    if (payment.error?.code === 'Canceled') return false;
    if (payment.error) throw new Error(payment.error.message);
    if (kind === 'card') await apiPost('/billing/card/confirm', { setupId: result.setupId });
    return true;
    // Only the signed server webhook may grant Premium.
  } finally { listener.remove(); }
}
