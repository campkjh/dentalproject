// Run only inside a Vercel preview build. Credentials stay in that server environment.
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/location/region/route';

if (process.env.VERCEL_ENV !== 'preview') throw new Error('Run this check inside a Vercel preview build.');

const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
  const response = await originalFetch(...args);
  console.info(`LOCATION_PROVIDER_HTTP ${response.status}`);
  return response;
};

// Public city hall coordinates, never the user's device coordinates.
for (const point of [
  { city: '안산시', lat: 37.3219, lng: 126.8309 },
  { city: '안양시', lat: 37.3943, lng: 126.9568 },
]) {
  const response = await POST(new NextRequest('https://my-doc.co.kr/api/location/region', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: point.lat, lng: point.lng }),
  }));
  const result = await response.json();
  console.info(`LOCATION_REGION_CHECK ${JSON.stringify({ expected: point.city, status: response.status, actual: result.region?.district ?? null })}`);
  assert.equal(response.status, 200, 'Location provider must be available before release.');
  assert.equal(result.region?.district, point.city);
}
