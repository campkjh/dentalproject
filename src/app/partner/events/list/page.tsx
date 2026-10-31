'use client';

// 이벤트 목록 — 상품 상세(261031) 톤: 회색 검색 칸 · 테두리 없는 목록 줄(누름 r16) · 상태 배지 · 남색 가격 · 같은 폭 작은 버튼.

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
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

// 상태 배지 — 대기=회색 · 승인/노출=파랑 · 거절=빨강
const GRAY = 'bg-[#F2F4F6] text-[#6B7684]';
const BLUE = 'bg-[#E8F3FF] text-[#3180F7]';
const RED = 'bg-[#FFEEEF] text-[#F04452]';
const STATUS_LABEL: Record<EventRow['status'], { text: string; tone: string }> = {
  draft: { text: '임시저장', tone: GRAY },
  pending: { text: '검수 중', tone: GRAY },
  approved: { text: '승인됨', tone: BLUE },
  active: { text: '노출 중', tone: BLUE },
  rejected: { text: '거절됨', tone: RED },
  ended: { text: '종료', tone: GRAY },
};

export default function EventsListPage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const showConfirm = useStore((s) => s.showConfirm);
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

  const handleDelete = (id: string) => {
    showConfirm('이벤트 삭제', '이 이벤트를 삭제하시겠습니까?', async () => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      const res = await fetch(`/api/my-hospital/events/${id}`, { method: 'DELETE' });
      if (!res.ok) showToast('삭제 실패');
      else showToast('삭제되었습니다.');
    });
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
        title="이벤트 목록"
        sub={`총 ${items.length}건의 이벤트를 관리해요.`}
        rightContent={
          <Link href="/partner/events/new" className="pd-head-text-btn inline-flex items-center gap-1">
            <MonoIcon name="plus" size={16} color="#3180F7" />
            등록
          </Link>
        }
      />

      <div className="qd-a-item relative mx-5 mt-1">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
          <MonoIcon name="search" size={20} color="#8B95A1" />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이벤트명 검색"
          className="!h-12 !min-h-0 w-full !rounded-[14px] !border-0 !bg-[#F2F4F6] !py-0 !pl-11 !pr-4 !text-[16px] !font-medium !text-[#191F28] outline-none transition-colors placeholder:!text-[#B0B8C1] focus:!bg-[#EDEFF2] focus:!shadow-none"
        />
      </div>

      <div className="qd-a-item px-3 pt-3" style={{ animationDelay: '.06s' }}>
        {loading ? (
          <p className="py-20 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
              <MonoIcon name="gift" size={34} color="#B0B8C1" />
            </span>
            <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">등록된 이벤트가 없어요</p>
            <p className="mt-1.5 text-[15px] leading-[1.6] text-[#8B95A1]">이벤트를 올리면 검수 뒤 환자에게 보여요</p>
            <Link href="/partner/events/new" className="mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold text-[#3180F7]">
              첫 이벤트 등록하기
            </Link>
          </div>
        ) : (
          <ul>
            {filtered.map((e) => {
              const s = STATUS_LABEL[e.status];
              return (
                <li key={e.id} className="flex items-start gap-3.5 rounded-[16px] px-2 py-4">
                  <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#F2F4F6]">
                    {e.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={e.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <MonoIcon name="picture" size={26} color="#B0B8C1" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`inline-flex h-6 items-center rounded-[6px] px-2 text-[13.5px] font-semibold ${s.tone}`}>{s.text}</span>
                    <h3 className="mt-1.5 truncate text-[17px] font-bold leading-[1.35] text-[#191F28]">{e.title}</h3>
                    {e.description && (
                      <p className="mt-0.5 line-clamp-2 text-[14px] leading-[1.5] text-[#6B7684]">{e.description}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-3">
                      {e.sale_price ? (
                        <span className="text-[17px] font-bold text-[#1E3A78]">{e.sale_price.toLocaleString()}원</span>
                      ) : (
                        <span className="text-[15px] text-[#B0B8C1]">—</span>
                      )}
                      {e.start_at && e.end_at && (
                        <span className="truncate text-[13.5px] text-[#8B95A1]">
                          {new Date(e.start_at).toLocaleDateString('ko-KR')} ~ {new Date(e.end_at).toLocaleDateString('ko-KR')}
                        </span>
                      )}
                    </div>
                    {e.reject_reason && (
                      <p className="mt-2 rounded-[12px] bg-[#FFEEEF] px-3 py-2.5 text-[14px] leading-[1.5] text-[#F04452]">반려 사유: {e.reject_reason}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/partner/events/${e.id}/edit`}
                        className="flex h-10 flex-1 items-center justify-center rounded-[12px] bg-[#F2F4F6] text-[15px] font-semibold text-[#333D4B] transition-all active:scale-[0.98] active:bg-[#E5E8EB]"
                      >
                        편집
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(e.id)}
                        className="flex h-10 flex-1 items-center justify-center rounded-[12px] bg-[#F2F4F6] text-[15px] font-semibold text-[#F04452] transition-all active:scale-[0.98] active:bg-[#E5E8EB]"
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
    </div>
  );
}
