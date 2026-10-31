'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MonoIcon from '@/components/common/MonoIcon';
import { siteConfig } from '@/lib/site-config';
import { clearPendingPayment } from '@/lib/pending-payment';

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
  // 결제창에서 정상적으로 돌아왔으므로 '결제 미완료 예약' 기록을 지운다
  useEffect(() => {
    clearPendingPayment();
  }, []);
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

  const tel = siteConfig.phone.replace(/[^0-9+]/g, '');

  return (
    <div className="mx-auto min-h-screen max-w-[640px] bg-white" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 112px), 128px)' }}>
      <div className="px-5 pt-[min(22vh,160px)]">
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isUserCancel ? '/icons/color/exclamation-yellow.svg' : '/icons/color/warning-red.svg'}
            alt=""
            width={56}
            height={56}
            className="bounce-in h-14 w-14"
          />
          <h1 className="qd-a-item mt-5 text-[22px] font-bold tracking-[-0.5px] text-[#191F28]" style={{ animationDelay: '.16s' }}>
            {isUserCancel ? '결제가 취소됐어요' : '결제에 실패했어요'}
          </h1>
          <p className="qd-a-item mt-2 whitespace-pre-line break-keep text-[15px] leading-[1.55] text-[#6B7684]" style={{ animationDelay: '.23s' }}>
            {isUserCancel
              ? '결제가 진행되지 않아 예약도 함께 취소됐어요.\n다시 예약하려면 처음부터 진행해 주세요.'
              : message
                ? message
                : '자세한 내용은 고객센터로 문의해 주세요.'}
          </p>
        </div>

        <div className="qd-a-item mt-8" style={{ animationDelay: '.3s' }}>
          <p className="flex min-h-11 items-center py-1.5">
            <span className="w-[86px] shrink-0 text-[17px] text-[#8B95A1]">고객센터</span>
            <span className="min-w-0 flex-1 text-[17px] text-[#333D4B]">{siteConfig.phone}</span>
          </p>
          <p className="mt-3 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
            <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
            결제 중 빠져나간 금액이 있다면 고객센터로 알려 주세요.
          </p>
        </div>
      </div>

      {/* 바닥 버튼 — 흐림 띠 위에 떠 있다 · 같은 폭 두 개 */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40" style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)' }}>
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, white 30%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.5) 70%, rgba(255,255,255,0) 100%)',
            maskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
          }}
        />
        <div className="pointer-events-auto relative mx-auto flex max-w-[608px] gap-2 pt-10">
          <a
            href={`tel:${tel}`}
            className="flex h-14 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[18px] bg-[#F2F4F6] text-[17px] font-bold text-[#4E5968] transition-all active:scale-[0.98]"
          >
            <MonoIcon name="call" size={18} color="#6B7684" />
            고객센터
          </a>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex h-14 min-w-0 flex-1 items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98]"
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
