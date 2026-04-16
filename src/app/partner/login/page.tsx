'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Info } from 'lucide-react';

export default function PartnerLoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userId.trim() || !pw.trim()) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/partner');
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 partner-page shadow-[0_10px_40px_rgba(124,58,237,0.08)]">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center text-white text-[14px] font-black">
              K
            </div>
            <span className="text-[15px] font-bold text-gray-900">키닥터 파트너센터</span>
          </div>

          <h1 className="text-[20px] font-bold text-gray-900 mb-1">로그인</h1>
          <p className="text-[12px] text-gray-500 mb-6">
            병원 관리자 계정으로 로그인해주세요.
          </p>

          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="text-[12px] font-semibold text-gray-700 block mb-1.5">아이디</span>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="아이디"
                autoComplete="username"
                className="w-full px-3 py-3 border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#7C3AED] transition-colors"
              />
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-gray-700 block mb-1.5">비밀번호</span>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="비밀번호"
                  autoComplete="current-password"
                  className="w-full pl-3 pr-10 py-3 border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#7C3AED] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-gray-100 text-gray-400"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between text-[12px]">
              <label className="flex items-center gap-1.5 text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4"
                />
                아이디 저장
              </label>
              <Link href="#" className="text-gray-500 hover:text-gray-900">
                비밀번호 찾기
              </Link>
            </div>

            {error && (
              <div className="flex items-start gap-1.5 rounded-lg bg-[#FFF1F0] text-[12px] text-[#E5484D] px-3 py-2">
                <Info size={12} className="mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-[14px] font-bold btn-press"
              style={{
                backgroundColor: '#7C3AED',
                color: '#fff',
                boxShadow: '0 6px 16px rgba(124, 58, 237, 0.3)',
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-gray-400">또는</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <Link
            href="/hospital/register"
            className="block w-full py-3 rounded-lg border border-gray-200 text-[14px] font-semibold text-gray-700 text-center hover:bg-gray-50 transition-colors"
          >
            병원 신청하기
          </Link>

          <p className="mt-6 text-[11px] text-gray-400 leading-relaxed text-center">
            비밀번호는 안전하게 암호화되어 저장됩니다.
            <br />
            파트너 고객센터: <span className="font-semibold text-gray-600">1588-0000</span>
          </p>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-4">
          © 2026 키닥터. All rights reserved.
        </p>
      </div>
    </div>
  );
}
