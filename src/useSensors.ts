import { useEffect, useRef, useState } from 'react';
import { Accelerometer, Gyroscope, Magnetometer, Barometer, DeviceMotion } from 'expo-sensors';
import * as Location from 'expo-location';
import { emptyReading, Reading } from './domain';
type Vector = { x: number; y: number; z: number };
export function useSensors(enabled: boolean) {
  const latest = useRef<Reading>(emptyReading());
  const gravity = useRef<Vector | null>(null);
  const baseline = useRef<Vector | null>(null);
  const gpsTime = useRef(0);
  const [availability, setAvailability] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const subscriptions: { remove(): void }[] = [];
    latest.current = emptyReading(); gravity.current = null; baseline.current = null; gpsTime.current = 0;
    const status = (key: string, value: string) => alive && setAvailability(old => ({ ...old, [key]: value }));
    async function start() {
      // iOS may require motion permission before availability checks.
      try { await DeviceMotion.requestPermissionsAsync(); } catch { /* Each sensor is checked independently below. */ }
      if (!alive) return;
      setAvailability({}); setError('');
      const register = async <T,>(key: string, sensor: { isAvailableAsync(): Promise<boolean>; setUpdateInterval(ms: number): void; addListener(listener: (data: T) => void): { remove(): void } }, onData: (data: T) => void) => {
        try {
          const available = await sensor.isAvailableAsync();
          if (!alive) return;
          status(key, available ? 'Disponible' : 'No disponible');
          if (available) { sensor.setUpdateInterval(100); subscriptions.push(sensor.addListener(onData)); }
        } catch { status(key, 'Sin acceso'); }
      };
      await Promise.all([
        register('Acelerómetro', Accelerometer, (v: Vector) => {
          const g = gravity.current;
          gravity.current = g ? { x: g.x * 0.9 + v.x * 0.1, y: g.y * 0.9 + v.y * 0.1, z: g.z * 0.9 + v.z * 0.1 } : v;
          const current = gravity.current;
          const acceleration = Math.hypot(v.x - current.x, v.y - current.y, v.z - current.z) * 9.80665;
          latest.current.acceleration = Math.max(latest.current.acceleration ?? 0, acceleration);
          const base = baseline.current;
          if (base) {
            const denominator = Math.hypot(base.x, base.y, base.z) * Math.hypot(current.x, current.y, current.z);
            latest.current.tilt = denominator > 0 ? Math.acos(Math.max(-1, Math.min(1, (base.x * current.x + base.y * current.y + base.z * current.z) / denominator))) * 180 / Math.PI : null;
          }
        }),
        register('Giroscopio', Gyroscope, (v: Vector) => { latest.current.rotation = Math.max(latest.current.rotation ?? 0, Math.hypot(v.x, v.y, v.z)); }),
        register('Magnetómetro', Magnetometer, (v: Vector) => { latest.current.heading = (Math.atan2(-v.x, v.y) * 180 / Math.PI + 360) % 360; }),
        register('Barómetro', Barometer, (v: { pressure: number }) => { latest.current.pressure = v.pressure; }),
      ]);
      if (!alive) return;
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!alive) return;
        if (!permission.granted) { status('GPS', 'Permiso denegado'); return; }
        status('GPS', 'Buscando señal');
        const subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 }, location => {
          if (!alive) return;
          const c = location.coords;
          if (c.accuracy === null || c.accuracy > 35) { status('GPS', 'Señal imprecisa'); return; }
          gpsTime.current = Date.now();
          Object.assign(latest.current, { speed: c.speed !== null && c.speed >= 0 ? c.speed * 3.6 : null, latitude: c.latitude, longitude: c.longitude, altitude: c.altitude });
          status('GPS', 'Disponible');
        });
        if (alive) subscriptions.push(subscription); else subscription.remove();
      } catch { if (alive) { status('GPS', 'Sin acceso'); setError('No se pudo iniciar el GPS. Revisa permisos y ubicación del dispositivo.'); } }
    }
    void start();
    return () => { alive = false; subscriptions.forEach(s => s.remove()); };
  }, [enabled]);
  return {
    availability, error,
    calibrate: () => {
      if (!gravity.current) return false;
      baseline.current = { ...gravity.current }; latest.current.tilt = 0; return true;
    },
    sample: (): Reading => {
      const reading = { ...latest.current, time: Date.now() };
      if (Date.now() - gpsTime.current > 5000) { reading.speed = null; reading.latitude = null; reading.longitude = null; reading.altitude = null; }
      if (latest.current.acceleration !== null) latest.current.acceleration = 0;
      if (latest.current.rotation !== null) latest.current.rotation = 0;
      return reading;
    },
  };
}
