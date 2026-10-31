'use client';

// 알림 — 상품 상세(261031) 톤: 회색 칩 거르기(고르면 연파랑) · 테두리 없는 알림 줄(누름 r16) · 회색 아이콘 칸 · 종류 배지 · 안 읽음 파랑 점.

import { useState, useMemo } from 'react';
import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

// 알림 종류 — 토스 흑백 아이콘 + 배지(중요=파랑 · 이벤트/추천=연파랑 · 안내/업데이트=회색)
const TYPE_CFG: Record<string, { icon: string; tone: string; label: string }> = {
  important: { icon: 'check-circle', tone: 'bg-[#E8F3FF] text-[#3180F7]', label: '중요' },
  event: { icon: 'gift', tone: 'bg-[#EFF5FE] text-[#2F6FE4]', label: '이벤트' },
  recommendation: { icon: 'calendar-check', tone: 'bg-[#EFF5FE] text-[#2F6FE4]', label: '추천' },
  info: { icon: 'info-circle', tone: 'bg-[#F2F4F6] text-[#6B7684]', label: '안내' },
  update: { icon: 'bell', tone: 'bg-[#F2F4F6] text-[#6B7684]', label: '업데이트' },
};

function relTime(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return d.toLocaleDateString('ko-KR');
}

export default function PartnerNoticesPage() {
  const { authUser } = useSession();
  const notifications = useStore((s) => s.notifications);
  const [filter, setFilter] = useState<'전체' | string>('전체');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (filter === '전체') return notifications;
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const markAllRead = async () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
    await Promise.all(
      notifications
        .filter((n) => !n.isRead && /^[0-9a-f]{8}-/.test(n.id))
        .map((n) => fetch(`/api/notifications/${n.id}/read`, { method: 'POST' }))
    );
  };

  if (!authUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
          <MonoIcon name="lock" size={34} color="#B0B8C1" />
        </span>
        <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">로그인이 필요해요</p>
        <Link href="/login" className="mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold text-[#3180F7]">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white pb-12">
      <TopBar
        title="알림"
        sub="예약·후기·병원 상태 변경 같은 알림을 한곳에서 확인해요."
        rightContent={
          <button type="button" onClick={markAllRead} className="pd-head-text-btn">
            모두 읽음
          </button>
        }
      />

      {/* 거르기 칩 — 회색 면, 고르면 연파랑 */}
      <div className="qd-a-item flex gap-2 overflow-x-auto px-5 pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(['전체', 'important', 'event', 'recommendation', 'info', 'update'] as const).map((f) => {
          const on = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex h-9 shrink-0 items-center rounded-[8px] px-3 text-[14.5px] font-semibold transition-colors ${on ? 'bg-[#EFF5FE] text-[#2F6FE4]' : 'bg-[#F2F4F6] text-[#333D4B]'}`}
            >
              {f === '전체' ? '전체' : TYPE_CFG[f]?.label ?? f}
            </button>
          );
        })}
      </div>

      <div className="qd-a-item px-3 pt-2" style={{ animationDelay: '.06s' }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
              <MonoIcon name="bell" size={34} color="#B0B8C1" />
            </span>
            <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">알림이 없어요</p>
            <p className="mt-1.5 text-[15px] leading-[1.6] text-[#8B95A1]">새 예약·후기가 생기면 여기로 알려 드려요</p>
          </div>
        ) : (
          <div>
            {filtered.map((n) => {
              const cfg = TYPE_CFG[n.type] ?? TYPE_CFG.info;
              const isRead = readIds.has(n.id) || n.isRead;
              const inner = (
                <div className={`flex items-start gap-3 rounded-[16px] px-2 py-3.5 transition-colors ${n.link ? 'active:bg-[#F9FAFB]' : ''}`}>
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#F2F4F6]">
                    <MonoIcon name={cfg.icon} size={20} color="#6B7684" />
                    {!isRead && <span aria-label="새 알림" className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#3180F7]" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex h-6 shrink-0 items-center rounded-[6px] px-2 text-[13px] font-semibold ${cfg.tone}`}>{cfg.label}</span>
                      <span className="ml-auto shrink-0 text-[13px] text-[#B0B8C1]">{relTime(n.date)}</span>
                    </div>
                    <p className={`mt-1.5 truncate text-[16px] ${isRead ? 'font-semibold text-[#4E5968]' : 'font-bold text-[#191F28]'}`}>{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[14px] leading-[1.5] text-[#6B7684]">{n.content}</p>
                  </div>
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} className="block">
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
