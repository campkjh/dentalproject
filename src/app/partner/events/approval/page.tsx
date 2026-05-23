'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';
import {
  PartnerEmpty,
  PartnerListRow,
  PartnerPanel,
  PartnerSegmentedControl,
  PartnerStatusBadge,
  PartnerTop,
} from '@/components/partner/tds';

/* eslint-disable @typescript-eslint/no-explicit-any */
type EventRow = {
  id: string;
  title: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active' | 'ended';
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS: Record<EventRow['status'], { text: string; tone: 'neutral' | 'warning' | 'success' | 'danger' }> = {
  draft: { text: '임시저장', tone: 'neutral' },
  pending: { text: '승인대기', tone: 'warning' },
  approved: { text: '승인', tone: 'success' },
  active: { text: '노출중', tone: 'success' },
  rejected: { text: '반려', tone: 'danger' },
  ended: { text: '종료', tone: 'neutral' },
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
        title="이벤트 검수 현황"
        description="제출한 이벤트의 승인 상태를 확인합니다."
        icon={<ClipboardCheck size={28} />}
      />

      <PartnerSegmentedControl
        value={filter}
        options={FILTERS}
        onChange={setFilter}
        getLabel={(f) => (f === '전체' ? '전체' : STATUS[f].text)}
      />

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <PartnerEmpty icon={<ClipboardCheck size={24} />} title="해당하는 이벤트가 없습니다." />
      ) : (
        <PartnerPanel className="overflow-hidden">
          {filtered.map((e) => {
            const s = STATUS[e.status];
            return (
              <PartnerListRow
                key={e.id}
                href={`/partner/events/${e.id}/edit`}
                icon={<ClipboardCheck size={16} />}
                title={e.title}
                description={
                  <span>
                    제출: {new Date(e.created_at).toLocaleString('ko-KR')}
                    {e.reject_reason ? ` · 반려 사유: ${e.reject_reason}` : ''}
                  </span>
                }
                meta={<PartnerStatusBadge tone={s.tone}>{s.text}</PartnerStatusBadge>}
              />
            );
          })}
        </PartnerPanel>
      )}
    </div>
  );
}
