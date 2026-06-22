const GEOCODE_URL = 'https://maps.apigw.ntruss.com/map-geocode/v2/geocode';

export type Coords = { lat: number; lng: number };

/**
 * 서버 전용: 주소 → 좌표 변환 (네이버 클라우드 플랫폼 Geocoding).
 * 키가 없거나 변환 실패 시 null.
 */
export async function geocodeAddress(query: string): Promise<Coords | null> {
  const id = process.env.NAVER_MAP_CLIENT_ID ?? process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const secret = process.env.NAVER_MAP_CLIENT_SECRET;
  const q = query?.trim();
  if (!id || !secret || !q) return null;

  try {
    const res = await fetch(`${GEOCODE_URL}?query=${encodeURIComponent(q)}`, {
      headers: {
        'x-ncp-apigw-api-key-id': id,
        'x-ncp-apigw-api-key': secret,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.addresses?.[0];
    if (!first) return null;
    const lng = Number(first.x); // x = 경도(longitude)
    const lat = Number(first.y); // y = 위도(latitude)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}
