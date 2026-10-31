'use client';

// 이벤트 검수 현황 — 상품 상세(261031) 톤: 회색 칩 거르기(고르면 연파랑) · 테두리 없는 목록 줄 · 상태 배지.

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { useSession } from '@/lib/supabase/SessionProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
type EventRow = {
  id: string;
  title: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active' | 'ended';
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
};

// 상태 배지 — 대기=회색 · 승인/노출=파랑 · 반려=빨강
const STATUS: Record<EventRow['status'], { text: string; tone: string }> = {
  draft: { text: '임시저장', tone: 'bg-[#F2F4F6] text-[#6B7684]' },
  pending: { text: '승인대기', tone: 'bg-[#F2F4F6] text-[#6B7684]' },
  approved: { text: '승인', tone: 'bg-[#E8F3FF] text-[#3180F7]' },
  active: { text: '노출중', tone: 'bg-[#E8F3FF] text-[#3180F7]' },
  rejected: { text: '반려', tone: 'bg-[#FFEEEF] text-[#F04452]' },
  ended: { text: '종료', tone: 'bg-[#F2F4F6] text-[#6B7684]' },
};

const FILTERS = ['전체', 'pending', 'approved', 'rejected', 'ended'] as const;

export default function EventApprovalPage() {
  const { authUser } = useSession();
  const [items, setItems] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'전체' | EventRow['status']>('전체');

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my-hospital/events', { cache: 'no-store' });
        if (!res.ok) return;
        const { events } = await res.json();
        if (cancelled) return;
        setItems(events ?? []);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const filtered = useMemo(() => {
    if (filter === '전체') return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

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
      <TopBar title="이벤트 검수 현황" sub="제출한 이벤트의 승인 상태를 확인해요." />

      {/* 거르기 칩 — 회색 면, 고르면 연파랑 */}
      <div className="qd-a-item flex gap-2 overflow-x-auto px-5 pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => {
          const on = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex h-9 shrink-0 items-center rounded-[8px] px-3 text-[14.5px] font-semibold transition-colors ${on ? 'bg-[#EFF5FE] text-[#2F6FE4]' : 'bg-[#F2F4F6] text-[#333D4B]'}`}
            >
              {f === '전체' ? '전체' : STATUS[f].text}
            </button>
          );
        })}
      </div>

      <div className="qd-a-item px-3 pt-2" style={{ animationDelay: '.06s' }}>
        {loading ? (
          <p className="py-20 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
              <MonoIcon name="document-check" size={34} color="#B0B8C1" />
            </span>
            <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">해당하는 이벤트가 없어요</p>
          </div>
        ) : (
          <ul>
            {filtered.map((e) => {
              const s = STATUS[e.status];
              return (
                <li key={e.id}>
                  <Link href={`/partner/events/${e.id}/edit`} className="flex items-center gap-3 rounded-[16px] px-2 py-3.5 transition-colors active:bg-[#F9FAFB]">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-6 shrink-0 items-center rounded-[6px] px-2 text-[13.5px] font-semibold ${s.tone}`}>{s.text}</span>
                        <span className="min-w-0 truncate text-[17px] font-bold text-[#191F28]">{e.title}</span>
                      </div>
                      <p className="mt-1 text-[14px] text-[#8B95A1]">제출 {new Date(e.created_at).toLocaleString('ko-KR')}</p>
                      {e.reject_reason && <p className="mt-1 line-clamp-2 text-[14px] leading-[1.5] text-[#F04452]">반려 사유: {e.reject_reason}</p>}
                    </div>
                    <ChevronRight size={20} className="shrink-0 text-[#B0B8C1]" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
