'use client';

import type { NearArea } from './home-area';

export class CurrentLocationError extends Error {
  constructor(public readonly kind: 'denied' | 'timeout' | 'unavailable', message: string) { super(message); }
}

export async function currentLocationRegion(): Promise<NearArea> {
  if (!navigator.geolocation) throw new CurrentLocationError('unavailable', '위치 서비스를 지원하지 않는 기기예요. 지역을 직접 선택해주세요.');
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, error => {
      const kind = error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable';
      reject(new CurrentLocationError(kind, kind === 'denied'
        ? '위치 권한이 꺼져 있어요. 휴대폰 설정에서 마이닥의 위치 권한을 허용해주세요.'
        : kind === 'timeout' ? '위치를 찾는 데 시간이 걸려요. 잠시 후 다시 시도해주세요.' : '현재 위치를 가져오지 못했어요. 휴대폰의 위치 기능을 확인해주세요.'));
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
  const response = await fetch('/api/location/region', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
    body: JSON.stringify({ lat: position.coords.latitude, lng: position.coords.longitude }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json();
  if (!response.ok || !data.region) throw new CurrentLocationError('unavailable', data.error ?? '현재 지역을 확인하지 못했어요.');
  return data.region;
}
