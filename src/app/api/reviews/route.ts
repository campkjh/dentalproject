import { writeNotifications } from '@/lib/push/delivery';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reviewInput } from '@/lib/review-input';

export const dynamic = 'force-dynamic';

async function resolveHospitalId(sb: any, hospitalIdOrSlug: string | null) {
  if (!hospitalIdOrSlug) return null;
  if (/^[0-9a-f]{8}-/.test(hospitalIdOrSlug)) return hospitalIdOrSlug;
  const { data } = await sb.from('hospitals').select('id').eq('slug', hospitalIdOrSlug).maybeSingle();
  return data?.id ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = reviewInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || '리뷰 내용을 확인해주세요.' }, { status: 400 });
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const hospitalId = await resolveHospitalId(sb, body.hospitalId ?? null);
  const productId = body.productId && /^[0-9a-f]{8}-/.test(body.productId) ? body.productId : null;
  const reservationId = body.reservationId && /^[0-9a-f]{8}-/.test(body.reservationId) ? body.reservationId : null;
  const doctorId = body.doctorId && /^[0-9a-f]{8}-/.test(body.doctorId) ? body.doctorId : null;
  const treatmentDate = parsed.data.treatmentDate || null;
  let treatmentName = typeof body.treatmentName === 'string' ? body.treatmentName : null;
  if (productId) {
    const { data: product } = await sb.from('products').select('hospital_id, title').eq('id', productId).maybeSingle();
    if (!product || product.hospital_id !== hospitalId) return NextResponse.json({ error: '병원과 시술 정보가 일치하지 않습니다.' }, { status: 400 });
    treatmentName = product.title;
  }
  if (doctorId) {
    const { data: doctor } = await sb.from('doctors').select('hospital_id').eq('id', doctorId).maybeSingle();
    if (!doctor || doctor.hospital_id !== hospitalId) return NextResponse.json({ error: '해당 병원의 의사를 선택해주세요.' }, { status: 400 });
  }

  if (reservationId) {
    const { data: reservation } = await sb
      .from('reservations')
      .select('id, user_id, status, hospital_id, product_id')
      .eq('id', reservationId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!reservation) {
      return NextResponse.json({ error: '예약 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    if (reservation.hospital_id !== hospitalId || reservation.product_id !== productId) return NextResponse.json({ error: '예약의 병원과 시술 정보가 일치하지 않습니다.' }, { status: 400 });
    if (!['confirmed', 'completed'].includes(reservation.status)) {
      return NextResponse.json({ error: '확정 또는 완료된 예약만 후기를 작성할 수 있습니다.' }, { status: 400 });
    }
    const { data: duplicateByReservation } = await sb
      .from('reviews')
      .select('id')
      .eq('reservation_id', reservationId)
      .maybeSingle();
    if (duplicateByReservation) {
      return NextResponse.json({ error: '이미 작성된 후기입니다.' }, { status: 409 });
    }
  }

  if (productId || hospitalId) {
    let duplicateQuery = sb
      .from('reviews')
      .select('id')
      .eq('author_id', user.id)
      .limit(1);
    duplicateQuery = productId
      ? duplicateQuery.eq('product_id', productId)
      : duplicateQuery.eq('hospital_id', hospitalId);
    if (treatmentDate) duplicateQuery = duplicateQuery.eq('treatment_date', treatmentDate);
    const { data: duplicate } = await duplicateQuery.maybeSingle();
    if (duplicate) {
      return NextResponse.json({ error: '이미 작성된 후기입니다.' }, { status: 409 });
    }
  }

  const { data, error } = await sb
    .from('reviews')
    .insert({
      author_id: user.id,
      reservation_id: reservationId,
      hospital_id: hospitalId,
      product_id: productId,
      doctor_id: doctorId,
      rating: parsed.data.rating,
      content: parsed.data.content,
      treatment_name: treatmentName,
      treatment_date: treatmentDate,
      total_cost: parsed.data.totalCost,
      before_image: parsed.data.beforeImage || null,
      after_image: parsed.data.afterImage || null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Award 500P (idempotent: only on first review per reservation/product/day)
  await sb.from('point_history').insert({
    user_id: user.id,
    type: 'earn',
    description: '후기작성',
    amount: 500,
  });
  // Bump cached profile.points
  const { data: profile } = await sb.from('profiles').select('points, name').eq('id', user.id).maybeSingle();
  if (profile) {
    await sb.from('profiles').update({ points: (profile.points ?? 0) + 500 }).eq('id', user.id);
  }

  // Notify reviewer
  await writeNotifications({
    user_id: user.id,
    type: 'info',
    title: '후기 작성 완료',
    content: '소중한 후기 감사합니다! 500P가 적립되었어요.',
    link: '/mypage/points',
  });

  // Notify hospital owner of new review
  if (hospitalId) {
    const { data: hospitalRow } = await sb
      .from('hospitals')
      .select('owner_id, name')
      .eq('id', hospitalId)
      .maybeSingle();
    if (hospitalRow?.owner_id) {
      await writeNotifications({
        user_id: hospitalRow.owner_id,
        type: 'important',
        title: '새 후기가 등록되었습니다',
        content: `${profile?.name ?? '회원'}님이 ${hospitalRow.name}에 후기를 남겼습니다.`,
        link: `/hospital/manage`,
      });
    }
  }

  return NextResponse.json({ id: data.id });
}
