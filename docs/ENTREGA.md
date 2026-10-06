# RoadGuard · Guía de entrega

## Objetivo

Monitorear un viaje en automóvil, motocicleta o bicicleta y mostrar señales de riesgo calculadas con reglas claras, usando los sensores del teléfono. La versión académica 1.0 incluye preparación, calibración, seguimiento, alerta visual, resumen e historial.

## Flujo de uso

1. **Inicio:** elegir vehículo. Los viajes reales usan los sensores del dispositivo; la demostración se activa con su interruptor.
2. **Preparación:** fijar el teléfono, revisar sensores y calibrar. El botón para iniciar se habilita tras la calibración.
3. **Viaje:** consultar el índice de riesgo, velocidad y distancia. Los paneles desplegables muestran lecturas y el motivo de cada regla.
4. **Alerta:** confirmar “Estoy bien” ante una combinación de señales anómalas. La cuenta termina en una alerta local.
5. **Resumen:** revisar duración, distancia, riesgo promedio y eventos. Los viajes se guardan al finalizar.
6. **Historial:** abrir los recorridos guardados en el mismo dispositivo.

## Funciones y evidencia

| Función | Implementación |
| --- | --- |
| GPS | Velocidad, ubicación, altitud y distancia estimada, con filtro de precisión |
| Acelerómetro | Pico de movimiento sin gravedad estimado por filtro; inclinación relativa a la calibración |
| Giroscopio | Magnitud de la velocidad angular y movimientos bruscos |
| Magnetómetro | Dirección magnética aproximada del teléfono |
| Barómetro | Lectura real de presión en hPa |
| Índice de riesgo | Suma de reglas por vehículo, entre 0 y 100, con explicación consultable |
| Posible accidente | Heurística experimental que combina impacto, inclinación y caída de velocidad |
| Alerta | Pantalla de confirmación y cuenta de 10 segundos; exclusivamente local |
| Base de datos | SQLite en Android e iOS: viajes, lecturas y eventos persistidos al finalizar |
| Demostración | Datos simulados identificados durante el recorrido y en su historial |
| Interfaz | Tema claro, navegación Inicio/Historial, estados vacíos y detalles desplegables |

## Guion para exposición (3–5 minutos)

- Presentar el problema: convertir sensores disponibles en señales comprensibles durante un recorrido.
- Seleccionar automóvil y activar demostración. Preparar y calibrar.
- Iniciar y esperar a ver 25 km/h. Abrir “Lecturas de sensores” para mostrar las unidades.
- Abrir “Probar escenarios” y simular frenada. Explicar que el evento usa el cambio de velocidad GPS.
- Esperar a recuperar 25 km/h y simular posible accidente. Mostrar “¿Estás bien?” y la cuenta regresiva. Aclarar que la alerta es local.
- Finalizar, abrir el resumen y regresar al historial. Los recorridos simulados están identificados.
- Mostrar una prueba de sensores reales en un teléfono físico, con el dispositivo quieto y GPS disponible.

## Alcance de la entrega

Esta versión funciona en primer plano. Los umbrales son académicos, no están validados como un sistema de seguridad y no representan porcentajes de probabilidad. No requiere sensores externos ni un servidor.

No incluye inicio de sesión, sincronización en la nube, contacto ni envío de emergencia, notificaciones push, suscripción Premium, pagos, reportes exportables, cálculo de pendientes ni detección específica de caídas. La presentación visual pulida no cambia ese alcance funcional.

Los sensores pueden faltar según el dispositivo. El barómetro muestra presión; la altitud mostrada es del GPS. Los recorridos se almacenan localmente sin cifrado adicional. Cerrar la app antes de finalizar puede perder el viaje activo.

## Validación de entrega

```sh
npm ci
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo export --platform android --platform ios --output-dir .expo/export
```

Además de estas verificaciones, probar en Expo Go compatible con SDK 57 en iPhone y Android. El emulador y la vista web sirven para revisar pantallas y demostración; no verifican las lecturas físicas de sensores.

La vista web utiliza almacenamiento local del navegador y sirve para revisión visual. No modifica el almacenamiento SQLite de los teléfonos.

Revisión visual realizada en la vista web a 320 × 640 y 390 × 844: inicio, calibración, monitoreo, alerta, resumen e historial. Se comprobó el bloqueo de inicio antes de calibrar, la cuenta regresiva de 10 segundos, el guardado y la persistencia tras recargar. Estas comprobaciones no validan sensores físicos ni persistencia SQLite en un teléfono.
