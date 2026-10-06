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
- Datos exclusivamente reales: sin generadores de datos ni botones de simulación. El historial omite recorridos simulados de versiones anteriores.
- Premium con pago simulado, foto y nombre de perfil, colores, nombres de vehículos, estadísticas reales, recomendaciones y reporte compartible. Sin login ni cobros; [alcance e integración futura con Stripe](docs/PREMIUM.md).

## Prueba con sensores reales

1. Ejecuta `npm start` y abre el QR con Expo Go en el teléfono físico.
2. Selecciona vehículo y abre “Preparar viaje”. Autoriza ubicación y movimiento.
3. Comprueba el estado de los sensores. Un sensor disponible no muestra valores hasta recibir una lectura.
4. Deja el teléfono quieto, calibra e inicia el viaje.
5. Las lecturas se muestran directamente en “Sensores en tiempo real” y se actualizan automáticamente cada segundo.
6. Cambia suavemente la orientación para observar inclinación, rotación y dirección. Prueba GPS al aire libre, sin realizar maniobras peligrosas.
7. Finaliza para guardar y abre el historial. No se generan velocidades, impactos ni eventos artificiales.

Los sensores de movimiento solicitan actualizaciones cada 100 ms. GPS y barómetro dependen de la frecuencia que entregue el sistema operativo. La pantalla utiliza las últimas lecturas válidas; los datos faltantes o caducados muestran “—”.

Para revisar la interfaz en el navegador: `npm run web`. Esa vista usa almacenamiento local del navegador; Android e iOS usan SQLite. No hay modo simulado tampoco en la vista web: si no existen sensores o permisos, no habrá lecturas ni se podrá calibrar.

## Arquitectura y reglas

`src/app/`: rutas de Expo Router. `App.tsx`: controlador persistente del viaje y presentación compartida mediante contexto. `src/ui.tsx`: tema visual y componentes reutilizables. `src/useSensors.ts`: permisos, suscripciones y normalización. `src/domain.ts`: tipos, reglas y distancia. `src/storage.ts`: SQLite en móviles. `src/storage.web.ts`: persistencia de la vista de revisión web. `tests/domain.test.ts`: pruebas del motor de riesgo.

Los umbrales son académicos y no están validados como sistema de seguridad ni representan límites legales. El riesgo es la suma de reglas activas, limitada a 100: velocidad +35, frenada +30, aceleración GPS +25, movimiento +20, giro del teléfono +20, inclinación +20, combinación de posible accidente +80. Rangos: 0–39 bajo, 40–69 moderado, 70–100 alto. Eventos del mismo tipo se guardan como máximo cada 10 segundos para evitar duplicados; la puntuación sí se recalcula cada segundo.

La aceleración del sensor se procesa con un filtro de gravedad y conserva el pico de cada segundo; no distingue por sí sola frenada de aceleración. Esas dos reglas usan el cambio de velocidad GPS. La inclinación es el ángulo entre la gravedad filtrada actual y la calibrada. La dirección del magnetómetro es aproximada, depende de la posición y no compensa inclinación. El barómetro muestra presión en hPa; la altitud mostrada proviene del GPS. La pendiente y la altitud barométrica aún no se calculan.

Se rechaza GPS con precisión peor que 35 metros y se invalidan coordenadas/velocidad después de 5 segundos sin lectura válida. La distancia descarta desplazamientos menores de 3 metros y saltos superiores a 60 m/s; puede subestimar viajes lentos. Datos ausentes aparecen como “—”. Acelerómetro, giroscopio y magnetómetro caducan a los 3 segundos sin datos nuevos; presión a los 10 segundos. Después de tomar una muestra, los picos de movimiento se vacían hasta que llegue otra lectura real, sin sustituirlos por cero. Distancia y riesgo promedio quedan sin datos si no hubo lecturas suficientes. La heurística de accidente exige impacto >18 m/s², inclinación sobre umbral, velocidad previa >15 km/h y actual <5 km/h entre muestras de hasta 5 segundos. No es detección fiable de accidentes.

El historial es local y no cifra recorridos. Los viajes se guardan al finalizar; cerrar forzosamente la app antes de guardar pierde el viaje activo. En segundo plano se omiten muestras y no se garantiza monitoreo; vuelve al primer plano para continuar. Duración incluye esas pausas; promedio de riesgo solo incluye muestras monitoreadas.

## Pendiente

Login real, sincronización con servidor, contacto y envío real de emergencia, notificaciones push, pagos reales, pendientes y detección específica de caídas. Push y compras reales requieren una compilación de desarrollo. El pago Premium actual es una demostración local sin conexión con proveedores de pago.

## Verificar

```sh
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

Referencias: [sensores](https://docs.expo.dev/versions/latest/sdk/sensors/), [ubicación](https://docs.expo.dev/versions/latest/sdk/location/), [SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/).
