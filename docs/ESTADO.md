# Estado de trabajo — 5 de octubre de 2026

Repositorio: https://github.com/Urielnho/RoadGuard (privado), rama `main`.

Primera entrega: Expo SDK 57, TypeScript, sensores reales en primer plano, calibración, reglas académicas, alerta visual local, SQLite, simulación explícita, resumen e historial. No se implementó Kotlin porque se acordó compartir la app con Expo Go en iPhone y Android.

El siguiente paso con el usuario es abrir el QR en su iPhone y ejecutar el flujo de demostración del README; después validar sensores en un teléfono físico. Revisar la versión instalada de Expo Go si aparece incompatibilidad de SDK. Las verificaciones automatizadas no sustituyen pruebas físicas.

Pendientes de producto: login, backend, envío de alertas a contactos, notificaciones push, Premium simulado, pagos reales, estadísticas y reportes, barómetro para cambio de altura y pendientes. Definir cuáles exige la rúbrica antes de ampliar alcance.

Dependencias: `npm audit fix` se ejecutó sin forzar cambios de versión. Tras añadir Router y ESLint, npm reporta 29 avisos (10 moderados y 19 altos) en dependencias del proyecto. El arreglo forzado propuesto por npm cambia a Expo 44 y rompe esta base; requiere una revisión de dependencias antes de distribución pública.

Persistencia: los viajes se guardan al finalizar, localmente. Un cierre forzado pierde el viaje activo. No hay servicio en segundo plano ni contacto real de emergencia. El índice no es un porcentaje de probabilidad.
