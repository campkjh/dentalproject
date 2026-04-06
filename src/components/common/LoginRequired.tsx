'use client';

import { Lock } from 'lucide-react';
import { useStore } from '@/store';

export default function LoginRequired() {
  const { login } = useStore();

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 scale-in">
        <Lock size={28} className="text-gray-400" />
      </div>
      <h2 className="text-lg font-bold mb-2 fade-in-up">로그인이 필요한 페이지입니다!</h2>
      <p className="text-sm text-[#7C3AED] text-center mb-6 fade-in-up-delay-1">
        로그인하시면 더 많은 내용과 서비스를 이용하실 수 있습니다.
      </p>
      <div className="flex gap-3 w-full max-w-xs fade-in-up-delay-2">
        <button
          onClick={() => login('kakao')}
          className="flex-1 py-3 bg-[#FEE500] text-black rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
        >
          <span>●</span> 카카오 로그인
        </button>
        <button
          onClick={() => login('apple')}
          className="flex-1 py-3 bg-black text-white rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
        >
          <span></span> 애플 로그인
        </button>
      </div>
    </div>
  );
}
