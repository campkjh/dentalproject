/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function resolveHospitalId(sb: any, hospitalIdOrSlug: string) {
  if (/^[0-9a-f]{8}-/.test(hospitalIdOrSlug)) return hospitalIdOrSlug;
  const { data } = await sb.from('hospitals').select('id').eq('slug', hospitalIdOrSlug).maybeSingle();
  return data?.id ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const hospitalId = await resolveHospitalId(sb, body.hospitalId);
  if (!hospitalId) return NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 });

  const productId = body.productId && /^[0-9a-f]{8}-/.test(body.productId) ? body.productId : null;
  const doctorId = body.doctorId && /^[0-9a-f]{8}-/.test(body.doctorId) ? body.doctorId : null;

  const { data, error } = await sb
    .from('reservations')
    .insert({
      user_id: user.id,
      hospital_id: hospitalId,
      product_id: productId,
      doctor_id: doctorId,
      visit_at: body.visitAt ?? null,
      amount: body.amount ?? 0,
      customer_name: body.customerName ?? '',
      customer_phone: body.customerPhone ?? '',
      payment_type: body.paymentType ?? null,
      payment_method: body.paymentMethod ?? null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Create notification for the user
  await sb.from('notifications').insert({
    user_id: user.id,
    type: 'info',
    title: '예약이 접수되었습니다',
    content: `${body.customerName ?? '회원'}님의 예약이 접수되었습니다. 병원 확인 후 알려드릴게요.`,
    link: `/reservations/${data.id}`,
  });

  // Notify hospital owner if exists
  const { data: hospitalRow } = await sb
    .from('hospitals')
    .select('owner_id, name')
    .eq('id', hospitalId)
    .maybeSingle();
  if (hospitalRow?.owner_id) {
    await sb.from('notifications').insert({
      user_id: hospitalRow.owner_id,
      type: 'important',
      title: '새 예약이 들어왔습니다',
      content: `${body.customerName ?? '회원'}님이 ${hospitalRow.name}에 예약을 신청했습니다.`,
      link: `/hospital/appointments`,
    });
  }

  return NextResponse.json({ id: data.id });
}
