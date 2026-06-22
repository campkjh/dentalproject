'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Info } from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';

export default function PartnerLoginPage() {
  const router = useRouter();
  const { authUser, loading: sessionLoading, signInWithEmail } = useSession();
  const isDoctor = useStore((s) => s.isDoctor);
  const [userId, setUserId] = useState(() => (
    typeof window === 'undefined' ? '' : window.localStorage.getItem('partner_login_email') ?? ''
  ));
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(() => (
    typeof window === 'undefined' ? false : Boolean(window.localStorage.getItem('partner_login_email'))
  ));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionLoading || !authUser) return;
    if (isDoctor) router.replace('/partner');
  }, [authUser, isDoctor, router, sessionLoading]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userId.trim() || !pw.trim()) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    const { error, isDoctor } = await signInWithEmail(userId.trim(), pw);
    setLoading(false);
    if (error) {
      setError('아이디 또는 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!isDoctor) {
      setError('병원 관리자 계정만 이용할 수 있습니다.');
      return;
    }
    if (remember) {
      window.localStorage.setItem('partner_login_email', userId.trim());
    } else {
      window.localStorage.removeItem('partner_login_email');
    }
    router.replace('/partner');
  };

  return (
    <div className="tds-screen min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        <div className="bg-white rounded-[16px] border border-[rgba(0,27,55,0.1)] p-6 partner-page shadow-[0_10px_32px_rgba(25,31,40,0.08)]">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-[12px] bg-[#8037FF] flex items-center justify-center text-white text-[15px] font-bold">
              K
            </div>
            <span className="text-[17px] font-bold text-[#191F28]">마이닥 파트너센터</span>
          </div>

          <h1 className="text-[28px] leading-[37px] font-bold text-[#191F28] mb-1">로그인</h1>
          <p className="text-[17px] leading-[25.5px] text-[rgba(3,18,40,0.7)] mb-6">
            병원 관리자 계정으로 로그인해주세요.
          </p>

          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="tds-field-label">아이디</span>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="아이디"
                autoComplete="username"
                className="tds-input"
              />
            </label>

            <label className="block">
              <span className="tds-field-label">비밀번호</span>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="비밀번호"
                  autoComplete="current-password"
                  className="tds-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-[rgba(7,25,76,0.05)] text-[rgba(3,24,50,0.46)]"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between text-[13px]">
              <label className="flex items-center gap-1.5 text-[rgba(3,18,40,0.7)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4"
                />
                아이디 저장
              </label>
              <Link href="#" className="text-[rgba(0,19,43,0.58)] hover:text-[#191F28]">
                비밀번호 찾기
              </Link>
            </div>

            {error && (
              <div className="flex items-start gap-1.5 rounded-lg bg-[#FFF1F0] text-[12px] text-[#E5484D] px-3 py-2">
                <Info size={12} className="mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="tds-button-primary w-full disabled:opacity-80">
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
            className="tds-button-weak w-full"
          >
            병원 신청하기
          </Link>

          <p className="mt-6 text-[12px] text-[rgba(0,19,43,0.58)] leading-relaxed text-center">
            비밀번호는 안전하게 암호화되어 저장됩니다.
            <br />
            파트너 고객센터: <span className="font-semibold text-[rgba(3,18,40,0.7)]">1588-0000</span>
          </p>
        </div>

        <p className="text-center text-[12px] text-[rgba(0,19,43,0.58)] mt-4">
          © 2026 마이닥. All rights reserved.
        </p>
      </div>
    </div>
  );
}
