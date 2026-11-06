import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeReview } from '@/lib/api/normalize';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 후 후기를 확인할 수 있어요.' }, { status: 401 });
  const { data: product, error: productError } = await sb.from('products').select('id').eq('id', id).eq('status', 'active').eq('approval_status', 'approved').maybeSingle();
  if (productError) return NextResponse.json({ error: '상품 정보를 불러오지 못했습니다.' }, { status: 500 });
  if (!product) return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
  const { data, error } = await sb.from('reviews')
    .select('id, author_id, hospital_id, doctor_id, product_id, rating, content, treatment_name, total_cost, treatment_date, before_image, after_image, created_at, author:profiles!reviews_author_id_fkey(name), doctor:doctors(name)')
    .eq('product_id', id).or('hidden.eq.false,hidden.is.null').order('created_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: '후기를 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ reviews: (data ?? []).map(normalizeReview) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
