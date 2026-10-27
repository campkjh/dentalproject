/**
 * 토스페이먼츠 서버 전용 헬퍼. 시크릿키를 쓰므로 서버(API 라우트)에서만 import 한다.
 */

type CancelResult = { ok: true; status: string | null } | { ok: false; code: string | null; message: string };

/** 결제 전액 취소. 카드는 환불, 입금 전 가상계좌는 발급 취소가 된다. */
export async function cancelTossPayment(paymentKey: string, cancelReason: string): Promise<CancelResult> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) return { ok: false, code: null, message: '결제 설정이 완료되지 않았습니다. (TOSS_SECRET_KEY 미설정)' };

  const res = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
      'Content-Type': 'application/json',
      // 같은 결제를 두 번 취소 요청해도 한 번만 처리되도록
      'Idempotency-Key': `cancel-${paymentKey}`,
    },
    body: JSON.stringify({ cancelReason: cancelReason.slice(0, 200) }),
  });
  const data = await res.json().catch(() => ({}));

  // 이미 취소된 결제는 성공으로 본다
  if (!res.ok && data?.code !== 'ALREADY_CANCELED_PAYMENT') {
    return { ok: false, code: data?.code ?? null, message: data?.message ?? '결제 취소에 실패했습니다.' };
  }
  return { ok: true, status: data?.status ?? 'CANCELED' };
}
