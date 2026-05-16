'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Bell, Building2, CalendarDays, ChevronRight, MessageSquare, RefreshCw, Star } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import {
  PartnerButton,
  PartnerEmpty,
  PartnerListRow,
  PartnerPanel,
  PartnerStatCard,
  PartnerStatusBadge,
  PartnerTop,
} from '@/components/partner/tds';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ConsultRoom = {
  id: string;
  user_id: string;
  last_message: string | null;
  last_at: string;
  user?: { name?: string | null } | null;
  unread?: number;
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

  const reviewWithoutReply = reviews.length;

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(announcements.length / pageSize));
  const pageNotices = announcements.slice((page - 1) * pageSize, page * pageSize);

  const unreadChats = useMemo(() => chats.filter((c) => (c.unread ?? 0) > 0), [chats]);

  if (!authUser) {
    return (
      <div className="bg-white rounded-[16px] p-10 text-center">
        <p className="text-[15px] text-[rgba(0,19,43,0.58)] mb-4">파트너센터는 로그인 후 이용 가능합니다.</p>
        <Link href="/partner/login" className="tds-button-primary inline-flex min-w-[120px]">
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
      <div className="bg-white rounded-[16px] p-10 text-center">
        <p className="text-[15px] text-[rgba(0,19,43,0.58)] mb-2">등록된 병원이 없습니다.</p>
        <p className="text-[13px] text-[rgba(0,19,43,0.58)] mb-6">병원 등록 후 파트너센터를 이용할 수 있어요.</p>
        <Link href="/hospital/register" className="tds-button-primary inline-flex min-w-[160px]">
          병원 등록하기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PartnerTop
        eyebrow="파트너센터"
        title="운영 현황"
        description={`${hospital.name}의 상담, 예약, 후기를 확인합니다.`}
        icon={<Building2 size={28} strokeWidth={2.2} />}
      />

      {hospital.status === 'pending' && (
        <PartnerPanel className="bg-[#FFF8E1] border-[#F3D28A] p-5">
          <p className="text-[17px] font-bold leading-[23px] text-[#191F28]">
            {hospital.name} 승인 대기 중
          </p>
          <p className="mt-1 text-[13px] leading-[19.5px] text-[rgba(3,18,40,0.7)]">
            관리자 승인 후 카탈로그에 노출되고 예약을 받을 수 있습니다.
          </p>
        </PartnerPanel>
      )}

      <div className="grid grid-cols-2 gap-3">
        <PartnerStatCard
          label="진행 중 채팅 상담"
          value={todayConsults.toString()}
          sub={unreadChats.length > 0 ? `미답변 ${unreadChats.length}` : '모두 응답'}
          accent={unreadChats.length > 0}
          icon={<MessageSquare size={18} />}
        />
        <PartnerStatCard
          label="확정 대기 예약"
          value={pendingReservations.toString()}
          sub={pendingReservations > 0 ? '확인 필요' : '모두 처리됨'}
          accent={pendingReservations > 0}
          icon={<CalendarDays size={18} />}
        />
        <PartnerStatCard
          label="내일 예약"
          value={tomorrowReservations.length.toString()}
          sub={`확정 ${tomorrowConfirmed}`}
          icon={<CalendarDays size={18} />}
        />
        <PartnerStatCard
          label="총 후기"
          value={reviewWithoutReply.toString()}
          sub="누적"
          icon={<Star size={18} />}
        />
      </div>

      <PartnerPanel className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,27,55,0.06)]">
          <h2>공지사항</h2>
          <PartnerButton href="/partner/notices" variant="text" tone="neutral" size="s" rightIcon={<ChevronRight size={15} />}>
            전체
          </PartnerButton>
        </div>
          {pageNotices.length === 0 ? (
            <PartnerEmpty icon={<Bell size={24} />} title="등록된 공지가 없어요" />
          ) : (
            <div>
              {pageNotices.map((n) => (
                <PartnerListRow
                  key={n.id}
                  href={`/mypage/announcements/${n.id}`}
                  icon={<Bell size={16} />}
                  title={n.title}
                  description={<PartnerStatusBadge tone="info">공지</PartnerStatusBadge>}
                  meta={n.date}
                />
              ))}
            </div>
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
      </PartnerPanel>

      <PartnerPanel className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,27,55,0.06)]">
            <h2>최근 채팅 상담</h2>
            <button
              aria-label="새로고침"
              onClick={() => location.reload()}
              className="w-8 h-8 rounded-full bg-[rgba(7,25,76,0.05)] hover:bg-[rgba(7,25,76,0.08)] text-[rgba(3,18,40,0.7)] flex items-center justify-center"
            >
              <RefreshCw size={13} />
            </button>
          </div>
          {chats.length === 0 ? (
            <PartnerEmpty icon={<MessageSquare size={24} />} title="아직 상담이 없어요" />
          ) : (
            <div>
              {chats.slice(0, 5).map((c) => (
                <PartnerListRow
                  key={c.id}
                  href={`/partner/chat?roomId=${c.id}`}
                  icon={<span className="text-[12px] font-bold">{c.user?.name?.[0] ?? '?'}</span>}
                  title={c.user?.name ?? '익명'}
                  description={c.last_message ?? '(메시지 없음)'}
                  meta={
                    <span className="flex flex-col items-end gap-1">
                      <span>{relTime(c.last_at)}</span>
                      {(c.unread ?? 0) > 0 && <PartnerStatusBadge tone="danger">{c.unread}</PartnerStatusBadge>}
                    </span>
                  }
                />
              ))}
            </div>
          )}
      </PartnerPanel>
    </div>
  );
}
