import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getOwnedHospital } from '@/lib/owned-hospital';
import { reviewInput, initialReviewLimitError } from '@/lib/review-input';

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

// Hospital-created initial reviews: authenticate and scope every relation on the server.
export async function POST(req: NextRequest) {
  const { hospital, user, error: ownedError } = await getOwnedHospital({ ownerOnly: true });
  if (ownedError) return ownedError;
  const body = await req.json().catch(() => null);
  const parsed = reviewInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || '리뷰 내용을 확인해주세요.' }, { status: 400 });
  const admin = await createAdminClient();
  const { data: product, error: productError } = await admin.from('products').select('id, title, hospital_id, status').eq('id', String(body.productId ?? '')).eq('hospital_id', hospital.id).maybeSingle();
  if (productError || !product || product.status === 'removed') return NextResponse.json({ error: '내 병원에 등록된 시술을 선택해주세요.' }, { status: 400 });
  if (body.doctorId) {
    const { data: doctor } = await admin.from('doctors').select('id').eq('id', body.doctorId).eq('hospital_id', hospital.id).maybeSingle();
    if (!doctor) return NextResponse.json({ error: '내 병원의 의사를 선택해주세요.' }, { status: 400 });
  }
  const [{ data: row, error: hospitalError }, { data: existing, error: countError }] = await Promise.all([
    admin.from('hospitals').select('created_at').eq('id', hospital.id).single(),
    admin.from('reviews').select('before_image, after_image').eq('hospital_id', hospital.id).eq('author_id', user.id),
  ]);
  if (hospitalError || countError) return NextResponse.json({ error: '초기 리뷰 등록 가능 여부를 확인하지 못했어요.' }, { status: 500 });
  const imageCount = (existing ?? []).filter((review) => review.before_image || review.after_image).length;
  const limitError = initialReviewLimitError(row.created_at, imageCount, (existing ?? []).length - imageCount, !!(parsed.data.beforeImage || parsed.data.afterImage));
  if (limitError) return NextResponse.json({ error: limitError }, { status: 400 });
  const { data, error } = await admin.from('reviews').insert({
    author_id: user.id, hospital_id: hospital.id, product_id: product.id, doctor_id: body.doctorId || null,
    rating: parsed.data.rating, content: parsed.data.content, treatment_name: product.title,
    treatment_date: parsed.data.treatmentDate || null, total_cost: parsed.data.totalCost,
    before_image: parsed.data.beforeImage || null, after_image: parsed.data.afterImage || null,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
