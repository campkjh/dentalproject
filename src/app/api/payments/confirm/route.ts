import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

/**
 * 토스페이먼츠 결제 승인(confirm).
 *
 * 결제창에서 successUrl로 리다이렉트되면 클라이언트가 이 라우트를 호출한다.
 * 서버에서 시크릿키로 승인 API를 호출해야 실제 결제가 완료된다(토스 필수 요건).
 *
 * 금액 위·변조 방지: 클라이언트가 넘긴 amount를 그대로 믿지 않고,
 * DB에 저장된 예약 금액(reservations.amount)과 대조한 뒤 그 값으로 승인한다.
 */
export async function POST(req: NextRequest) {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: '결제 설정이 완료되지 않았습니다. (TOSS_SECRET_KEY 미설정)' },
      { status: 500 }
    );
  }

  let body: { paymentKey?: string; orderId?: string; amount?: number | string; reservationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const { paymentKey, orderId, reservationId } = body;
  const amount = Number(body.amount);
  if (!paymentKey || !orderId || !reservationId || !Number.isFinite(amount)) {
    return NextResponse.json({ error: '결제 정보가 올바르지 않습니다.' }, { status: 400 });
  }

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  // 예약 조회 + 소유자/금액 검증
  const { data: reservation, error: resErr } = await sb
    .from('reservations')
    .select('id, user_id, amount, payment_status')
    .eq('id', reservationId)
    .maybeSingle();

  if (resErr) return NextResponse.json({ error: resErr.message }, { status: 400 });
  if (!reservation) return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
  if (reservation.user_id !== user.id) {
    return NextResponse.json({ error: '본인의 예약이 아닙니다.' }, { status: 403 });
  }

  // 이미 결제 완료된 예약이면 중복 승인하지 않고 성공 처리(멱등성)
  if (reservation.payment_status === 'paid') {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  if (reservation.amount !== amount) {
    return NextResponse.json(
      { error: '결제 금액이 예약 금액과 일치하지 않습니다.' },
      { status: 400 }
    );
  }

  // 토스 결제 승인 호출 (시크릿키는 서버에서만 사용)
  const tossRes = await fetch(TOSS_CONFIRM_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  const tossData = await tossRes.json().catch(() => ({}));

  if (!tossRes.ok) {
    // 승인 실패 — 예약을 결제 실패로 표시
    await sb
      .from('reservations')
      .update({ payment_status: 'failed', order_id: orderId })
      .eq('id', reservationId);
    return NextResponse.json(
      { error: tossData?.message ?? '결제 승인에 실패했습니다.', code: tossData?.code ?? null },
      { status: 400 }
    );
  }

  // 승인 성공 — 예약에 결제 결과 기록
  const { error: updateErr } = await sb
    .from('reservations')
    .update({
      payment_status: 'paid',
      payment_key: paymentKey,
      order_id: orderId,
      paid_at: tossData?.approvedAt ?? new Date().toISOString(),
      payment_method: tossData?.method ?? '앱결제',
    })
    .eq('id', reservationId);

  if (updateErr) {
    // 결제는 성공했으나 기록 실패 — 사용자에겐 성공을 반환하되 서버 로그 남김
    console.error('[payments/confirm] 결제 승인 성공했으나 예약 갱신 실패:', updateErr.message, {
      reservationId,
      orderId,
      paymentKey,
    });
  }

  return NextResponse.json({
    ok: true,
    method: tossData?.method ?? null,
    approvedAt: tossData?.approvedAt ?? null,
  });
}
