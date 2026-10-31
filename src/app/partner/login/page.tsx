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

  // 261031 로그인 = 아래 모달 시트(아이디·비번) + 위에서 병원관리자 화면 조각이 흘러가는 장면.
  // 시트 윗변은 흰 그라데이션이라 흘러가는 카드가 시트 밑으로 스며들어 사라진다.
  return (
    <div className="pl-stage relative flex min-h-[100dvh] flex-col overflow-hidden bg-[linear-gradient(180deg,#E6F0FF_0%,#F3F7FF_46%,#FFFFFF_100%)]">
      {/* 브랜드 · 제목 */}
      <div className="relative z-10 mx-auto w-full max-w-[440px] px-5 pt-[calc(env(safe-area-inset-top)+28px)]">
        <div className="qd-a-item flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white shadow-[0_2px_8px_rgba(47,111,228,0.12)]">
            <MonoIcon name="stethoscope" size={22} color="#2F6FE4" />
          </span>
          <span className="text-[16px] font-bold tracking-[-0.3px] text-[#333D4B]">마이닥 파트너센터</span>
        </div>
        <h1 className="qd-a-item mt-5 text-[26px] font-bold leading-[1.35] tracking-[-0.6px] text-[#191F28]" style={{ animationDelay: '.06s' }}>
          예약부터 정산까지
          <br />
          병원 운영을 한곳에서
        </h1>
      </div>

      {/* 흘러가는 병원관리자 화면 조각 */}
      <span aria-hidden className="pointer-events-none absolute -left-16 top-40 h-56 w-56 rounded-full bg-[#BFD6FF]/60 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -right-20 top-72 h-64 w-64 rounded-full bg-[#CFEAFF]/60 blur-3xl" />
      <div aria-hidden className="pl-marquee relative min-h-[300px] flex-1 select-none pt-6">
        {PL_ROWS.map((row, i) => (
          <div key={i} className="pl-row mb-3.5 flex w-max gap-3.5 pr-3.5" style={{ animationDuration: `${row.dur}s`, animationDirection: i % 2 ? 'reverse' : 'normal' }}>
            {[...row.cards, ...row.cards].map((c, j) => <PlCard key={j} card={c} />)}
          </div>
        ))}
      </div>

      {/* 로그인 시트 */}
      <div className="pl-sheet relative z-20 -mt-20">
        <div className="pointer-events-none h-20 bg-gradient-to-b from-white/0 via-white/80 to-white" />
        <div className="mx-auto w-full max-w-[440px] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#E5E8EB]" />
          <h2 className="text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">병원 관리자 계정으로 로그인해 주세요</h2>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="아이디"
              aria-label="아이디"
              autoComplete="username"
              className="h-14 w-full rounded-[14px] border-0 bg-[#F2F4F6] px-4 text-[16px] font-medium text-[#191F28] outline-none transition-colors placeholder:text-[#B0B8C1] focus:bg-[#EDEFF2]"
            />
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="비밀번호"
                aria-label="비밀번호"
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

            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-[15px] text-[#4E5968]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="sr-only"
                />
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

            <div className="!mt-5 flex gap-2">
              <Link
                href="/hospital/register"
                className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#F2F4F6] text-[17px] font-bold text-[#4E5968] transition-all active:scale-[0.98] active:bg-[#E5E8EB]"
              >
                병원 신청하기
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98] active:bg-[#3D74DE] disabled:opacity-60"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </div>
          </form>

          <p className="mt-4 text-center text-[13px] text-[#B0B8C1]">파트너 고객센터 1588-0000 · © 2026 마이닥</p>
        </div>
      </div>
    </div>
  );
}

// ── 흘러가는 카드(장식) ─────────────────────────────────────────
type PlCardData =
  | { kind: 'reserve'; badge: '확정' | '대기' | '완료'; name: string; when: string }
  | { kind: 'money'; label: string; amount: string }
  | { kind: 'review'; text: string; score: string }
  | { kind: 'chat'; text: string }
  | { kind: 'note'; icon: string; title: string; sub: string }
  | { kind: 'chart'; label: string; bars: number[] };

const PL_ROWS: { dur: number; cards: PlCardData[] }[] = [
  {
    dur: 38,
    cards: [
      { kind: 'reserve', badge: '확정', name: '김*연 · 임플란트 상담', when: '오늘 오후 2:30' },
      { kind: 'money', label: '오늘 앱결제', amount: '1,280,000원' },
      { kind: 'review', text: '설명을 정말 친절하게 해주셨어요', score: '5.0' },
      { kind: 'note', icon: 'bell', title: '새 예약 3건', sub: '확정을 기다리고 있어요' },
    ],
  },
  {
    dur: 46,
    cards: [
      { kind: 'chat', text: '내일 오전에도 예약 가능할까요?' },
      { kind: 'reserve', badge: '대기', name: '박*수 · 스케일링', when: '내일 오전 10:00' },
      { kind: 'money', label: '이번 주 정산 예정', amount: '3,420,000원' },
      { kind: 'note', icon: 'gift', title: '이벤트 승인 완료', sub: '치아미백 49,000원' },
    ],
  },
  {
    dur: 42,
    cards: [
      { kind: 'chart', label: '이번 달 예약', bars: [38, 52, 44, 66, 58, 80, 72] },
      { kind: 'reserve', badge: '완료', name: '이*진 · 라미네이트', when: '어제 오후 4:00' },
      { kind: 'note', icon: 'star', title: '평균 평점 4.9', sub: '리뷰 128개' },
      { kind: 'note', icon: 'megaphone', title: '광고 노출 2.4만', sub: '지난 7일' },
    ],
  },
];

const PL_BADGE = {
  확정: 'bg-[#E8F3FF] text-[#3180F7]',
  대기: 'bg-[#F2F4F6] text-[#6B7684]',
  완료: 'bg-[#E6F7EE] text-[#03A94D]',
} as const;

// 카드 = 유리 면(흰 82% + 블러) · 안쪽 흰 윤곽 · 겹 그림자 · 같은 높이 · 머리줄(종류 · 시각)
const PL_GLASS = 'relative h-[112px] w-[224px] shrink-0 overflow-hidden rounded-[22px] bg-white/[0.82] px-4 pb-3.5 pt-3 backdrop-blur-xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.9),0_1px_2px_rgba(30,58,120,0.04),0_10px_28px_-6px_rgba(30,58,120,0.14)]';

function PlHead({ icon, label, time, dark }: { icon: string; label: string; time: string; dark?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <MonoIcon name={icon} size={13} color={dark ? 'rgba(255,255,255,0.7)' : '#8B95A1'} />
      <span className={`text-[12px] font-semibold tracking-[-0.1px] ${dark ? 'text-white/70' : 'text-[#8B95A1]'}`}>{label}</span>
      <span className={`ml-auto text-[11.5px] ${dark ? 'text-white/50' : 'text-[#B0B8C1]'}`}>{time}</span>
    </div>
  );
}

function PlCard({ card }: { card: PlCardData }) {
  switch (card.kind) {
    case 'reserve':
      return (
        <div className={PL_GLASS}>
          <PlHead icon="calendar-check" label="예약" time="방금" />
          <div className="mt-2.5 flex items-center gap-2">
            <span className={`inline-flex h-[22px] items-center rounded-[6px] px-1.5 text-[12px] font-semibold ${PL_BADGE[card.badge]}`}>{card.badge}</span>
            <p className="min-w-0 truncate text-[15px] font-bold tracking-[-0.3px] text-[#191F28]">{card.name}</p>
          </div>
          <p className="mt-1.5 text-[13.5px] font-medium text-[#6B7684]">{card.when}</p>
        </div>
      );
    case 'money':
      return (
        <div className={`${PL_GLASS} !bg-[linear-gradient(135deg,#2F6FE4_0%,#1E3A78_100%)] !shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_12px_30px_-8px_rgba(30,58,120,0.45)]`}>
          <span aria-hidden className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10" />
          <PlHead icon="coin" label={card.label} time="실시간" dark />
          <p className="mt-3 text-[24px] font-bold tracking-[-0.8px] text-white">{card.amount}</p>
        </div>
      );
    case 'review':
      return (
        <div className={PL_GLASS}>
          <PlHead icon="star" label="새 리뷰" time="5분 전" />
          <p className="mt-2 flex items-center gap-1 text-[13px] font-bold text-[#191F28]">
            <span className="tracking-[1px] text-[#FFC342]">★★★★★</span>{card.score}
          </p>
          <p className="mt-1 line-clamp-2 text-[13.5px] leading-[1.45] text-[#4E5968]">“{card.text}”</p>
        </div>
      );
    case 'chat':
      return (
        <div className={PL_GLASS}>
          <PlHead icon="chat-bubble" label="상담 문의" time="1분 전" />
          <p className="mt-2.5 rounded-[14px] rounded-tl-[4px] bg-[#F2F4F6] px-3 py-2 text-[13.5px] leading-[1.45] text-[#333D4B]">{card.text}</p>
        </div>
      );
    case 'note':
      return (
        <div className={PL_GLASS}>
          <PlHead icon={card.icon} label="알림" time="오늘" />
          <div className="mt-2.5 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[linear-gradient(145deg,#EAF2FF,#D7E6FD)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]">
              <MonoIcon name={card.icon} size={20} color="#2F6FE4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold tracking-[-0.3px] text-[#191F28]">{card.title}</span>
              <span className="block truncate text-[13px] text-[#8B95A1]">{card.sub}</span>
            </span>
          </div>
        </div>
      );
    case 'chart':
      return (
        <div className={PL_GLASS}>
          <PlHead icon="chart-bar" label={card.label} time="+18%" />
          <div className="mt-3 flex h-[48px] items-end gap-1.5">
            {card.bars.map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-[5px]"
                style={{ height: `${h}%`, background: i === card.bars.length - 2 ? 'linear-gradient(180deg,#6A9BF4,#2F6FE4)' : '#E3ECFB' }}
              />
            ))}
          </div>
        </div>
      );
  }
}
