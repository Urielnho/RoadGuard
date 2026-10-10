# RoadGuard

> **Actualización:** se preparó Stripe en modo de prueba con un servidor Node externo, registro push y GPS en segundo plano con recuperación local. Falta configurar/desplegar el servidor, publicar las nuevas reglas, vincular EAS/FCM y validar una compilación en un teléfono. Consulta [Stripe, push y segundo plano](docs/STRIPE-PUSH-SEGUNDO-PLANO.md) antes de usar las instrucciones históricas de demostración que siguen. Expo Go no permite validar estas funciones completas. La activación Premium local anterior fue reemplazada por verificación de Stripe en el servidor.

> Firebase: se implementó acceso anónimo persistente y respaldo de resúmenes de viajes en Firestore. El panel Historial escucha los últimos 20 resúmenes en tiempo real. Se requiere configurar `.env`, habilitar acceso anónimo y publicar `firestore.rules`; ver [Configurar Firebase](docs/FIREBASE.md). Las muestras y los eventos detallados siguen siendo locales. La integración aún requiere comprobación con el proyecto real y teléfonos físicos.

App académica en español para monitorear viajes y mostrar señales de riesgo con sensores reales. Usa **Expo SDK 57, React Native 0.86, React 19 y TypeScript**. Android e iPhone comparten este proyecto; no es una app Kotlin independiente.

Repositorio público: [Urielnho/RoadGuard](https://github.com/Urielnho/RoadGuard). Guía de continuidad actualizada el **8 de octubre de 2026**.

## Empezar en otra computadora

Necesitas Git, **Node.js 24**, npm y una compilación de desarrollo para push y GPS en segundo plano. Para Firebase y el servidor, completa las variables de `.env.example` en un archivo `.env`. Sin ellas funciona el almacenamiento local. Stripe se ejecuta en modo de prueba mediante el servidor externo en `server/`.

```sh
git clone https://github.com/Urielnho/RoadGuard.git
cd RoadGuard
npm ci
npm start
```

`npm ci` instala las versiones de `package-lock.json`; conservar ese archivo en los commits.

| Plataforma | Cómo abrir | Qué verificar |
| --- | --- | --- |
| iPhone físico | Computadora y teléfono en la misma red; abrir QR con Cámara y Expo Go | Sensores, permisos, foto, compartir y persistencia |
| Android físico | Escanear QR desde Expo Go | Sensores y funciones del dispositivo |
| Android Studio | Iniciar un dispositivo virtual en Device Manager y ejecutar `npm run android` | Pantallas y navegación; no verifica sensores físicos |
| Navegador | `npm run web` | Diseño y pago demo; almacenamiento separado del móvil |

Si la red bloquea la conexión: `npx expo start --tunnel`. Para limpiar la caché de Metro: `npx expo start --clear`. Ante incompatibilidad de Expo Go, revisar el SDK antes de cambiar dependencias. Android Studio no es necesario para probar en iPhone.

## Decisiones que debes respetar

- **Sensores y viajes exclusivamente reales.** No agregar números aleatorios ni recorridos ficticios a la interfaz. Datos ausentes o caducados usan `null` y muestran “—”; un cero recibido del sensor sí es válido.
- **Stripe solo en modo de prueba.** No habilitar cobros reales ni conceder Premium desde preferencias locales.
- **Login y registro se harán al final.** El perfil actual es personalización local, no una cuenta autenticada.
- Mantener diseño minimalista, español y prioridad a teléfonos.
- El servidor de Stripe y push está preparado en `server/`; debe configurarse y desplegarse para utilizarlo.
- Usar Expo Router y seguir [AGENTS.md](AGENTS.md).

## Estado funcional

| Área | Implementado |
| --- | --- |
| Viajes | Elegir automóvil, moto o bicicleta; preparar, calibrar, monitorear, finalizar y consultar resumen |
| Sensores | GPS, acelerómetro, giroscopio, magnetómetro y barómetro según disponibilidad y permisos |
| Riesgo | Índice 0–100, reglas explicadas y eventos registrados |
| Posible accidente | Heurística experimental, cuenta regresiva de 10 segundos y alerta local |
| Historial | Viajes, muestras y eventos guardados en SQLite al finalizar |
| Premium | Checkout de Stripe en modo de prueba y activación verificada por webhook; requiere servidor configurado |
| Personalización | Foto de galería, nombre visible, tres colores y nombres por vehículo |
| Análisis Premium | Estadísticas reales, comparación de riesgo, eventos frecuentes y recomendaciones |
| Reporte | Resumen de texto mediante la hoja de compartir del dispositivo |
| Gestión del plan | Volver a gratuito conservando viajes y preferencias |

Los viajes simulados de versiones antiguas se excluyen del historial y análisis. **Foto y hoja de compartir están implementadas, pero falta probarlas en teléfonos físicos.** Push está preparado, pendiente de credenciales y prueba física. No hay envío a contactos ni llamadas de emergencia.

## Pruebas manuales para retomar

### Sensores y viaje

1. Abrir en un teléfono físico, elegir vehículo y pulsar **Preparar viaje**.
2. Autorizar ubicación y movimiento cuando se soliciten; revisar sensores disponibles.
3. Dejar quieto el teléfono, calibrar e iniciar. Sin lectura del acelerómetro no se puede calibrar.
4. Comprobar actualización cada segundo. Cambiar suavemente orientación y probar GPS al aire libre; consultar la app estando detenido.
5. Finalizar, revisar resumen e historial. Reiniciar y comprobar que el viaje finalizado permanece.
6. Si faltan datos GPS, no deben aparecer velocidad o distancia inventadas.

En un navegador sin sensores puede ser imposible calibrar. Es lo esperado; no añadir datos simulados para evitarlo.

### Premium

1. **Premium → Suscribirme con Stripe**: cancelar Checkout y comprobar que no activa el plan.
2. Completar un pago de prueba y verificar que solo el webhook activa Premium.
3. Guardar nombre, cambiar foto/color y nombrar un vehículo; revisar Inicio.
4. Reiniciar y comprobar persistencia de activación, foto y preferencias.
5. Sin viajes deben aparecer estados vacíos. Con viajes reales, comprobar estadísticas, comparación y compartir reporte.
6. **Administrar suscripción**: cancelar desde el portal de Stripe y comprobar que se conserva el acceso hasta terminar el período confirmado. La personalización y los viajes permanecen locales.

## Mapa del código

| Archivo / carpeta | Responsabilidad |
| --- | --- |
| `src/app/` | Rutas Expo Router: Inicio, preparación, monitor, historial, detalle y Premium |
| `src/app/_layout.tsx` | Monta el controlador persistente exportado desde `App.tsx` |
| `App.tsx` | Estado del viaje, muestreo, navegación, guardado y pantallas compartidas mediante contexto |
| `src/useSensors.ts` | Permisos, suscripciones, filtros, calibración y lecturas reales |
| `src/domain.ts` | Tipos, umbrales, reglas de riesgo, caducidad y distancia |
| `src/storage.ts` | SQLite móvil: `roadguard.db`, tablas `trips` y `preferences` |
| `src/storage.web.ts` | Persistencia de revisión web en `localStorage` |
| `src/ui.tsx` | Componentes, estilos y contexto del color de acento |
| `src/Premium.tsx` | Checkout/portal de Stripe, personalización, estadísticas y reporte |
| `src/premiumDomain.ts` | Preferencias, colores, análisis y recomendaciones |
| `src/ProfileAvatar.tsx` | Foto o iniciales del perfil |
| `src/avatar.ts` / `src/avatar.web.ts` | Selección y persistencia de imagen por plataforma |
| `tests/` | Pruebas de reglas, caducidad y estadísticas |
| `app.json` | Identidad, permisos y plugins Expo |
| `.github/workflows/check.yml` | CI con Node 24: instalación, TypeScript, lint y pruebas |

Al separar `App.tsx` en componentes, mantener el viaje activo fuera de las pantallas de rutas y evitar suscripciones duplicadas a sensores.

## Datos y límites técnicos

Android/iOS usan SQLite; web usa almacenamiento del navegador. Con Firebase configurado, los resúmenes se respaldan en `users/{uid}/trips/{tripId}`. El acceso anónimo persiste en este dispositivo; todavía no hay recuperación de cuenta ni restauración del historial en otro dispositivo. La foto, preferencias, muestras y eventos detallados siguen siendo locales. Premium se verifica con Firestore y Stripe.

Los viajes se guardan al finalizar y se mantienen muestras locales de recuperación durante el recorrido. El GPS en segundo plano es opcional y requiere una compilación propia y permisos; el movimiento requiere primer plano. Un cierre forzado puede detener el registro. La duración incluye pausas; el riesgo promedio usa muestras monitoreadas. Los recorridos no tienen cifrado adicional.

La pantalla se actualiza cada segundo; movimiento solicita lecturas cada 100 ms. Movimiento/dirección caducan tras 3 segundos, GPS tras 5 y presión tras 10. GPS con precisión peor que 35 m se descarta. Distancia omite desplazamientos menores de 3 m y saltos superiores a 60 m/s; puede subestimar recorridos lentos.

Inclinación es relativa a calibración. Frenada/aceleración usan cambios de velocidad GPS. El acelerómetro conserva el pico filtrado de movimiento. Dirección del magnetómetro es aproximada sin compensar inclinación. Barómetro muestra presión; altitud proviene de GPS. Pendiente y altitud barométrica están pendientes.

El riesgo suma reglas hasta 100: 0–39 bajo, 40–69 moderado, 70–100 alto. **Son umbrales académicos, no límites legales ni probabilidades de accidente.** Eventos del mismo tipo se guardan como máximo cada 10 segundos. Premium promedia los riesgos promedio por viaje y compara los dos últimos viajes con datos de riesgo; no sustituye datos ausentes por cero.

## Por dónde continuar

1. **Validar iPhone y Android físicos:** permisos, sensores, calibración, historial, foto después de reiniciar y compartir. Registrar dispositivo, sistema operativo y resultado.
2. **Corregir fallos encontrados** manteniendo datos reales y persistencia; añadir pruebas cuando cambien reglas, filtros o cálculos.
3. **Acordar el alcance restante de la rúbrica:** backend/sincronización, contactos, push, pendientes y detección específica de caídas. No anunciar funciones pendientes como disponibles.
4. **Preparar pagos reales:** Stripe requiere servidor, secretos fuera de la app y verificación mediante webhooks. Volver desde una pantalla de pago no debe activar Premium. El booleano local demo no valida una suscripción. Consultar [PREMIUM.md](docs/PREMIUM.md) y condiciones de tienda antes de distribuir.
5. **Implementar login y registro al final**, acordando cómo vincular cuentas, viajes locales y derechos Premium.

## Entregar cambios

Crear una rama y abrir un pull request:

```sh
git switch main
git pull --ff-only origin main
git switch -c feat/descripcion-del-cambio
# Implementar y verificar
git add <archivos-modificados>
git commit -m "Describe el cambio"
git push -u origin feat/descripcion-del-cambio
```

Público permite leer/clonar; para hacer push necesitas que el dueño te agregue como colaborador. Sin ese permiso, crear un fork y enviar un pull request desde tu copia.

Antes de entregar ejecutar:

```sh
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

La revisión de esta integración pasó TypeScript, lint, **16 pruebas de app y 4 del servidor**, y exportación Android/iOS/web. La clave Stripe de prueba se verificó mediante una consulta sin cargos. El flujo completo de pago, la entrega push y el registro GPS requieren configuración externa y validación física; todavía no se ha construido un APK.

Instalar módulos con `npx expo install <paquete>` y consultar documentación de SDK 57 antes de cambiar APIs. Si un módulo nativo no viene en Expo Go, necesitará compilación de desarrollo. Configurar permisos/plugins en `app.json`; no editar manualmente carpetas nativas generadas. Seguir [AGENTS.md](AGENTS.md) para compilación con EAS.

No subir secretos, archivos `.env`, bases de usuarios ni recorridos personales. `.env.example` indica que esta versión no necesita servicios externos. Evitar `npm audit fix --force` sin revisar compatibilidad de Expo.

## Documentación adicional

- [Guía de entrega](docs/ENTREGA.md)
- [Premium y pagos futuros](docs/PREMIUM.md)
- [Estado de trabajo](docs/ESTADO.md)
- [Instrucciones de desarrollo](AGENTS.md)
