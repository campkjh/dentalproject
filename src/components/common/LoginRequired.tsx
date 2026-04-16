'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function LoginRequired() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 scale-in">
        <Lock size={28} className="text-gray-400" />
      </div>
      <h2 className="text-lg font-bold mb-2 fade-in-up">로그인이 필요한 페이지입니다!</h2>
      <p className="text-sm text-[#7C3AED] text-center mb-6 fade-in-up-delay-1">
        로그인하시면 더 많은 내용과 서비스를 이용하실 수 있습니다.
      </p>
      <Link
        href="/login"
        className="w-full max-w-xs py-3.5 rounded-xl text-center text-[14px] font-bold text-white btn-press fade-in-up-delay-2"
        style={{
          backgroundColor: '#7C3AED',
          boxShadow: '0 6px 16px rgba(124,58,237,0.25)',
        }}
      >
        로그인 / 회원가입
      </Link>
    </div>
  );
}
