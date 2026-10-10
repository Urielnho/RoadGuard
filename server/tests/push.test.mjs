import test from 'node:test';
import assert from 'node:assert/strict';
import { validDevice, sendAndroidNotification } from '../push.mjs';

test('registration accepts only native Android FCM tokens', () => {
  assert.equal(validDevice({platform:'android',provider:'fcm',token:'a'.repeat(160)+':abc-_123'}),true);
  for (const data of [{platform:'ios',provider:'fcm',token:'a'.repeat(160)}, {platform:'android',provider:'expo',token:'ExpoPushToken[abc]'}, {platform:'android',provider:'fcm',token:'with spaces'}, {platform:'android',provider:'fcm',token:'a'.repeat(4097)}]) assert.equal(validDevice(data),false);
});
test('direct FCM uses a visible Android notification with its channel', async () => {
  let payload;
  const result=await sendAndroidNotification({send:async m=>{payload=m; return 'projects/test/messages/123';}},'native-token','RoadGuard','Prueba');
  assert.equal(result.messageId,'projects/test/messages/123');
  assert.deepEqual(payload.notification,{title:'RoadGuard',body:'Prueba'});
  assert.equal(payload.android.notification.channelId,'roadguard');
  assert.equal(payload.android.priority,'high');
});
test('expired tokens are removed but permission/network failures must retry', async () => {
  const client=code=>({send:async()=>{throw Object.assign(new Error('test'),{code});}});
  assert.deepEqual(await sendAndroidNotification(client('messaging/registration-token-not-registered'),'t','a','b'),{invalidToken:true});
  await assert.rejects(sendAndroidNotification(client('messaging/server-unavailable'),'t','a','b'));
  await assert.rejects(sendAndroidNotification(client('messaging/authentication-error'),'t','a','b'));
});
