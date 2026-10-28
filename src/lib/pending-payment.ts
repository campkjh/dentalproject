'use client';

/**
 * 결제창을 열기 전에 만든 예약을 기억해 두었다가, 결제를 끝내지 않고 돌아온 경우(안드로이드 뒤로가기,
 * 결제창 닫기 등으로 successUrl/failUrl을 거치지 않은 경우) 그 예약을 바로 취소한다.
 * 결제 완료/실패 페이지에 도착하면 기록을 지운다.
 */
const KEY = 'pending-payment-reservation';

export function markPendingPayment(reservationId: string) {
  try {
    sessionStorage.setItem(KEY, reservationId);
  } catch {
    // sessionStorage를 쓸 수 없는 환경이면 30분 자동 취소에 맡긴다
  }
}

export function clearPendingPayment() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // noop
  }
}

/** 결제가 끝나지 않은 채 남은 예약이 있으면 취소한다. */
export function cancelAbandonedPayment() {
  let reservationId: string | null = null;
  try {
    reservationId = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    return;
  }
  if (!reservationId) return;
  fetch(`/api/reservations/${encodeURIComponent(reservationId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled', cancelReason: '결제를 완료하지 않아 예약이 취소되었습니다.' }),
  }).catch(() => {});
}
