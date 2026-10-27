import { NextResponse, type NextRequest } from 'next/server';
import { broadcastReservationChange } from '@/lib/realtime/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * 토스페이먼츠 웹훅.
 *
 * 개발자센터 > 웹훅에 이 주소(/api/payments/webhook)를 등록하고
 * `DEPOSIT_CALLBACK`(가상계좌 입금·취소), `PAYMENT_STATUS_CHANGED`(만료 등) 이벤트를 구독한다.
 *
 * 웹훅 본문은 위조될 수 있으므로 상태를 그대로 믿지 않는다.
 * 본문에서 orderId만 꺼내고, 시크릿키로 토스 결제 조회 API를 호출해 실제 상태를 확인한 뒤 반영한다.
 */
export async function POST(req: NextRequest) {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: 'TOSS_SECRET_KEY 미설정' }, { status: 500 });

  const body = (await req.json().catch(() => null)) as
    | { orderId?: string; data?: { orderId?: string } }
    | null;
  // DEPOSIT_CALLBACK은 최상위에, PAYMENT_STATUS_CHANGED는 data 안에 orderId가 있다.
  const orderId = body?.orderId ?? body?.data?.orderId;
  if (!orderId) return NextResponse.json({ ok: true, ignored: 'no orderId' });

  const tossRes = await fetch(
    `https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(orderId)}`,
    { headers: { Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}` } }
  );
  if (!tossRes.ok) {
    // 우리 상점의 주문이 아니거나 조회 실패 — 재시도해도 의미 없으므로 200으로 응답
    return NextResponse.json({ ok: true, ignored: 'lookup failed' });
  }
  const payment = (await tossRes.json()) as { status?: string; approvedAt?: string | null };

  const admin = await createAdminClient();
  const { data: reservation } = await admin
    .from('reservations')
    .select('id, user_id, hospital_id, status, payment_status')
    .eq('order_id', orderId)
    .maybeSingle();
  if (!reservation) return NextResponse.json({ ok: true, ignored: 'no reservation' });

  const nowIso = new Date().toISOString();

  if (payment.status === 'DONE' && reservation.payment_status !== 'paid') {
    await admin
      .from('reservations')
      .update({ payment_status: 'paid', paid_at: payment.approvedAt ?? nowIso, updated_at: nowIso })
      .eq('id', reservation.id);

    if (reservation.user_id) {
      await admin.from('notifications').insert({
        user_id: reservation.user_id,
        type: 'important',
        title: '입금이 확인되었습니다',
        content: '무통장입금 결제가 완료되었어요.',
        link: `/reservations/${reservation.id}`,
      });
    }
  } else if (
    (payment.status === 'EXPIRED' || payment.status === 'CANCELED' || payment.status === 'ABORTED') &&
    reservation.payment_status !== 'canceled'
  ) {
    const expired = payment.status === 'EXPIRED';
    await admin
      .from('reservations')
      .update({
        payment_status: 'canceled',
        status: 'cancelled',
        cancel_at: nowIso,
        cancel_reason: expired
          ? '입금 기한이 지나 예약이 취소되었습니다.'
          : '결제가 취소되어 예약이 취소되었습니다.',
        updated_at: nowIso,
      })
      .eq('id', reservation.id);

    if (reservation.user_id && reservation.status !== 'cancelled') {
      await admin.from('notifications').insert({
        user_id: reservation.user_id,
        type: 'important',
        title: '예약이 취소되었습니다',
        content: expired
          ? '무통장입금 기한이 지나 예약이 자동 취소되었어요.'
          : '결제가 취소되어 예약이 취소되었어요.',
        link: `/reservations/${reservation.id}`,
      });
    }
  } else {
    return NextResponse.json({ ok: true, unchanged: payment.status ?? null });
  }

  await broadcastReservationChange({
    event: 'UPDATE',
    reservationId: reservation.id,
    hospitalId: reservation.hospital_id,
    userId: reservation.user_id,
  });

  return NextResponse.json({ ok: true, status: payment.status });
}
