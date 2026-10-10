# Configuración inicial de Firebase

## Estado

Firestore está integrado con acceso anónimo persistente. Al abrir la app y finalizar viajes, se respaldan resúmenes de los viajes locales reales. SQLite y el almacenamiento web conservan las muestras y eventos detallados. Stripe y push son integraciones separadas. Falta validar contra el proyecto real después de publicar las reglas.

## Crear el proyecto

1. Abre https://console.firebase.google.com/ e inicia sesión.
2. Crea un proyecto llamado RoadGuard. Puedes desactivar Google Analytics para esta configuración inicial.
3. Mantén el plan gratuito Spark; esta configuración de Firestore no necesita activar Blaze.
4. En Configuración del proyecto → General → Tus apps, registra una aplicación **web** (`</>`) llamada `RoadGuard Expo`. No actives Hosting. Usamos el SDK JavaScript, también para Android/iOS.
5. Copia el objeto `firebaseConfig` mostrado por Firebase. No necesitas una cuenta de servicio ni una clave privada.
6. En Compilación/Build → Firestore Database crea una base de datos Standard, con identificador `(default)`, en modo producción. Revisa la región antes de confirmar: elige una cercana a tus usuarios y conserva la ubicación elegida.
7. En Seguridad → Authentication → Método de acceso habilita Anónimo.
8. En Firestore → Reglas publica el contenido completo de `firestore.rules`. Permite resúmenes válidos únicamente bajo el UID del usuario autenticado. Bloquea otras rutas, eliminaciones y campos adicionales. No uses reglas públicas ni modo de prueba.

## Configuración local

Copia `.env.example` a `.env` en la raíz y completa la correspondencia:

| Propiedad firebaseConfig | Variable en .env |
| --- | --- |
| apiKey | EXPO_PUBLIC_FIREBASE_API_KEY |
| authDomain | EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN |
| projectId | EXPO_PUBLIC_FIREBASE_PROJECT_ID |
| storageBucket | EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET |
| messagingSenderId | EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID |
| appId | EXPO_PUBLIC_FIREBASE_APP_ID |

No inventes valores ni incluyas las llaves del objeto JavaScript en `.env`. No hace falta `measurementId`. La configuración de `storageBucket` no habilita la subida de fotos.

Reinicia Expo con `npm start -- --clear` después de completar el archivo. `.env` está excluido de Git, aunque los valores EXPO_PUBLIC se incluyen en la app y no son secretos. Las reglas y la autenticación protegen los datos.

## Siguiente fase y comprobación

1. Inicia la app y abre Historial. El panel debe confirmar acceso y, después de guardar un viaje real, respaldo de resúmenes.
2. En Authentication → Usuarios debe aparecer el usuario anónimo. En Firestore → Datos aparecerá `users/{uid}/trips/{tripId}` (no es necesario que el documento padre `users/{uid}` tenga campos).
3. Comprueba que distancia y riesgo coinciden con el viaje local. Solo se envían versión, ID, vehículo, inicio, fin, distancia, riesgo medio y conteos. No se envían coordenadas, fotos ni permisos Premium.
4. Reinicia la app y verifica que el UID no cambia. Al borrar los datos de la app o desinstalarla se puede perder el acceso a esa cuenta: antes de ofrecer recuperación entre dispositivos hay que vincularla con un método de login.
5. Guarda un viaje sin Internet. Debe quedar localmente; al recuperar conexión el SDK reintenta las escrituras pendientes. Al reabrir la app o pulsar Reintentar respaldo se revisan los viajes no confirmados. La confirmación local se guarda solo después del acuse del servidor y evita volver a subir los mismos resúmenes.
6. El panel escucha hasta 20 resúmenes recientes; el número mostrado no es el total de toda la cuenta. La escucha no descarga ni restaura las muestras al historial local.
7. En el simulador de reglas verifica: usuario A puede leer/escribir un resumen válido bajo su UID; usuario B y visitantes sin sesión no pueden; campos adicionales (por ejemplo premiumDemo), riesgo >100 o fechas invertidas se rechazan. Las reglas preparadas aún no se han probado contra un emulador ni publicado desde este entorno.

La sesión móvil usa `expo-sqlite/kv-store`; web utiliza la persistencia de Firebase Auth en el navegador. Las reglas no permiten que un usuario se conceda Premium. Las preferencias y la demostración de pago siguen siendo locales.

## Referencias

- https://docs.expo.dev/guides/using-firebase/
- https://firebase.google.com/docs/web/setup
- https://firebase.google.com/docs/firestore/security/get-started
