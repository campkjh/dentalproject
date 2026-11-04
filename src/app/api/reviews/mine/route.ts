import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeReview } from '@/lib/api/normalize';
import { loadOwnReviewRows } from '@/lib/own-reviews';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { data, error } = await loadOwnReviewRows(client, user.id);
  if (error) return NextResponse.json({ error: '내 리뷰를 불러오지 못했어요.' }, { status: 500 });
  return NextResponse.json({ userId: user.id, reviews: (data ?? []).map(row => ({
    ...normalizeReview(row),
    hospitalName: (Array.isArray(row.hospital) ? row.hospital[0] : row.hospital)?.name,
    productImage: (Array.isArray(row.product) ? row.product[0] : row.product)?.image_url,
  })) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
