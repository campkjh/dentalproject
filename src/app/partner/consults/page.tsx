'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';
import { PartnerEmpty, PartnerListRow, PartnerPanel, PartnerSearchField, PartnerTop } from '@/components/partner/tds';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Room = {
  id: string;
  user_id: string;
  hospital_id: string;
  last_message: string | null;
  last_at: string;
  created_at: string;
  user?: { name?: string; profile_image?: string } | null;
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

export default function PartnerConsultsPage() {
  const { authUser } = useSession();
  const [rooms, setRooms] = useState<Room[]>([]);
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
        const res = await fetch('/api/partner/consult-rooms', { cache: 'no-store' });
        if (!res.ok) return;
        const { rooms: data } = await res.json();
        if (cancelled) return;
        setRooms(data ?? []);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const filtered = useMemo(() => {
    if (!q) return rooms;
    return rooms.filter(
      (r) => (r.user?.name ?? '').includes(q) || (r.last_message ?? '').includes(q)
    );
  }, [rooms, q]);

  if (!authUser) {
    return (
      <div className="bg-white rounded-xl p-10 text-center">
        <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다.</p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#3182F6] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PartnerTop
        eyebrow="상담"
        title="상담 관리"
        description="환자가 1:1로 보낸 상담 요청을 한눈에 확인합니다."
        icon={<MessageSquare size={28} />}
      />

      <PartnerSearchField value={q} onChange={setQ} placeholder="이름 또는 메시지로 검색" />

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <PartnerEmpty icon={<MessageSquare size={24} />} title="아직 상담 요청이 없습니다." />
      ) : (
        <PartnerPanel className="overflow-hidden">
          {filtered.map((r) => (
            <PartnerListRow
              key={r.id}
              href={`/partner/chat?roomId=${r.id}`}
              icon={<span className="text-[13px] font-bold">{r.user?.name?.[0] ?? '?'}</span>}
              title={r.user?.name ?? '익명'}
              description={r.last_message ?? '(메시지 없음)'}
              meta={relTime(r.last_at ?? r.created_at)}
            />
          ))}
        </PartnerPanel>
      )}
    </div>
  );
}
