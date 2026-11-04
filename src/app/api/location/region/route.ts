import { NextResponse, type NextRequest } from 'next/server';
import { validKoreaCoordinates } from '@/lib/location-region';
import { regionAtCoordinates } from '@/lib/korea-region-boundaries';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!validKoreaCoordinates(body?.lat, body?.lng)) {
    return NextResponse.json({ error: '한국 내 위치를 확인할 수 없어요. 지역을 직접 선택해주세요.' }, { status: 400, headers });
  }
  const region = regionAtCoordinates(body.lat, body.lng);
  if (!region) {
    return NextResponse.json({ error: '현재 좌표의 지역을 확인하지 못했어요. 위치를 다시 확인하거나 지역을 직접 선택해주세요.' }, { status: 404, headers });
  }
  return NextResponse.json({ region }, { headers });
}
