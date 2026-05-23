/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cancelExpiredPendingReservations, completePastConfirmedReservations } from '@/lib/db/reservation-status';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });

  const admin = await createAdminClient();
  await cancelExpiredPendingReservations(admin);
  await completePastConfirmedReservations(admin);

  const { data, error } = await sb
    .from('reservations')
    .select(
      `id, amount, payment_method, payment_type, status, reservation_at, cancel_at, customer_name,
       product:products (title),
       hospital:hospitals (name)`
    )
    .not('payment_method', 'is', null)
    .order('reservation_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const payments = (data ?? []).map((r: any) => {
    const amount = r.amount ?? 0;
    return {
      id: `PAY-${String(r.id).slice(0, 8).toUpperCase()}`,
      reservationId: r.id,
      customer: r.customer_name ?? '환자',
      product: r.product?.title ?? '-',
      hospital: r.hospital?.name ?? '-',
      amount,
      fee: Math.round(amount * 0.1),
      method: normalizeMethod(r.payment_method, r.payment_type),
      datetime: r.reservation_at
        ? new Date(r.reservation_at).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '',
      status: r.status === 'cancelled' ? '환불' : '완료',
    };
  });

  return NextResponse.json({ payments });
}

function normalizeMethod(method?: string | null, type?: string | null) {
  const value = `${method ?? ''} ${type ?? ''}`.toLowerCase();
  if (value.includes('kakao')) return '카카오페이';
  if (value.includes('toss')) return '토스';
  if (value.includes('naver')) return '네이버페이';
  if (value.includes('transfer') || value.includes('bank') || value.includes('계좌')) return '계좌이체';
  return '카드';
}
