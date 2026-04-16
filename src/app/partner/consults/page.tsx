'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, MessageSquare, Phone } from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';

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
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">상담 관리</h1>
        <p className="text-[12px] text-gray-500 mt-1">
          환자가 1:1로 보낸 상담 요청을 한눈에 확인합니다.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름 또는 메시지로 검색"
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 rounded-lg outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
          <MessageSquare size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">아직 상담 요청이 없습니다.</p>
        </div>
      ) : (
        <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {filtered.map((r) => (
            <li key={r.id}>
              <Link
                href={`/partner/chat?roomId=${r.id}`}
                className="flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#F4F5F7] text-gray-700 flex items-center justify-center text-[13px] font-bold flex-shrink-0">
                  {r.user?.name?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[14px] font-bold text-gray-900 truncate">
                      {r.user?.name ?? '익명'}
                    </span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">
                      {relTime(r.last_at ?? r.created_at)}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-500 truncate">
                    {r.last_message ?? '(메시지 없음)'}
                  </p>
                </div>
                <Phone size={14} className="text-gray-300 flex-shrink-0 mt-2" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
