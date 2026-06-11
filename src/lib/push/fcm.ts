/* eslint-disable @typescript-eslint/no-explicit-any */
// Lightweight FCM HTTP v1 sender using a service account.
// Activates only when FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY env vars are present.

type PushPayload = {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
};

type PushResult = {
  ok: boolean;
  configured: boolean;
  sent: number;
  failed: number;
  errors: string[];
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function importJWK(privateKeyPem: string) {
  // Convert PEM to ArrayBuffer for SubtleCrypto.
  const pem = privateKeyPem.replace(/\\n/g, '\n');
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function getAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const enc = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsigned = `${enc(header)}.${enc(claims)}`;

  const key = await importJWK(privateKeyPem);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const sigB64 = Buffer.from(new Uint8Array(sig)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${unsigned}.${sigB64}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

export function isPushConfigured() {
  return Boolean(process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY);
}

export async function sendPush(payload: PushPayload): Promise<PushResult> {
  if (!isPushConfigured()) {
    return { ok: false, configured: false, sent: 0, failed: 0, errors: ['FCM 환경변수가 설정되지 않았습니다.'] };
  }

  const projectId = process.env.FCM_PROJECT_ID!;
  const clientEmail = process.env.FCM_CLIENT_EMAIL!;
  const privateKey = process.env.FCM_PRIVATE_KEY!;

  let accessToken: string;
  try {
    accessToken = await getAccessToken(clientEmail, privateKey);
  } catch (err: any) {
    return { ok: false, configured: true, sent: 0, failed: 0, errors: [err.message ?? 'token error'] };
  }

  const result: PushResult = { ok: true, configured: true, sent: 0, failed: 0, errors: [] };
  const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  for (const token of payload.tokens) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data ?? {},
          },
        }),
      });
      if (res.ok) {
        result.sent += 1;
      } else {
        result.failed += 1;
        result.errors.push(`${res.status}: ${(await res.text()).slice(0, 120)}`);
      }
    } catch (err: any) {
      result.failed += 1;
      result.errors.push(err.message ?? 'send error');
    }
  }

  return result;
}
