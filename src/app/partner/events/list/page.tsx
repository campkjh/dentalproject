'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Gift, ImageIcon, Plus } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import {
  PartnerButton,
  PartnerEmpty,
  PartnerPanel,
  PartnerSearchField,
  PartnerStatusBadge,
  PartnerTop,
} from '@/components/partner/tds';

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

const STATUS_LABEL: Record<EventRow['status'], { text: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }> = {
  draft: { text: '임시저장', tone: 'neutral' },
  pending: { text: '검수 중', tone: 'warning' },
  approved: { text: '승인됨', tone: 'success' },
  active: { text: '노출 중', tone: 'success' },
  rejected: { text: '거절됨', tone: 'danger' },
  ended: { text: '종료', tone: 'neutral' },
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
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#8037FF] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PartnerTop
        eyebrow="이벤트 관리"
        title="이벤트 목록"
        description={`총 ${items.length}건의 이벤트를 관리합니다.`}
        icon={<Gift size={28} />}
        action={
          <PartnerButton href="/partner/events/new" size="m" leftIcon={<Plus size={16} />}>
            등록
          </PartnerButton>
        }
      />

      <PartnerSearchField value={q} onChange={setQ} placeholder="이벤트명 검색" />

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <PartnerEmpty
          icon={<Gift size={24} />}
          title="등록된 이벤트가 없습니다."
          action={<PartnerButton href="/partner/events/new" variant="weak" size="m">첫 이벤트 등록하기</PartnerButton>}
        />
      ) : (
        <PartnerPanel className="overflow-hidden">
          {filtered.map((e) => {
            const s = STATUS_LABEL[e.status];
            return (
              <article key={e.id} className="partner-list-row items-start">
                <div className="h-[64px] w-[64px] flex-shrink-0 overflow-hidden rounded-[16px] bg-[#F4EFFF] text-[#6D28D9] flex items-center justify-center">
                  {e.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={e.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={24} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <h3 className="flex-1 truncate text-[17px] font-bold leading-[23px] text-[#191F28]">{e.title}</h3>
                    <PartnerStatusBadge tone={s.tone}>{s.text}</PartnerStatusBadge>
                  </div>
                  {e.description && (
                    <p className="mt-1 line-clamp-2 text-[13px] leading-[18px] text-[rgba(3,24,50,0.46)]">{e.description}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-3 text-[12px] text-[rgba(0,19,43,0.58)]">
                    {e.sale_price ? (
                      <span className="text-[17px] font-bold text-[#8037FF]">
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
                    <p className="mt-2 text-[12px] text-[#E5484D]">반려 사유: {e.reject_reason}</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <PartnerButton href={`/partner/events/${e.id}/edit`} variant="weak" tone="neutral" size="s" className="flex-1">
                      편집
                    </PartnerButton>
                    <PartnerButton type="button" onClick={() => handleDelete(e.id)} variant="weak" tone="danger" size="s" className="flex-1">
                      삭제
                    </PartnerButton>
                  </div>
                </div>
              </article>
            );
          })}
        </PartnerPanel>
      )}
    </div>
  );
}
