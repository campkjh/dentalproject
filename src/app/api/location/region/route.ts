import { NextResponse, type NextRequest } from 'next/server';
import { regionFromReverseGeocode, validKoreaCoordinates } from '@/lib/location-region';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!validKoreaCoordinates(body?.lat, body?.lng)) {
    return NextResponse.json({ error: '한국 내 위치를 확인할 수 없어요. 지역을 직접 선택해주세요.' }, { status: 400, headers });
  }
  const id = process.env.NAVER_MAP_CLIENT_ID ?? process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const secret = process.env.NAVER_MAP_CLIENT_SECRET;
  if (id && secret) {
    try {
      const query = new URLSearchParams({ coords: `${body.lng},${body.lat}`, output: 'json', orders: 'legalcode' });
      const response = await fetch(`https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?${query}`, {
        headers: { 'x-ncp-apigw-api-key-id': id, 'x-ncp-apigw-api-key': secret },
        cache: 'no-store', signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const region = regionFromReverseGeocode(await response.json());
        if (region) return NextResponse.json({ region }, { headers });
      }
    } catch { /* no precise coordinates or provider credentials in logs */ }
  }
  return NextResponse.json({ error: '현재 지역을 확인하지 못했어요. 잠시 후 다시 시도하거나 지역을 직접 선택해주세요.' }, { status: 503, headers });
}
