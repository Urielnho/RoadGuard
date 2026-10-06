# RoadGuard · Guía de entrega

## Objetivo

Monitorear un viaje en automóvil, motocicleta o bicicleta y mostrar señales de riesgo calculadas con reglas claras, usando los sensores del teléfono. La versión académica 1.0 incluye preparación, calibración, seguimiento, alerta visual, resumen e historial.

## Flujo de uso

1. **Inicio:** elegir vehículo. Los viajes usan exclusivamente los sensores del dispositivo.
2. **Preparación:** fijar el teléfono, revisar sensores y calibrar. El botón para iniciar se habilita tras la calibración.
3. **Viaje:** consultar el índice de riesgo, velocidad y distancia. Las lecturas de sensores se muestran directamente y se actualizan cada segundo. Un panel desplegable explica las reglas activas.
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
| Datos en vivo | Lecturas exclusivamente reales; los datos ausentes o caducados aparecen como “—” |
| Interfaz | Tema claro, navegación Inicio/Historial/Premium, estados vacíos y detalles desplegables |
| Premium | Apartado informativo con plan mensual y beneficios previstos; sin login ni cobros |

## Guion para exposición (3–5 minutos)

- Presentar cómo los sensores se convierten en señales comprensibles durante un recorrido.
- Abrir Expo Go en un teléfono físico, elegir vehículo, autorizar los permisos y calibrar.
- Iniciar y mostrar las lecturas de aceleración, inclinación, rotación, presión y dirección. Mover suavemente el teléfono para comprobar la actualización automática.
- Probar GPS al aire libre y explicar que la velocidad y la altitud dependen de señal válida.
- Consultar las reglas del índice de riesgo. No provocar accidentes ni maniobras peligrosas para demostrar eventos.
- Finalizar y mostrar resumen e historial. Cerrar y abrir de nuevo la app para comprobar persistencia.
- La alerta de accidente se explica con sus reglas y pruebas unitarias; ya no existe un botón para generarla artificialmente.

## Alcance de la entrega

Esta versión funciona en primer plano. Los umbrales son académicos, no están validados como un sistema de seguridad y no representan porcentajes de probabilidad. No requiere sensores externos ni un servidor.

No incluye inicio de sesión, sincronización en la nube, contacto ni envío de emergencia, notificaciones push, activación de Premium, pagos, reportes exportables, cálculo de pendientes ni detección específica de caídas. El apartado Premium es informativo y anuncia sus beneficios como próximos. La presentación visual pulida no cambia ese alcance funcional.

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

Además de estas verificaciones, probar en Expo Go compatible con SDK 57 en iPhone y Android. El emulador y la vista web sirven para revisar pantallas; no verifican las lecturas físicas de sensores. La aplicación no sustituye los sensores ausentes por datos simulados.

La vista web utiliza almacenamiento local del navegador y sirve para revisión visual. No modifica el almacenamiento SQLite de los teléfonos.

La revisión visual anterior incluyó el modo de demostración, eliminado por solicitud del usuario. La versión actual requiere una prueba en un teléfono físico para confirmar sus sensores; las verificaciones automáticas comprueban reglas y caducidad de lecturas sin mostrar datos de prueba al usuario.
