'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, Loader2, Frown } from 'lucide-react';
import { resolveProductImageUrl } from '@/lib/images';
import { useStore } from '@/store';

export default function PaymentSuccessPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩중...</div>}>
      <PaymentSuccessPage />
    </Suspense>
  );
}

function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const reservationId = searchParams.get('reservationId');
  // 토스 결제창에서 리다이렉트되면 아래 쿼리 파라미터가 붙는다.
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amountParam = searchParams.get('amount');
  const needsConfirm = Boolean(paymentKey && orderId && amountParam && reservationId);

  const products = useStore((s) => s.products);
  const reservations = useStore((s) => s.reservations);
  const product = products.find((p) => p.id === productId);
  const reservation = reservations.find((item) => item.id === reservationId);
  const title = product?.title ?? reservation?.productTitle;
  const hospitalName = product?.hospitalName ?? reservation?.hospitalName;
  const location = product?.location ?? reservation?.location;
  const imageUrl = resolveProductImageUrl(
    product?.imageUrl ?? reservation?.productImage,
    product?.id ?? reservation?.productId ?? reservationId
  );

  // 결제 승인 상태: 토스 리다이렉트면 'confirming'에서 시작, 아니면 바로 'done'.
  const [status, setStatus] = useState<'confirming' | 'done' | 'error'>(
    needsConfirm ? 'confirming' : 'done'
  );
  const [errorMsg, setErrorMsg] = useState('');
  const confirmStartedRef = useRef(false);

  useEffect(() => {
    if (!needsConfirm || confirmStartedRef.current) return;
    confirmStartedRef.current = true;
    (async () => {
      try {
        const res = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amountParam),
            reservationId,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMsg(data?.error ?? '결제 승인에 실패했습니다.');
          setStatus('error');
          return;
        }
        setStatus('done');
      } catch {
        setErrorMsg('네트워크 오류로 결제 승인에 실패했습니다.');
        setStatus('error');
      }
    })();
  }, [needsConfirm, paymentKey, orderId, amountParam, reservationId]);

  // 결제 승인 중
  if (status === 'confirming') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <Loader2 size={40} className="text-[#8037FF] animate-spin mb-5" />
        <h1 className="text-lg font-bold text-gray-900">결제를 승인하고 있어요</h1>
        <p className="mt-2 text-sm text-gray-500">잠시만 기다려주세요. 창을 닫지 마세요.</p>
      </div>
    );
  }

  // 결제 승인 실패
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 bounce-in">
            <Frown size={40} className="text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">결제 승인에 실패했어요</h1>
          <p className="text-sm text-gray-500 mb-1 whitespace-pre-line">{errorMsg}</p>
          <p className="text-sm text-gray-400">결제가 취소되었습니다. 다시 시도해주세요.</p>
        </div>
        <div className="px-2.5 py-6 space-y-2">
          <button
            onClick={() => router.push('/mypage/payments')}
            className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm btn-press"
          >
            결제 내역 확인
          </button>
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

  if (!title || !reservationId) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-lg font-bold text-gray-900">예약 정보를 확인할 수 없습니다.</h1>
        <p className="mt-2 text-sm text-gray-500">마이페이지의 예약 내역에서 상태를 확인해주세요.</p>
        <button
          onClick={() => router.push('/mypage')}
          className="mt-6 px-5 py-2.5 rounded-xl bg-[#8037FF] text-white text-sm font-bold"
        >
          마이페이지로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Credit Card Icon */}
        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6 bounce-in">
          <CreditCard size={40} className="text-purple-500" />
        </div>

        {/* Heading */}
        <h1 className="text-xl font-bold text-gray-900 mb-2 fade-in-up">
          결제에 성공하였습니다!
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          예약이 완료되었어요!
        </p>

        {/* Product Info Card */}
        <div className="w-full bg-gray-50 rounded-xl p-4 fade-in-up-delay-1">
          <div className="flex gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 line-clamp-2">
                {title}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{hospitalName}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{location}</p>
            </div>
          </div>
        </div>
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
