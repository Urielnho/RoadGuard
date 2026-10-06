# RoadGuard Premium

## Alcance actual

Pantalla accesible desde “Hazte Premium” en Inicio y la pestaña Premium. Plan mensual de referencia: **$49.99 MXN / mes**. El pago es una simulación local solicitada para el examen: elegir tarjeta o billetera demo, confirmar y ver la activación. No se piden datos bancarios ni se conecta con Stripe, Apple Pay o Google Pay.

La activación desbloquea foto de galería, nombre de perfil, tres colores de acento, nombres por vehículo, estadísticas de viajes guardados, comparación del riesgo de los dos últimos viajes con datos, eventos frecuentes, recomendaciones y reporte compartible. La foto se copia al almacenamiento privado en Android/iOS; las preferencias y activación se guardan en SQLite. La vista web usa almacenamiento local del navegador. Se puede volver al plan gratuito conservando los datos. No hay login: se implementará al final.

Solo se simula el pago. Los sensores siguen usando lecturas reales. Las estadísticas no incluyen viajes simulados; muestran datos ausentes con “—”. El riesgo agregado es la media de las medias por viaje, no una probabilidad de accidente. Alertas a contactos y notificaciones push siguen pendientes.

Para probar: Premium → Probar Premium → elegir método demo → Confirmar pago simulado → Explorar mi Premium. Cambiar nombre, foto, color y vehículo; volver a Inicio y reiniciar para comprobar persistencia. Completar viajes reales para habilitar estadísticas y compartir reportes. La selección de foto y la hoja de compartir requieren verificación en un teléfono físico.

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
