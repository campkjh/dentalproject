'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
type EventRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  original_price: number | null;
  sale_price: number | null;
  discount_percent: number | null;
  start_at: string | null;
  end_at: string | null;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active' | 'ended';
  view_count: number;
  like_count: number;
  reject_reason: string | null;
};

const STATUS_LABEL: Record<EventRow['status'], { text: string; bg: string; color: string }> = {
  draft: { text: '임시저장', bg: '#F3F4F6', color: '#6B7280' },
  pending: { text: '검수 중', bg: '#FFF8E1', color: '#B45309' },
  approved: { text: '승인됨', bg: '#E6F7EB', color: '#15803D' },
  active: { text: '노출 중', bg: '#E6F7EB', color: '#15803D' },
  rejected: { text: '거절됨', bg: '#FFF1F0', color: '#E5484D' },
  ended: { text: '종료', bg: '#F3F4F6', color: '#6B7280' },
};

export default function EventsListPage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const [items, setItems] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

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

  const filtered = useMemo(
    () => items.filter((i) => !q || i.title.includes(q)),
    [items, q]
  );

  const handleDelete = async (id: string) => {
    if (!confirm('이 이벤트를 삭제하시겠습니까?')) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    const res = await fetch(`/api/my-hospital/events/${id}`, { method: 'DELETE' });
    if (!res.ok) showToast('삭제 실패');
    else showToast('삭제되었습니다.');
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">이벤트 목록</h1>
          <p className="text-[12px] text-gray-500 mt-1">총 {items.length}건</p>
        </div>
        <Link
          href="/partner/events/new"
          className="px-3 py-2 rounded-lg bg-[#7C3AED] text-white text-[12px] font-bold btn-press flex items-center gap-1"
        >
          <Plus size={13} /> 이벤트 등록
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이벤트명 검색"
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 rounded-lg outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400 mb-4">등록된 이벤트가 없습니다.</p>
          <Link href="/partner/events/new" className="text-[#7C3AED] text-sm font-bold">
            첫 이벤트 등록하기
          </Link>
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-3">
          {filtered.map((e) => {
            const s = STATUS_LABEL[e.status];
            return (
              <li key={e.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="aspect-[16/9] bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                  {e.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={e.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">📋</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-[14px] font-bold text-gray-900 line-clamp-1 flex-1">{e.title}</h3>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ backgroundColor: s.bg, color: s.color }}
                    >
                      {s.text}
                    </span>
                  </div>
                  {e.description && (
                    <p className="text-[12px] text-gray-500 line-clamp-2 mb-3">{e.description}</p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mb-3">
                    {e.sale_price ? (
                      <span className="text-[14px] font-extrabold text-[#7C3AED]">
                        {e.sale_price.toLocaleString()}원
                      </span>
                    ) : (
                      <span>—</span>
                    )}
                    {e.start_at && e.end_at && (
                      <span>
                        {new Date(e.start_at).toLocaleDateString('ko-KR')} ~ {new Date(e.end_at).toLocaleDateString('ko-KR')}
                      </span>
                    )}
                  </div>
                  {e.reject_reason && (
                    <p className="text-[11px] text-red-500 mb-2">반려 사유: {e.reject_reason}</p>
                  )}
                  <div className="flex gap-2">
                    <Link
                      href={`/partner/events/${e.id}/edit`}
                      className="flex-1 py-2 text-center text-[12px] font-bold border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      편집
                    </Link>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="flex-1 py-2 text-[12px] font-bold border border-red-200 rounded-lg text-red-600 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
