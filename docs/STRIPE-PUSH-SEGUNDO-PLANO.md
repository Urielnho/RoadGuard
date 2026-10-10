# Stripe de prueba, push y GPS en segundo plano

## Estado real

Se conserva Expo/React Native. No se ha reescrito la app en Android Studio. Se prepararon compilaciones EAS de desarrollo y APK de prueba en `eas.json`.

- Stripe móvil: PaymentSheet nativo dentro de RoadGuard para 49.99 MXN/mes de prueba. El servidor crea una suscripción default_incomplete, devuelve únicamente su PaymentIntent client_secret al usuario autenticado y reutiliza la suscripción pendiente al reintentar. La app envía la tarjeta directamente a Stripe. Premium sigue dependiendo del webhook firmado. Web conserva Checkout alojado; Administrar suscripción muestra una pantalla interna con estado, fecha, tarjeta, cambio de tarjeta mediante SetupIntent y cancelación al final del período. Se verificaron creación de PaymentIntent y reintento sin duplicados sin realizar cobros.
- Premium: lo concede exclusivamente el documento `users/{uid}/billing/subscription`, escrito por el webhook firmado de Stripe. El antiguo booleano de demostración ya no otorga acceso. Cancelaciones y estados impagados se reflejan desde Stripe. El portal permite gestionar la suscripción.
- Push Android: token nativo FCM obtenido con getDevicePushTokenAsync. La laptop envía directamente con Firebase Admin; Expo no recibe la clave ni procesa avisos. La cola y las aceptaciones de FCM quedan en Firestore; aceptación no demuestra entrega al teléfono. Tokens caducados se eliminan y fallos temporales se reintentan.
- Segundo plano: registro GPS con TaskManager/Location, servicio visible en Android y permiso Siempre en iOS. Las muestras se guardan localmente; al finalizar se combinan con las de primer plano. Al abrir tras una interrupción se ofrece guardar el viaje recuperado. Se rechazan GPS imprecisos y se preservan sensores ausentes como null.
- **No se garantiza acelerómetro, giroscopio ni detección de accidentes en segundo plano.** La evaluación completa necesita la app visible. GPS tampoco sobrevive garantizadamente a cierre forzado, restricciones del fabricante o batería.
- Configurado: acceso Firebase Admin verificado, reglas de suscripciones publicadas, app Android registrada en Firebase y `google-services.json` descargado. Proyecto EAS vinculado: `@mandinho777/roadguard` (`e46da8ca-794e-4a56-b6de-dc646bf3577c`).
- Servidor escolar: probado en la laptop con túnel HTTPS. Stripe Checkout y portal de gestión verificados mediante un usuario temporal (eliminado al terminar); no se hicieron cobros. El arranque es `Iniciar-RoadGuard.cmd`. La app obtiene la dirección vigente de `appConfig/schoolServer`, que solo el servidor puede escribir.
- Pendiente: instalar el APK con FCM directo y comprobar recepción y GPS en teléfono. Firebase ya validó permisos de envío en dry-run, sin enviar avisos. No se necesita crear ni subir una clave a Expo.

## 1. Servidor externo sin cambiar Firebase Spark

`server/` es una aplicación Node independiente y tiene un Dockerfile. Mantén **una instancia siempre encendida** para procesar la cola; no usa Cloud Functions. En desarrollo puede correr en tu computadora. Al subirlo a un proveedor, usa su almacenamiento de secretos, monta las credenciales como archivo privado y utiliza HTTPS.

El uso de Admin SDK y de la cola sigue consumiendo cuota de Firestore. No se ha activado Blaze ni contratado un servidor.

La credencial Admin local ya está configurada. Debe reemplazarse por una nueva antes del despliegue porque se compartió en el chat. Los pasos siguientes documentan cómo configurar otro entorno; no es necesario repetir el registro de Android ni publicar de nuevo las reglas actuales.

1. Firebase → Configuración del proyecto → Cuentas de servicio → Firebase Admin SDK → Generar nueva clave privada.
2. Guarda el JSON fuera de la carpeta pública/repositorio. **No lo pegues en chats ni lo pongas en la app.** En `server/.env`, indica su ruta absoluta en `GOOGLE_APPLICATION_CREDENTIALS`.
3. Define `PUBLIC_BASE_URL` con la URL HTTPS del servidor. Configura `ALLOWED_ORIGINS` con los orígenes exactos de la app web; los clientes móviles se autentican con token y no necesitan CORS.
4. Desde la carpeta `server`, ejecuta `npm ci` y `npm start`. En un servidor con variables de entorno administradas puedes ejecutar `node index.mjs` directamente.
5. En `.env` de la app configura `EXPO_PUBLIC_API_URL` con la misma URL del servidor, sin barra final, y reinicia Expo. En un teléfono, localhost apunta al teléfono, no a tu computadora. Para pruebas desde teléfono usa una URL HTTPS que pueda alcanzar.

La credencial Admin es privada y puede acceder al proyecto. El servidor comprueba los ID tokens de Firebase; las reglas de Firestore impiden que la app escriba sus propios derechos Premium o tokens de otros usuarios. No habilites reglas abiertas.

## 2. Stripe

1. Usa modo de prueba en Stripe. La clave proporcionada ya quedó en `server/.env` sin el punto de puntuación final. Nunca copies `STRIPE_SECRET_KEY` a variables EXPO_PUBLIC.
2. Crea un destino webhook hacia `https://TU_SERVIDOR/stripe/webhook` y suscribe `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` y `customer.subscription.deleted`.
3. Guarda el secreto de firma `whsec_...` en `STRIPE_WEBHOOK_SECRET` del servidor y reinícialo. Es distinto de la clave API y no se puede deducir de ella.
4. Para pruebas con servidor local y Stripe CLI: `stripe listen --forward-to localhost:3001/stripe/webhook`. Usa el secreto que imprime esa sesión de CLI; el secreto del Dashboard no sustituye al de la CLI.
5. Activa y configura el portal de clientes de prueba en Stripe para permitir gestionar y cancelar suscripciones.
6. Publica el contenido actualizado de `firestore.rules`: incluye lectura propia de `users/{uid}/billing/subscription`, pero nunca escritura desde el cliente.
7. Abre Premium → Suscribirme con Stripe. Usa tarjeta de prueba `4242 4242 4242 4242`, una fecha futura y un CVC de prueba. Vuelve a la app. Debe habilitarse únicamente después de que el webhook actualice Firestore.
8. Comprueba pago cancelado/rechazado, doble pulsación, webhook repetido, firma incorrecta, cancelación de suscripción y pérdida de red. La cuenta anónima depende de esta instalación; se necesita vincular una cuenta recuperable antes de usar cobros reales.

El código rechaza claves y eventos live. No se ha hecho ningún cargo ni creado una suscripción al configurar esta integración. Para distribuir Premium digital en tiendas debe revisarse la vía de facturación permitida antes de cambiar a producción.

Checkout permanece bloqueado mientras falte `STRIPE_WEBHOOK_SECRET`, para evitar iniciar pagos sin poder confirmar su resultado.

## 3. Android, Expo EAS y push

1. En Firebase registra una app **Android** con el paquete exacto `com.urielnho.roadguard`.
2. Descarga `google-services.json` y guárdalo en la raíz del proyecto. `app.config.js` lo incorpora si existe; está excluido de Git. La aplicación web registrada antes sigue sirviendo para Auth/Firestore.
3. Inicia sesión en Expo: `npx eas-cli@latest login`. Vincula este proyecto con `npx eas-cli@latest init`. Guarda el UUID de EAS en `EXPO_PUBLIC_EAS_PROJECT_ID` (no es el ID de Firebase). El archivo de configuración conserva el valor de `extra.eas` si EAS lo añadió directamente.
4. La credencial Firebase Admin permanece en la laptop. No ejecutes la configuración FCM de Expo ni subas claves privadas a EAS. Android utiliza google-services.json, que solo contiene configuración pública.
5. Publica en EAS las variables públicas de Firebase, API y EAS para la compilación. `.env` es local y está ignorado; no supongas que estará presente en una compilación remota. Asegura que `google-services.json` se incluye de forma privada en el archivo de compilación (por ejemplo mediante una variable EAS de tipo archivo y `GOOGLE_SERVICES_JSON`).
6. Compila: `npx eas-cli@latest build --profile development --platform android`. Instala el APK en el teléfono y arranca Metro con `npx expo start --dev-client`.
7. Para un APK de prueba que arranque sin Metro, usa el perfil `preview`.
8. Premium → Activar notificaciones → Enviar push de prueba. Bloquea el teléfono. El servidor programa el intento para unos 15–30 segundos después. Verifica notificación y también `pushReceipts`/`pushFailures` en el servidor. Repite con app cerrada normalmente y prueba permisos denegados.

Las notificaciones directas están habilitadas únicamente para Android. Para iPhone se requiere implementar el envío APNs, una compilación propia y credenciales Apple/APNs; no se ha firmado ninguna compilación iOS desde este equipo. No hace falta reescribir la app para Android Studio; se puede usar como herramienta local si se desea, pero EAS compila en la nube.

## 4. Viajes y segundo plano

1. En la compilación móvil, prepara y calibra un viaje.
2. Pulsa Activar GPS en segundo plano y concede ubicación permanente cuando el sistema la pida. En Android puede abrir Ajustes.
3. Inicia el viaje. Android debe mostrar la notificación persistente del servicio.
4. Bloquea el teléfono, realiza un recorrido seguro y vuelve a la app. Finaliza y revisa las muestras/distancia del resumen; la pantalla en vivo solo muestra las muestras de primer plano.
5. Comprueba que al finalizar desaparece el servicio y no se registran nuevas ubicaciones.
6. Si el proceso se interrumpe, abre la app y usa Guardar viaje recuperado. Solo se recuperan muestras realmente persistidas; no se inventa el tramo perdido.

Los callbacks GPS se solicitan aproximadamente cada 5 segundos/3 metros; el sistema decide la cadencia real. La distancia omite segmentos separados más de 30 segundos y saltos >60 m/s. El riesgo medio sigue siendo por muestra, y las muestras de segundo plano son parciales (solo GPS).

## Referencias

- https://docs.expo.dev/versions/v57.0.0/sdk/notifications/
- https://docs.expo.dev/versions/v57.0.0/sdk/location/
- https://docs.expo.dev/push-notifications/fcm-credentials/
- https://docs.expo.dev/push-notifications/sending-notifications/
- https://docs.stripe.com/webhooks
- https://docs.stripe.com/api/checkout/sessions/create

## Administración integrada

En Android, Administrar suscripción ya no abre el navegador. El servidor valida el propietario de la suscripción y del SetupIntent antes de cambiar la tarjeta. La cancelación requiere confirmación en pantalla y conserva el período vigente. Se probó con una suscripción temporal de Stripe TEST: consulta, cambio de tarjeta, cancelación programada y reactivación; después se limpió el cliente temporal.

El estado Premium se escucha automáticamente en Firebase. El botón de comprobación manual se eliminó. El respaldo reintenta a los 30 segundos ante errores mientras la app está activa y al volver a primer plano; Reintentar respaldo solo aparece ante un error o conexión pendiente.
