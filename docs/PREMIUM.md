# RoadGuard Premium

## Alcance actual

Pantalla informativa accesible desde “Hazte Premium” en Inicio y la pestaña Premium. Plan mensual de referencia: **$49.99 MXN / mes**. Beneficios previstos: análisis avanzado, detección avanzada de señales de posibles accidentes, notificaciones y contactos, historial y reportes.

Los beneficios se presentan como próximos. No hay pago, activación ficticia de suscripción, restricciones nuevas del plan gratuito ni datos simulados. No se añadió login ni registro: por instrucción del usuario, se implementarán al final.

## Pago propuesto para el examen

Usar **Stripe Checkout en modo de prueba**, con página alojada por Stripe que se abre en el navegador del teléfono. La propuesta evita depender de una interfaz nativa de cobro para la demostración con Expo Go. Esta integración todavía no está implementada.

Al integrar: un servidor crea la sesión de Checkout con un precio mensual en MXN, guarda la referencia de la suscripción y verifica webhooks firmados de Stripe. Las claves secretas solo viven en el servidor. Volver desde Checkout no debe activar Premium por sí solo. El backend verificará el pago y el derecho a Premium; la vinculación con la cuenta se añadirá junto con el login al final.

## Si se publica en tiendas

RoadGuard Premium desbloquea funciones digitales dentro de la app. La opción habitual es **In-App Purchase / StoreKit en iOS** y **Google Play Billing en Android**. Existen excepciones y programas de pago alternativo según país, tienda y elegibilidad. Usar Stripe para el examen no implica que el mismo flujo sea válido para publicar en cualquier región; revisar estas condiciones antes de distribución.

Fuentes oficiales:

- [Stripe: suscripciones con Checkout](https://docs.stripe.com/billing/subscriptions/build-subscriptions?payment-ui=checkout&ui=stripe-hosted)
- [Stripe: entornos de prueba](https://docs.stripe.com/testing)
- [Apple: App Review Guidelines, sección 3.1](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase)
- [Google Play: política de pagos](https://support.google.com/googleplay/android-developer/answer/9858738?hl=es)
