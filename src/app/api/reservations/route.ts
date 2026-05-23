/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { broadcastReservationChange } from '@/lib/realtime/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function scheduleKeysFromVisitAt(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const direct = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (direct) {
    return {
      dayKey: `date:${direct[1]}`,
      slotKey: `slot:${direct[1]}:${direct[2]}`,
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  const dateKey = `${part('year')}-${part('month')}-${part('day')}`;
  const timeKey = `${part('hour')}:${part('minute')}`;
  return {
    dayKey: `date:${dateKey}`,
    slotKey: `slot:${dateKey}:${timeKey}`,
  };
}

function parseVisitAt(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

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
  const visitAt = parseVisitAt(body.visitAt);
  if (!visitAt) {
    return NextResponse.json({ error: '예약 시간을 선택해주세요.' }, { status: 400 });
  }
  if (visitAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: '이미 지난 예약 시간입니다.' }, { status: 400 });
  }

  const scheduleKeys = scheduleKeysFromVisitAt(body.visitAt);

  if (scheduleKeys) {
    const admin = await createAdminClient();
    const { data: blockedRows, error: blockedError } = await admin
      .from('operating_hours')
      .select('day')
      .eq('hospital_id', hospitalId)
      .eq('is_closed', true)
      .in('day', [scheduleKeys.dayKey, scheduleKeys.slotKey]);

    if (blockedError) {
      return NextResponse.json({ error: blockedError.message }, { status: 400 });
    }
    if ((blockedRows ?? []).length > 0) {
      return NextResponse.json({ error: '병원에서 비활성화한 예약 시간입니다.' }, { status: 400 });
    }
  }

  const { data, error } = await sb
    .from('reservations')
    .insert({
      user_id: user.id,
      hospital_id: hospitalId,
      product_id: productId,
      doctor_id: doctorId,
      visit_at: visitAt.toISOString(),
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

  await broadcastReservationChange({
    event: 'INSERT',
    reservationId: data.id,
    hospitalId,
    userId: user.id,
  });

  return NextResponse.json({ id: data.id });
}
