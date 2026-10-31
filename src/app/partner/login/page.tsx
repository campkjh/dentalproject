'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';
import MonoIcon from '@/components/common/MonoIcon';

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

  // 261031 상품 상세 톤 — 테두리 카드 없이 흰 화면 · 회색 면 입력 칸(r14) · #4A82EE 큰 버튼(56 · r18) · 회색 안내 칸
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-white px-5 py-10 page-enter">
      <div className="w-full max-w-[400px]">
        {/* 브랜드 */}
        <div className="qd-a-item flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#EFF5FE]">
            <MonoIcon name="stethoscope" size={22} color="#2F6FE4" />
          </span>
          <span className="text-[16px] font-bold tracking-[-0.3px] text-[#333D4B]">마이닥 파트너센터</span>
        </div>

        <h1 className="qd-a-item mt-6 text-[26px] font-bold leading-[1.35] tracking-[-0.6px] text-[#191F28]" style={{ animationDelay: '.06s' }}>
          병원 관리자 계정으로
          <br />
          로그인해 주세요
        </h1>

        <form onSubmit={submit} className="qd-a-item mt-8 space-y-3" style={{ animationDelay: '.12s' }}>
          <label className="block">
            <span className="mb-2 block text-[14px] font-semibold text-[#4E5968]">아이디</span>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="아이디"
              autoComplete="username"
              className="h-14 w-full rounded-[14px] border-0 bg-[#F2F4F6] px-4 text-[16px] font-medium text-[#191F28] outline-none transition-colors placeholder:text-[#B0B8C1] focus:bg-[#EDEFF2]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[14px] font-semibold text-[#4E5968]">비밀번호</span>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="비밀번호"
                autoComplete="current-password"
                className="h-14 w-full rounded-[14px] border-0 bg-[#F2F4F6] pl-4 pr-12 text-[16px] font-medium text-[#191F28] outline-none transition-colors placeholder:text-[#B0B8C1] focus:bg-[#EDEFF2]"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[12px] transition-colors active:bg-[#E5E8EB]"
              >
                <MonoIcon name={showPw ? 'eye-off' : 'eye-on'} size={20} color="#8B95A1" />
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-[15px] text-[#4E5968]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="sr-only"
              />
              {/* 체크 동그라미 — 전역 .chk-dot(검색 화면 checkDot 과 같은 결) */}
              <span
                key={String(remember)}
                aria-hidden
                className={`chk-dot flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${remember ? 'is-on bg-[#2F6FE4]' : 'is-off border-2 border-[#E5E8EB]'}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={remember ? '#fff' : '#D1D6DB'} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>
              아이디 저장
            </label>
            <Link href="#" className="text-[15px] text-[#8B95A1] active:text-[#4E5968]">
              비밀번호 찾기
            </Link>
          </div>

          {error && (
            <p className="flex gap-2 rounded-[14px] bg-[#FFEEEF] px-4 py-3.5 text-[14px] leading-[1.5] text-[#F04452]">
              <MonoIcon name="exclamation-circle" size={18} color="#F04452" className="mt-px" />
              <span className="min-w-0 flex-1">{error}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="!mt-5 flex h-14 w-full items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98] active:bg-[#3D74DE] disabled:opacity-60"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
          <Link
            href="/hospital/register"
            className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[#F2F4F6] text-[17px] font-bold text-[#4E5968] transition-all active:scale-[0.98] active:bg-[#E5E8EB]"
          >
            병원 신청하기
          </Link>
        </form>

        <p className="qd-a-item mt-6 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]" style={{ animationDelay: '.18s' }}>
          <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
          <span className="min-w-0 flex-1">
            비밀번호는 안전하게 암호화되어 저장돼요.
            <br />
            파트너 고객센터 <span className="font-semibold text-[#333D4B]">1588-0000</span>
          </span>
        </p>

        <p className="mt-6 text-center text-[13px] text-[#B0B8C1]">© 2026 마이닥. All rights reserved.</p>
      </div>
    </div>
  );
}
