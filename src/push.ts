import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { apiPost } from './api';

export async function enablePush(requestPermission = true) {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) throw new Error('Instala la compilación de RoadGuard para probar push; Expo Go no sirve para esta prueba.');
  if (Platform.OS !== 'android') throw new Error('Las notificaciones directas están configuradas para Android. iPhone necesita configurar APNs.');
  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('roadguard', { name: 'RoadGuard', importance: Notifications.AndroidImportance.HIGH });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Las notificaciones no están autorizadas.');
  const token = (await Notifications.getDevicePushTokenAsync()).data;
  await apiPost('/push/register', { token, platform: 'android', provider: 'fcm' });
}

export async function testPush() {
  await enablePush();
  await apiPost('/push/test');
}

export async function disablePush() {
 if (Platform.OS !== 'android' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
 const Notifications = await import('expo-notifications');
 const token = (await Notifications.getDevicePushTokenAsync()).data;
 await apiPost('/push/unregister', { token });
 await Notifications.dismissAllNotificationsAsync();
}
