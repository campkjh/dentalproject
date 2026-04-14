'use client';

import { useRouter } from 'next/navigation';
import { useStore } from '@/store';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useStore();

  const handleKakaoLogin = () => {
    login('kakao');
    router.push('/');
  };

  const handleAppleLogin = () => {
    login('apple');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto flex flex-col">
      {/* Logo & Title */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 bg-[#7C3AED] rounded-2xl flex items-center justify-center mb-6 bounce-in">
          <span className="text-4xl">🦷</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2 fade-in-up">키닥터</h1>
        <p className="text-sm text-gray-500 text-center fade-in-up-delay-1">
          쉽고 빠르게 나에게 맞는 병원을 찾아보세요
        </p>
      </div>

      {/* Login Buttons */}
      <div className="px-6 pb-12 space-y-3 fade-in-up-delay-2">
        <button
          onClick={handleKakaoLogin}
          className="w-full py-3.5 bg-[#FEE500] text-[#3C1E1E] rounded-xl font-medium flex items-center justify-center gap-2 text-sm hover:bg-[#FDD835] transition-colors btn-press"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1C4.58 1 1 3.79 1 7.21C1 9.35 2.44 11.21 4.6 12.27L3.82 15.19C3.76 15.39 3.98 15.56 4.16 15.44L7.56 13.28C8.03 13.34 8.51 13.37 9 13.37C13.42 13.37 17 10.58 17 7.16C17 3.79 13.42 1 9 1Z" fill="#3C1E1E"/>
          </svg>
          카카오 로그인
        </button>

        <button
          onClick={handleAppleLogin}
          className="w-full py-3.5 bg-black text-white rounded-xl font-medium flex items-center justify-center gap-2 text-sm hover:bg-gray-900 transition-colors btn-press"
        >
          <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
            <path d="M12.53 9.47C12.52 7.65 13.46 6.36 15 5.53C14.13 4.29 12.77 3.62 11.01 3.5C9.34 3.39 7.51 4.5 6.87 4.5C6.19 4.5 4.59 3.54 3.33 3.54C0.71 3.58 -1.5 5.7 -1.5 9.66C-1.5 10.88 -1.27 12.14 -0.81 13.44C-0.19 15.18 2.06 18.04 4.41 17.97C5.58 17.94 6.42 17.13 7.93 17.13C9.39 17.13 10.17 17.97 11.47 17.97C13.84 17.93 15.88 15.37 16.47 13.62C12.68 11.82 12.53 9.56 12.53 9.47Z" fill="white"/>
            <path d="M10.32 2.3C11.58 0.82 11.45 -0.53 11.41 -1C10.29 -0.94 8.99 -0.22 8.25 0.65C7.44 1.58 6.97 2.74 7.08 4.03C8.29 4.12 9.4 3.46 10.32 2.3Z" fill="white"/>
          </svg>
          애플 로그인
        </button>

        <p className="text-xs text-center text-gray-400 pt-2">
          로그인 시 <span className="underline">이용약관</span> 및{' '}
          <span className="underline">개인정보처리방침</span>에 동의합니다.
        </p>
      </div>
    </div>
  );
}
