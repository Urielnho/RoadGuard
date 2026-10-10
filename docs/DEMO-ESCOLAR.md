> Actualización: el emulador ya tiene instalada una compilación de desarrollo con PaymentSheet. Los APK anteriores no incluyen el formulario nativo. Para reconstruir ejecuta npx expo run:android. Mantén Metro activo con npx expo start --dev-client.

# Demostración escolar

1. Instala el APK de RoadGuard en un teléfono Android. Estado de compilación: https://expo.dev/accounts/mandinho777/projects/roadguard/builds/ca871145-0616-4305-b20c-45068a140ca6
2. En la laptop abre Iniciar-RoadGuard.cmd y espera DEMOSTRACIÓN LISTA. No abras dos copias.
3. Mantén la laptop encendida, conectada a Internet y sin suspenderse. El teléfono también necesita Internet.
4. Abre Premium y prueba Stripe con 4242 4242 4242 4242, fecha futura y CVC de prueba. No uses una tarjeta real.
5. Con el APK actualizado de FCM directo, activa las notificaciones en Premium, pulsa Enviar push de prueba y bloquea el teléfono.
6. Para GPS en segundo plano, concede el permiso de ubicación solicitado e inicia un viaje. No equivale a detectar accidentes con la app cerrada.
7. Cierra el servidor con Ctrl+C al terminar.

El túnel cambia de dirección al reiniciarse; la app la consulta en Firebase, sin reinstalar. Si la laptop deja de responder, la app no podrá confirmar nuevos pagos ni enviar notificaciones. Firebase conserva los datos y Stripe conserva el estado de suscripciones.

Al terminar definitivamente el proyecto, revoca las claves de cuentas de servicio y deshabilita el webhook escolar de Stripe. No se cambia automáticamente el plan Spark.
