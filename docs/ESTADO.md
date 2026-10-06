# Estado de trabajo — 5 de octubre de 2026

Repositorio: https://github.com/Urielnho/RoadGuard (privado), rama `main`.

Versión académica 1.0: Expo SDK 57, TypeScript, sensores reales en primer plano, calibración, reglas académicas, alerta visual local, SQLite, resumen e historial. Interfaz minimalista clara con acento verde, marca propia, navegación inferior y paneles desplegables para detalles. Guía de entrega en `docs/ENTREGA.md`. No se implementó Kotlin porque se acordó compartir la app con Expo Go en iPhone y Android.

Se eliminó el modo de simulación y sus escenarios por solicitud del usuario. Los recorridos simulados anteriores se conservan almacenados, pero no se muestran en el historial ni en estadísticas. El siguiente paso es abrir el QR en su iPhone y ejecutar el flujo de sensores reales del README; después validar sensores en un teléfono físico. Revisar la versión instalada de Expo Go si aparece incompatibilidad de SDK. Las verificaciones automatizadas no sustituyen pruebas físicas.

Pendientes de producto: login (al final), backend, envío de alertas a contactos, notificaciones push, activación de Premium, pagos, estadísticas y reportes, barómetro para cambio de altura y pendientes. Definir cuáles exige la rúbrica antes de ampliar alcance.

Premium: apartado informativo agregado, plan mensual $49.99 MXN de referencia, beneficios próximos. Sin cobros ni activación simulada. El usuario pidió implementar el login al final. Stripe Checkout en modo de prueba es la propuesta para el examen; integración pendiente. La distribución en tiendas requiere revisar reglas de compras digitales por región. Ver `docs/PREMIUM.md`.

Dependencias: `npm audit fix` se ejecutó sin forzar cambios de versión. Tras añadir Router y ESLint, npm reporta 29 avisos (10 moderados y 19 altos) en dependencias del proyecto. El arreglo forzado propuesto por npm cambia a Expo 44 y rompe esta base; requiere una revisión de dependencias antes de distribución pública.

Persistencia: los viajes se guardan al finalizar, localmente. Un cierre forzado pierde el viaje activo. No hay servicio en segundo plano ni contacto real de emergencia. El índice no es un porcentaje de probabilidad.

Lecturas: pantalla actualizada automáticamente cada segundo; movimiento solicitado a 100 ms. Los picos no se reemplazan por ceros si falta una nueva lectura. Sensores caducados se muestran sin datos; distancia y riesgo promedio sin evidencia quedan nulos. Pruebas unitarias adicionales cubren la caducidad independiente de sensores.
