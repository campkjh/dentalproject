// 의사 '상품 인사이트'(261101) — 내 병원 상품의 날짜별 노출·조회 + 상품별 노출·조회·조회율·좋아요·포켓·예약.
//  · 노출·조회 = product_stats_daily(0020) / 좋아요 = product_likes / 포켓 = wishlists / 예약 = reservations(기간 안 생성)
//  · ?days=7|30|90 (기본 30), ?product=<id> 면 그 상품 날짜별(productDaily)도. 날짜는 한국 날짜.
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getOwnedHospital, hospitalKeys } from '@/lib/owned-hospital';

export const dynamic = 'force-dynamic';

const kstDay = (ms: number) => new Date(ms + 9 * 3600000).toISOString().slice(0, 10);

export async function GET(req: NextRequest) {
  const { hospital, error } = await getOwnedHospital();
  if (error) return error;
  const url = new URL(req.url);
  const raw = Number(url.searchParams.get('days') ?? 30);
  const productId = url.searchParams.get('product');
  const days = [7, 30, 90].includes(raw) ? raw : 30;
  const admin = await createAdminClient();

  const { data: productRows } = await admin
    .from('products')
    .select('id, title, image_url, price, like_count, status, created_at')
    .in('hospital_id', hospitalKeys(hospital))
    .order('created_at', { ascending: false });
  const products = productRows ?? [];
  const ids = products.map(p => p.id);

  const now = Date.now();
  const dayList = Array.from({ length: days }, (_, i) => kstDay(now - (days - 1 - i) * 86400000));
  const from = dayList[0];
  const fromIso = new Date(`${from}T00:00:00+09:00`).toISOString();

  const empty = { data: [] as never[] };
  const [statsRes, likesRes, pocketsRes, reservationsRes] = ids.length ? await Promise.all([
    admin.from('product_stats_daily').select('product_id, day, impressions, views').in('product_id', ids).gte('day', from),
    admin.from('product_likes').select('product_id, created_at').in('product_id', ids).gte('created_at', fromIso),
    admin.from('wishlists').select('product_id, created_at').in('product_id', ids).gte('created_at', fromIso),
    admin.from('reservations').select('product_id, status, created_at').in('product_id', ids).gte('created_at', fromIso),
  ]) : [empty, empty, empty, empty];

  const byDay = new Map(dayList.map(d => [d, { day: d, impressions: 0, views: 0 }]));
  const per = new Map(products.map(p => [p.id, { impressions: 0, views: 0, likes: 0, pockets: 0, reservations: 0, daily: new Map<string, number>() }]));
  const one = new Map(dayList.map(d => [d, { day: d, impressions: 0, views: 0 }]));
  for (const row of statsRes.data ?? []) {
    const d = byDay.get(row.day); const p = per.get(row.product_id);
    if (d) { d.impressions += row.impressions; d.views += row.views; }
    if (row.product_id === productId) { const o = one.get(row.day); if (o) { o.impressions += row.impressions; o.views += row.views; } }
    if (p) { p.impressions += row.impressions; p.views += row.views; p.daily.set(row.day, (p.daily.get(row.day) ?? 0) + row.views); }
  }
  for (const row of likesRes.data ?? []) { const p = per.get(row.product_id); if (p) p.likes++; }
  for (const row of pocketsRes.data ?? []) { const p = per.get(row.product_id); if (p) p.pockets++; }
  for (const row of reservationsRes.data ?? []) { const p = per.get(row.product_id); if (p && row.status !== 'cancelled') p.reservations++; }

  const items = products.map(p => {
    const s = per.get(p.id)!;
    return {
      id: p.id, title: p.title, imageUrl: p.image_url, price: p.price, status: p.status,
      impressions: s.impressions, views: s.views, likes: s.likes, pockets: s.pockets, reservations: s.reservations,
      totalLikes: p.like_count ?? 0,
      spark: dayList.slice(-14).map(d => s.daily.get(d) ?? 0),
    };
  });
  const totals = items.reduce((t, i) => ({
    impressions: t.impressions + i.impressions, views: t.views + i.views, likes: t.likes + i.likes,
    pockets: t.pockets + i.pockets, reservations: t.reservations + i.reservations,
  }), { impressions: 0, views: 0, likes: 0, pockets: 0, reservations: 0 });

  // 집계를 시작한 날(0020 적용일) 이전은 기록이 없다 — 화면에서 안내한다
  return NextResponse.json({ days, from, daily: [...byDay.values()], productDaily: productId && per.has(productId) ? [...one.values()] : null, totals, products: items, trackingSince: '2026-11-01' });
}
