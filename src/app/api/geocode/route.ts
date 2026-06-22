import { NextResponse, type NextRequest } from 'next/server';
import { geocodeAddress } from '@/lib/naver-geocode';

// 주소 → 좌표. 브라우저(NaverMap 컴포넌트)에서 호출하며, 시크릿은 서버에만 둔다.
export async function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams.get('query')?.trim();
  if (!query) {
    return NextResponse.json({ error: 'query required' }, { status: 400 });
  }

  const coords = await geocodeAddress(query);
  if (!coords) {
    return NextResponse.json({ lat: null, lng: null });
  }

  return NextResponse.json(coords, {
    headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
  });
}
