import { useEffect, useRef, useState } from 'react';
import { Accelerometer, Gyroscope, Magnetometer, Barometer, DeviceMotion } from 'expo-sensors';
import * as Location from 'expo-location';
import { emptyReading, emptySensorTimes, freshReading, Reading } from './domain';
type Vector = { x: number; y: number; z: number };
export function useSensors(enabled: boolean) {
  const latest = useRef<Reading>(emptyReading());
  const gravity = useRef<Vector | null>(null);
  const baseline = useRef<Vector | null>(null);
  const sensorTimes = useRef(emptySensorTimes());
  const [availability, setAvailability] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const subscriptions: { remove(): void }[] = [];
    latest.current = emptyReading(); gravity.current = null; baseline.current = null; sensorTimes.current = emptySensorTimes();
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
          status(key, available ? 'Esperando lectura' : 'No disponible');
          if (available) {
            let received = false;
            sensor.setUpdateInterval(100);
            subscriptions.push(sensor.addListener(data => {
              if (!alive) return;
              onData(data);
              if (!received) { received = true; status(key, 'Disponible'); }
            }));
          }
        } catch { status(key, 'Sin acceso'); }
      };
      await Promise.all([
        register('Acelerómetro', Accelerometer, (v: Vector) => {
          if (![v.x, v.y, v.z].every(Number.isFinite)) return;
          sensorTimes.current.acceleration = Date.now();
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
        register('Giroscopio', Gyroscope, (v: Vector) => {
          if (![v.x, v.y, v.z].every(Number.isFinite)) return;
          sensorTimes.current.rotation = Date.now();
          latest.current.rotation = Math.max(latest.current.rotation ?? 0, Math.hypot(v.x, v.y, v.z));
        }),
        register('Magnetómetro', Magnetometer, (v: Vector) => {
          if (![v.x, v.y, v.z].every(Number.isFinite) || Math.hypot(v.x, v.y) === 0) return;
          sensorTimes.current.heading = Date.now();
          latest.current.heading = (Math.atan2(-v.x, v.y) * 180 / Math.PI + 360) % 360;
        }),
        register('Barómetro', Barometer, (v: { pressure: number }) => {
          if (!Number.isFinite(v.pressure) || v.pressure <= 0) return;
          sensorTimes.current.pressure = Date.now(); latest.current.pressure = v.pressure;
        }),
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
          if (c.accuracy === null || !Number.isFinite(c.accuracy) || c.accuracy > 35) { status('GPS', 'Señal imprecisa'); return; }
          if (!Number.isFinite(location.timestamp) || Date.now() - location.timestamp > 5000) { status('GPS', 'Esperando lectura reciente'); return; }
          sensorTimes.current.gps = location.timestamp;
          Object.assign(latest.current, { speed: c.speed !== null && Number.isFinite(c.speed) && c.speed >= 0 ? c.speed * 3.6 : null, latitude: Number.isFinite(c.latitude) ? c.latitude : null, longitude: Number.isFinite(c.longitude) ? c.longitude : null, altitude: c.altitude !== null && Number.isFinite(c.altitude) ? c.altitude : null });
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
      if (!gravity.current || Date.now() - sensorTimes.current.acceleration > 3000) return false;
      baseline.current = { ...gravity.current }; latest.current.tilt = 0; return true;
    },
    sample: (): Reading => {
      const reading = freshReading(latest.current, sensorTimes.current, Date.now());
      latest.current.acceleration = null;
      latest.current.rotation = null;
      return reading;
    },
  };
}
