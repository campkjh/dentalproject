'use client';

import { useRouter } from 'next/navigation';
import { Frown } from 'lucide-react';

export default function PaymentFailPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Sad Face Icon */}
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 bounce-in">
          <Frown size={40} className="text-gray-400" />
        </div>

        {/* Heading */}
        <h1 className="text-xl font-bold text-gray-900 mb-2 fade-in-up">
          결제에 실패했습니다.
        </h1>
        <p className="text-sm text-gray-500 mb-4">
          자세한 사항은 고객센터로 연락부탁드립니다.
        </p>

        {/* Customer Service */}
        <p className="text-sm font-medium text-gray-700">
          고객센터 1588-1380
        </p>
      </div>

      {/* Home Button */}
      <div className="px-2.5 py-6">
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
