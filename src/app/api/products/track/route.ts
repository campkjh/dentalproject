// 상품 노출·조회 기록 받기 — DB 함수 track_product_stats(한 번에 60개까지, 없는 상품은 무시)로 넘긴다.
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ids = (value: unknown) => Array.isArray(value)
  ? [...new Set(value.filter((v): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)))].slice(0, 60)
  : [];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const impressions = ids(body.impressions);
  const views = ids(body.views);
  if (!impressions.length && !views.length) return NextResponse.json({ ok: true });
  const sb = await createClient();
  const { error } = await sb.rpc('track_product_stats', { p_impressions: impressions, p_views: views });
  if (error) return NextResponse.json({ ok: false }, { status: 200 }); // 기록 실패가 화면을 막지 않게
  return NextResponse.json({ ok: true });
}
