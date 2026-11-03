import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { sendPush } from '../src/lib/push/fcm';

test('FCM 전송은 중복 토큰을 제외하고 실패·만료 토큰을 구분하며 야간·클릭 정보를 전달한다', async () => {
  const keys = ['FCM_PROJECT_ID', 'FCM_CLIENT_EMAIL', 'FCM_PRIVATE_KEY'] as const;
  const previous = keys.map(key => process.env[key]);
  const originalFetch = globalThis.fetch;
  try {
    delete process.env.FCM_PROJECT_ID;
    assert.equal((await sendPush({ tokens: ['unused'], title: '제목', body: '본문' })).configured, false);
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    process.env.FCM_PROJECT_ID = 'test-project';
    process.env.FCM_CLIENT_EMAIL = 'sender@example.test';
    process.env.FCM_PRIVATE_KEY = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    const requests: Record<string, unknown>[] = [];
    globalThis.fetch = async (input, init) => {
      if (String(input).includes('oauth2.googleapis.com')) return Response.json({ access_token: 'mock-token', expires_in: 3600 });
      const message = JSON.parse(String(init?.body)).message;
      requests.push(message);
      if (message.token === 'expired') return Response.json({ error: { details: [{ errorCode: 'UNREGISTERED' }] } }, { status: 404 });
      if (message.token === 'retry') return Response.json({ error: { status: 'UNAVAILABLE' } }, { status: 503 });
      return Response.json({ name: 'projects/test/messages/mock' });
    };
    const result = await sendPush({ tokens: ['good', 'good', 'expired', 'retry'], title: '마이닥 알림', body: '새 알림', quiet: true, notificationId: 'notice-a', data: { link: '/community/a' } });
    assert.equal(result.ok, false);
    assert.equal(result.sent, 1);
    assert.equal(result.failed, 2);
    assert.deepEqual(result.invalidTokens, ['expired']);
    assert.equal(requests.length, 3);
    const message = requests[0] as { android: { notification: { channel_id: string; tag: string } }; apns: { headers: Record<string, string>; payload: { aps: { sound?: string } } }; data: { link: string } };
    assert.equal(message.android.notification.channel_id, 'mydoc_quiet');
    assert.equal(message.android.notification.tag, 'notice-a');
    assert.equal(message.apns.headers['apns-collapse-id'], 'notice-a');
    assert.equal(message.apns.payload.aps.sound, undefined);
    assert.equal(message.data.link, '/community/a');
    assert.ok(result.errors.every(error => !error.includes('mock-token')));
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
  }
});
