export function validDevice(data) {
  return data?.platform === 'android' && data.provider === 'fcm' && typeof data.token === 'string' && /^[A-Za-z0-9:_-]{20,4096}$/.test(data.token);
}

export async function sendAndroidNotification(messaging, token, title, body) {
  try {
    const messageId = await messaging.send({ token, notification: { title, body }, data: { screen: 'premium' }, android: { priority: 'high', ttl: 3600000, notification: { channelId: 'roadguard', sound: 'default' } } });
    // FCM acceptance is not proof that a phone displayed the notification.
    return { messageId };
  } catch (error) {
    if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(error.code)) return { invalidToken: true };
    throw error;
  }
}
