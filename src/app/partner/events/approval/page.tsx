'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
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

const STATUS: Record<EventRow['status'], { text: string; bg: string; color: string }> = {
  draft: { text: '임시저장', bg: '#F3F4F6', color: '#6B7280' },
  pending: { text: '승인대기', bg: '#FFF8E1', color: '#B45309' },
  approved: { text: '승인', bg: '#E6F7EB', color: '#15803D' },
  active: { text: '노출중', bg: '#E6F7EB', color: '#15803D' },
  rejected: { text: '반려', bg: '#FFF1F0', color: '#E5484D' },
  ended: { text: '종료', bg: '#F3F4F6', color: '#6B7280' },
};

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
      <div className="bg-white rounded-xl p-10 text-center">
        <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다.</p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">이벤트 검수 현황</h1>
        <p className="text-[12px] text-gray-500 mt-1">제출한 이벤트의 승인 상태를 확인합니다.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-1">
        {(['전체', 'pending', 'approved', 'rejected', 'ended'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
            style={{
              backgroundColor: filter === f ? '#2B313D' : '#F4F5F7',
              color: filter === f ? '#fff' : '#51535C',
            }}
          >
            {f === '전체' ? '전체' : STATUS[f]?.text ?? f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400">해당하는 이벤트가 없습니다.</p>
        </div>
      ) : (
        <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {filtered.map((e) => {
            const s = STATUS[e.status];
            return (
              <li key={e.id}>
                <Link href={`/partner/events/${e.id}/edit`} className="flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] font-bold text-gray-900 truncate">{e.title}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: s.bg, color: s.color }}>
                        {s.text}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">제출: {new Date(e.created_at).toLocaleString('ko-KR')}</p>
                    {e.reject_reason && (
                      <p className="text-[11px] text-red-500 mt-1">반려 사유: {e.reject_reason}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
