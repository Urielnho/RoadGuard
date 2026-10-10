export async function enablePush(_requestPermission = true): Promise<void> { throw new Error('Prueba las notificaciones en la compilación móvil de RoadGuard.'); }
export async function testPush(): Promise<void> { await enablePush(); }

export async function disablePush() {}
