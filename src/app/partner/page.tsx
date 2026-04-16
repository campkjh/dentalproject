'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ConsultRoom = {
  id: string;
  user_id: string;
  last_message: string | null;
  last_at: string;
  user?: { name?: string | null } | null;
  unread?: number;
};

const CATEGORY_COLOR: Record<string, string> = {
  일반: 'bg-[#E8F3FF] text-[#1E6FD9]',
  이벤트: 'bg-[#FEF3C7] text-[#B45309]',
  공지: 'bg-[#EDE7FF] text-[#6D28D9]',
  결제: 'bg-[#E6F7EB] text-[#15803D]',
};

function relTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return d.toLocaleDateString('ko-KR');
}

export default function PartnerHomePage() {
  const announcements = useStore((s) => s.announcements);
  const { authUser } = useSession();
  const [hospital, setHospital] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [chats, setChats] = useState<ConsultRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [myRes, chatRes] = await Promise.all([
          fetch('/api/my-hospital', { cache: 'no-store' }),
          fetch('/api/partner/consult-rooms', { cache: 'no-store' }),
        ]);
        if (!myRes.ok) return;
        const my = await myRes.json();
        const chatsJson = chatRes.ok ? await chatRes.json() : { rooms: [] };
        if (cancelled) return;
        setHospital(my.hospital);
        setReservations(my.reservations ?? []);
        setReviews(my.reviews ?? []);
        setChats(chatsJson.rooms ?? []);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  // KPI computations
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const tomorrowStart = todayStart + 86400000;
  const dayAfter = todayStart + 2 * 86400000;

  const todayConsults = chats.length;
  const tomorrowReservations = reservations.filter((r) => {
    if (!r.visit_at) return false;
    const t = new Date(r.visit_at).getTime();
    return t >= tomorrowStart && t < dayAfter;
  });
  const tomorrowConfirmed = tomorrowReservations.filter((r) => r.status === 'confirmed').length;
  const pendingReservations = reservations.filter((r) => r.status === 'pending').length;

  const reviewWithoutReply = reviews.length; // placeholder — can refine when reply table exists

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(announcements.length / pageSize));
  const pageNotices = announcements.slice((page - 1) * pageSize, page * pageSize);

  const unreadChats = useMemo(() => chats.filter((c) => (c.unread ?? 0) > 0), [chats]);

  if (!authUser) {
    return (
      <div className="bg-white rounded-xl p-10 text-center">
        <p className="text-sm text-gray-500 mb-4">파트너센터는 로그인 후 이용 가능합니다.</p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>;
  }

  if (!hospital) {
    return (
      <div className="bg-white rounded-xl p-10 text-center">
        <p className="text-sm text-gray-500 mb-2">등록된 병원이 없습니다.</p>
        <p className="text-xs text-gray-400 mb-6">병원 등록 후 파트너센터를 이용할 수 있어요.</p>
        <Link href="/hospital/register" className="inline-block px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-xl">
          병원 등록하기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hospital status banner */}
      {hospital.status === 'pending' && (
        <section
          className="rounded-xl px-6 py-5 text-center"
          style={{
            background: 'linear-gradient(90deg, #FFF9E5 0%, #FFF4C9 100%)',
            border: '1px solid #F8E191',
          }}
        >
          <p className="text-[14px] font-bold text-gray-900">
            ⏳ <span className="text-[#E89D2A]">{hospital.name}</span> 승인 대기 중입니다
          </p>
          <p className="text-[12px] text-gray-600 mt-2">
            관리자 승인 후 카탈로그에 노출되고 예약을 받을 수 있습니다.
          </p>
        </section>
      )}

      {/* KPI cards — real numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="진행 중 채팅 상담"
          value={todayConsults.toString()}
          delta={unreadChats.length > 0 ? `미답변 ${unreadChats.length}` : '모두 응답'}
          deltaTone={unreadChats.length > 0 ? 'warn' : 'up'}
          href="/partner/chat"
        />
        <KpiCard
          label="확정 대기 예약"
          value={pendingReservations.toString()}
          delta={pendingReservations > 0 ? '확인 필요' : '모두 처리됨'}
          deltaTone={pendingReservations > 0 ? 'warn' : 'up'}
          href="/partner/reservations"
        />
        <KpiCard
          label="내일 예약"
          value={tomorrowReservations.length.toString()}
          delta={`확정 ${tomorrowConfirmed}`}
          deltaTone="neutral"
          href="/partner/reservations"
        />
        <KpiCard
          label="총 후기"
          value={reviewWithoutReply.toString()}
          delta="누적"
          deltaTone="neutral"
          href="/partner/reviews"
        />
      </div>

      {/* Two-column: notices + chat */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
        {/* Notices */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-[14px] font-bold text-gray-900">공지사항</h2>
            <Link href="/partner/notices" className="text-[11px] text-gray-400 hover:text-gray-600">
              전체보기 <ChevronRight size={11} className="inline" />
            </Link>
          </div>
          {pageNotices.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-[12px] text-gray-400">등록된 공지가 없어요</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pageNotices.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/mypage/announcements/${n.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 flex-shrink-0 ${CATEGORY_COLOR['공지']}`}>
                      [공지]
                    </span>
                    <span className="flex-1 text-[13px] text-gray-800 truncate">{n.title}</span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0 w-[92px] text-right">
                      {n.date}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 py-3 border-t border-gray-100">
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-6 h-6 rounded text-[11px] font-semibold flex items-center justify-center"
                    style={{
                      backgroundColor: page === p ? '#2B313D' : 'transparent',
                      color: page === p ? '#fff' : '#51535C',
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Chat panel */}
        <aside className="bg-white rounded-xl border border-gray-200 overflow-hidden h-fit">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-[13px] font-bold text-gray-900">최근 채팅 상담</h2>
            <button
              aria-label="새로고침"
              onClick={() => location.reload()}
              className="p-1 -m-1 rounded hover:bg-gray-100 text-gray-400"
            >
              <RefreshCw size={13} />
            </button>
          </div>
          {chats.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[12px] text-gray-400">아직 상담이 없어요</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {chats.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/partner/chat?roomId=${c.id}`}
                    className="flex items-start gap-2 px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#F4F5F7] text-gray-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                      {c.user?.name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[12px] font-semibold text-gray-900 truncate">
                          {c.user?.name ?? '익명'}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">
                          {relTime(c.last_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{c.last_message ?? '(메시지 없음)'}</p>
                    </div>
                    {(c.unread ?? 0) > 0 && (
                      <span className="flex-shrink-0 text-[9px] font-bold text-white bg-[#FF5B5B] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                        {c.unread}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  delta,
  deltaTone,
  href,
}: {
  label: string;
  value: string;
  suffix?: string;
  delta?: string;
  deltaTone: 'up' | 'down' | 'warn' | 'neutral';
  href: string;
}) {
  const deltaColor = {
    up: '#15803D',
    down: '#E5484D',
    warn: '#B45309',
    neutral: '#6B7280',
  }[deltaTone];
  return (
    <Link
      href={href}
      className="block bg-white rounded-xl border border-gray-200 p-4 partner-card"
    >
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-[22px] font-extrabold text-gray-900 mt-1 leading-none">
        {value}
        {suffix && <span className="text-[12px] font-semibold text-gray-600 ml-1">{suffix}</span>}
      </p>
      {delta && (
        <p className="text-[11px] font-semibold mt-1.5" style={{ color: deltaColor }}>
          {delta}
        </p>
      )}
    </Link>
  );
}
