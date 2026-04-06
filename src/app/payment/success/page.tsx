'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { products } from '@/lib/mock-data';

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

  const product = products.find((p) => p.id === productId) ?? products[0];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Credit Card Icon */}
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 bounce-in">
          <CreditCard size={40} className="text-blue-500" />
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
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🦷</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 line-clamp-2">
                {product.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{product.hospitalName}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{product.location}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Home Button */}
      <div className="px-4 py-6">
        <button
          onClick={() => router.push('/')}
          className="w-full py-3.5 bg-[#7C3AED] text-white rounded-xl font-bold text-sm btn-press"
        >
          홈으로
        </button>
      </div>
    </div>
  );
}
