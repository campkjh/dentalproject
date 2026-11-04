import assert from 'node:assert/strict';
import test from 'node:test';
import { validKoreaCoordinates } from '../src/lib/location-region';
import { currentLocationRegion, CurrentLocationError } from '../src/lib/current-location';
import { catalogForArea } from '../src/lib/home-area';
import { regionAtCoordinates } from '../src/lib/korea-region-boundaries';

test('위치가 안산이면 안산 상품만, 안양이면 안양 상품만 자동 필터링한다', () => {
  const hospitals = [{ id: 'ansan', address: '경기도 안산시 단원구 광덕대로' }, { id: 'anyang', address: '경기도 안양시 동안구 시민대로' }];
  const products = [{ id: 'a', hospitalId: 'ansan' }, { id: 'b', hospitalId: 'anyang' }];
  assert.deepEqual(catalogForArea(products, hospitals, { city: '경기', district: '안산시' }).products.map(p => p.id), ['a']);
  assert.deepEqual(catalogForArea(products, hospitals, { city: '경기', district: '안양시' }).products.map(p => p.id), ['b']);
  const empty = catalogForArea(products, hospitals, { city: '경기', district: '과천시' });
  assert.deepEqual(empty.products, []);
  assert.deepEqual(empty.hospitals, []);
  assert.equal(empty.ids?.size, 0);
  assert.deepEqual(catalogForArea(products, hospitals, null).products, products);
});

test('실제 시군구 경계로 안산·안양·광명·서울과 제주를 판정한다', () => {
  assert.deepEqual(regionAtCoordinates(37.3219, 126.8309), { city: '경기', district: '안산시', label: '경기 안산시' });
  assert.deepEqual(regionAtCoordinates(37.3943, 126.9568), { city: '경기', district: '안양시', label: '경기 안양시' });
  assert.equal(regionAtCoordinates(37.4785, 126.8645)?.district, '광명시');
  assert.equal(regionAtCoordinates(37.5665, 126.978)?.district, '중구');
  assert.equal(regionAtCoordinates(33.4996, 126.5312)?.district, '제주시');
  assert.equal(regionAtCoordinates(0, 0), null);
  assert.equal(regionAtCoordinates(35, 125), null);
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
