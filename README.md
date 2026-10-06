# RoadGuard

Aplicación académica de monitoreo de riesgo vial con React Native, Expo y TypeScript. Android e iPhone comparten el proyecto. Interfaz minimalista en español, con seguimiento de viajes, reglas explicables e historial local. Repositorio privado: https://github.com/Urielnho/RoadGuard.

La versión 1.0 cubre el flujo de viaje completo. Consulta [la guía de entrega](docs/ENTREGA.md) para presentar el proyecto y distinguir las funciones implementadas de las integraciones pendientes.

## Ejecutar

Requisitos: Node.js 24, npm y Expo Go compatible con **SDK 57**.

```sh
npm ci
npm start
```

En iPhone: instala Expo Go, conecta computadora y teléfono a la misma red y abre el QR con Cámara. Autoriza ubicación y movimiento. Si la red bloquea la conexión, prueba `npx expo start --tunnel`.

En Android Studio: inicia un dispositivo virtual desde Device Manager y ejecuta `npm run android`. El emulador sirve para revisar pantallas y flujos; las pruebas de sensores deben realizarse en un teléfono físico. Android Studio no es necesario para Expo Go en iPhone. Para generar más adelante un proyecto Android nativo: `npx expo prebuild --platform android`, y abrir la carpeta `android`.

Si Expo Go indica una versión incompatible, revisa su SDK antes de cambiar dependencias; no mezcles versiones de módulos Expo.

## Implementado

- Dashboard y selección de automóvil, motocicleta o bicicleta.
- Preparación, disponibilidad de sensores y calibración respecto a la posición inicial.
- GPS real en primer plano, acelerómetro, giroscopio, magnetómetro y barómetro.
- Monitoreo por segundo, riesgo de 0 a 100 y explicación de cada regla.
- Cuenta regresiva de 10 segundos para posible accidente experimental.
- Resumen e historial persistente en SQLite, incluyendo lecturas y eventos.
- Modo de demostración separado: todos sus datos son simulados, distancia no generada y estadísticas reales excluyen esos viajes.

## Demostración segura

1. Activa el modo de demostración, selecciona vehículo y prepara el viaje.
2. Calibra e inicia. Espera a que aparezcan 25 km/h.
3. Activa la frenada; observa la regla y el evento.
4. Espera a volver a 25 km/h; activa el posible accidente.
5. Confirma “Estoy bien” o deja terminar la cuenta. Solo se genera una alerta en pantalla; no se envían mensajes.
6. Finaliza y revisa el historial. Cierra y vuelve a abrir la aplicación para comprobar persistencia.
7. Desactiva la simulación para probar sensores reales, quieto y al aire libre para obtener GPS. No provoques accidentes o maniobras peligrosas.

Los escenarios están en “Probar escenarios”, dentro del viaje. “Lecturas de sensores” y “Explicación del riesgo” permiten consultar los detalles sin saturar la pantalla. Las restricciones del proyecto están accesibles desde “Acerca de”.

Para revisar la interfaz en el navegador: `npm run web`. Esa vista usa almacenamiento local del navegador; Android e iOS usan SQLite. Las pruebas de sensores de la entrega deben hacerse en dispositivos físicos.

## Arquitectura y reglas

`src/app/`: rutas de Expo Router. `App.tsx`: controlador persistente del viaje y presentación compartida mediante contexto. `src/ui.tsx`: tema visual y componentes reutilizables. `src/useSensors.ts`: permisos, suscripciones y normalización. `src/domain.ts`: tipos, reglas y distancia. `src/storage.ts`: SQLite en móviles. `src/storage.web.ts`: persistencia de la vista de revisión web. `tests/domain.test.ts`: pruebas del motor de riesgo.

Los umbrales son académicos y no están validados como sistema de seguridad ni representan límites legales. El riesgo es la suma de reglas activas, limitada a 100: velocidad +35, frenada +30, aceleración GPS +25, movimiento +20, giro del teléfono +20, inclinación +20, combinación de posible accidente +80. Rangos: 0–39 bajo, 40–69 moderado, 70–100 alto. Eventos del mismo tipo se guardan como máximo cada 10 segundos para evitar duplicados; la puntuación sí se recalcula cada segundo.

La aceleración del sensor se procesa con un filtro de gravedad y conserva el pico de cada segundo; no distingue por sí sola frenada de aceleración. Esas dos reglas usan el cambio de velocidad GPS. La inclinación es el ángulo entre la gravedad filtrada actual y la calibrada. La dirección del magnetómetro es aproximada, depende de la posición y no compensa inclinación. El barómetro muestra presión en hPa; la altitud mostrada proviene del GPS. La pendiente y la altitud barométrica aún no se calculan.

Se rechaza GPS con precisión peor que 35 metros y se invalidan coordenadas/velocidad después de 5 segundos sin lectura válida. La distancia descarta desplazamientos menores de 3 metros y saltos superiores a 60 m/s; puede subestimar viajes lentos. Datos ausentes aparecen como “—”. La heurística de accidente exige impacto >18 m/s², inclinación sobre umbral, velocidad previa >15 km/h y actual <5 km/h entre muestras de hasta 5 segundos. No es detección fiable de accidentes.

El historial es local y no cifra recorridos. Los viajes se guardan al finalizar; cerrar forzosamente la app antes de guardar pierde el viaje activo. En segundo plano se omiten muestras y no se garantiza monitoreo; vuelve al primer plano para continuar. Duración incluye esas pausas; promedio de riesgo solo incluye muestras monitoreadas.

## Pendiente

Login real, sincronización con servidor, contacto y envío real de emergencia, notificaciones push, Premium y pagos, reportes, pendientes y detección específica de caídas. Push y compras reales requieren una compilación de desarrollo; esta entrega no los simula como integraciones reales.

## Verificar

```sh
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

Referencias: [sensores](https://docs.expo.dev/versions/latest/sdk/sensors/), [ubicación](https://docs.expo.dev/versions/latest/sdk/location/), [SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/).
