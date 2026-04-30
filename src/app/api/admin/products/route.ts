/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });

  const { data, error } = await sb
    .from('products')
    .select(
      `id, title, category, price, original_price, discount, rating, review_count, status, created_at,
       hospital:hospitals (name)`
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const products = (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.title,
    hospital: p.hospital?.name ?? '-',
    category: p.category ?? '미분류',
    originalPrice: p.original_price ?? p.price ?? 0,
    discountPrice: p.price ?? 0,
    rating: Number(p.rating ?? 0),
    reviews: p.review_count ?? 0,
    status: p.status,
    createdAt: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : '',
  }));

  return NextResponse.json({ products });
}
