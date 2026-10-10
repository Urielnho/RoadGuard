# Acceso con correo y contraseña

Firebase Authentication tiene habilitado Correo electrónico/contraseña.

En el dispositivo donde ya se hicieron pagos, usar Crear cuenta: se vincula el correo al usuario anónimo existente y se conserva su UID, suscripción y respaldos. No desinstalar la app ni borrar sus datos antes de registrar la cuenta.

Las instalaciones nuevas muestran Iniciar sesión y Crear una cuenta. Olvidé mi contraseña envía un enlace de Firebase al correo introducido. Las contraseñas se gestionan directamente en Firebase Auth y no pasan por el servidor de Stripe.

Mi cuenta es la tercera pestaña, junto a Inicio e Historial. Reúne el perfil, el acceso a Premium y suscripción, notificaciones y cierre de sesión al final. Cerrar sesión requiere terminar o recuperar viajes pendientes. En Android se retira primero el token push del usuario anterior; el servidor de la laptop debe estar disponible. Al entrar, visitar Mi cuenta para registrar otra vez las notificaciones autorizadas.

El historial completo de sensores sigue siendo local y queda separado por usuario. Firebase conserva resúmenes, no restaura todas las lecturas en otro teléfono. Premium se consulta de nuevo desde Firebase para cada cuenta.

Pruebas: registrar en el dispositivo original, comprobar Premium e historial, cerrar y volver a entrar con el mismo correo, probar otra cuenta sin Premium y volver a la original. Comprobar recuperación de contraseña con un correo propio.
