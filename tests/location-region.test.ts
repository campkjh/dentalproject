import assert from 'node:assert/strict';
import test from 'node:test';
import { regionFromReverseGeocode, validKoreaCoordinates } from '../src/lib/location-region';
import { currentLocationRegion, CurrentLocationError } from '../src/lib/current-location';

test('실제 행정구역 응답을 사용하고 서울·경기 경계나 가까운 구청으로 바꾸지 않는다', () => {
  const region = (province: string, district: string) => ({ status: { code: 0 }, results: [{ region: { area1: { name: province }, area2: { name: district } } }] });
  assert.deepEqual(regionFromReverseGeocode(region('서울특별시', '서초구')), { city: '서울', district: '서초구', label: '서초구' });
  assert.deepEqual(regionFromReverseGeocode(region('경기도', '광명시')), { city: '경기', district: '광명시', label: '경기 광명시' });
  assert.deepEqual(regionFromReverseGeocode(region('경기도', '안산시 단원구')), { city: '경기', district: '안산시', label: '경기 안산시' });
  assert.equal(regionFromReverseGeocode({ status: { code: 3 } }), null);
  assert.equal(regionFromReverseGeocode({ status: { code: 0 }, results: [] }), null);
});

test('유효하지 않은 좌표와 한국 밖 좌표는 지도 API로 보내지 않는다', () => {
  assert.equal(validKoreaCoordinates(37.5665, 126.978), true);
  for (const [lat, lng] of [[null, 127], ['37', 127], [Infinity, 127], [0, 0], [38, NaN]]) assert.equal(validKoreaCoordinates(lat, lng), false);
});

test('현재 위치는 고정밀 새 좌표를 요청하고 URL 대신 요청 본문으로 지역을 확인한다', async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: { getCurrentPosition: (success: (position: unknown) => void, _error: unknown, options: PositionOptions) => {
    assert.equal(options.enableHighAccuracy, true);
    assert.equal(options.maximumAge, 0);
    success({ coords: { latitude: 37.5665, longitude: 126.978 } });
  } } } });
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, '/api/location/region');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body as string), { lat: 37.5665, lng: 126.978 });
    return Response.json({ region: { city: '서울', district: '중구', label: '중구' } });
  });
  try { assert.equal((await currentLocationRegion()).district, '중구'); }
  finally { if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else Reflect.deleteProperty(globalThis, 'navigator'); }
});

test('권한 거절은 좌표 서비스 호출 없이 권한 오류로 구분한다', async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: { getCurrentPosition: (_success: unknown, error: (e: unknown) => void) => error({ code: 1 }) } } });
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('unexpected request'); });
  try {
    await assert.rejects(currentLocationRegion(), error => error instanceof CurrentLocationError && error.kind === 'denied');
    assert.equal(fetch.mock.calls.length, 0);
  } finally { if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else Reflect.deleteProperty(globalThis, 'navigator'); }
});
