import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getOwnedHospital } from '@/lib/owned-hospital';

export const dynamic = 'force-dynamic';

// PATCH /api/my-hospital/reviews  { reviewId, hidden }
export async function PATCH(req: NextRequest) {
  const { reviewId, hidden } = await req.json();
  if (!reviewId || typeof hidden !== 'boolean') {
    return NextResponse.json({ error: 'reviewId, hidden 필드가 필요합니다.' }, { status: 400 });
  }

  // 요청자가 해당 리뷰의 병원 오너인지 확인
  const sb = await createClient();
  const { hospital, error: ownedError } = await getOwnedHospital({ ownerOnly: true });
  if (ownedError) return ownedError;

  // 리뷰가 해당 병원 것인지 확인
  const { data: review } = await sb
    .from('reviews').select('hospital_id').eq('id', reviewId).maybeSingle();
  if (!review || review.hospital_id !== hospital.id) {
    return NextResponse.json({ error: '해당 리뷰를 찾을 수 없습니다.' }, { status: 404 });
  }

  // admin client로 hidden 컬럼 업데이트 (RLS: author만 수정 가능 → 우회)
  const admin = await createAdminClient();
  const { error } = await admin.from('reviews').update({ hidden }).eq('id', reviewId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
