// Exercise the real route with public coordinates, locally or inside a Vercel preview build.
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/location/region/route';

async function main() {
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
    assert.equal(response.status, 200, 'GPS region lookup must succeed before release.');
    assert.equal(result.region?.district, point.city);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
}

void main().catch(error => { console.error(error.message); process.exitCode = 1; });
