'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Frown } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';

/** 사용자가 결제창을 닫거나 취소했을 때 토스가 failUrl에 붙여 보내는 코드. */
const USER_CANCEL_CODES = new Set(['PAY_PROCESS_CANCELED', 'USER_CANCEL']);

export default function PaymentFailPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩중...</div>}>
      <PaymentFailPage />
    </Suspense>
  );
}

function PaymentFailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 토스 결제창 실패 시 failUrl에 code/message가 붙는다.
  const code = searchParams.get('code');
  const message = searchParams.get('message');
  const reservationId = searchParams.get('reservationId');
  const isUserCancel = code ? USER_CANCEL_CODES.has(code) : false;

  // 결제 페이지는 결제창을 열기 전에 예약을 먼저 만든다.
  // 결제가 완료되지 않았으므로 그 예약을 취소해 '결제 대기' 예약이 남지 않게 한다.
  useEffect(() => {
    if (!reservationId) return;
    const doneKey = `payment-fail-cancelled:${reservationId}`;
    try {
      if (sessionStorage.getItem(doneKey)) return;
      sessionStorage.setItem(doneKey, '1');
    } catch {
      // sessionStorage를 쓸 수 없는 환경이면 그냥 진행한다.
    }
    fetch(`/api/reservations/${encodeURIComponent(reservationId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'cancelled',
        cancelReason: isUserCancel
          ? '결제를 취소하여 예약이 취소되었습니다.'
          : '결제가 완료되지 않아 예약이 취소되었습니다.',
      }),
    }).catch(() => {});
  }, [reservationId, isUserCancel]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Sad Face Icon */}
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 bounce-in">
          <Frown size={40} className="text-gray-400" />
        </div>

        {/* Heading */}
        <h1 className="text-xl font-bold text-gray-900 mb-2 fade-in-up">
          {isUserCancel ? '결제가 취소되었습니다.' : '결제에 실패했습니다.'}
        </h1>
        <p className="text-sm text-gray-500 mb-4 text-center whitespace-pre-line">
          {isUserCancel
            ? '결제가 진행되지 않아 예약도 함께 취소되었어요.\n다시 예약하시려면 처음부터 진행해 주세요.'
            : message
              ? message
              : '자세한 사항은 고객센터로 연락부탁드립니다.'}
        </p>

        {/* Customer Service */}
        <p className="text-sm font-medium text-gray-700">
          고객센터 {siteConfig.phone}
        </p>
      </div>

      {/* Home Button */}
      <div className="px-2.5 py-6">
        <button
          onClick={() => router.push('/')}
          className="w-full py-3.5 bg-[#8037FF] text-white rounded-xl font-bold text-sm btn-press"
        >
          홈으로
        </button>
      </div>
    </div>
  );
}
