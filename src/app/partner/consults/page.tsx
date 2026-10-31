'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import MonoIcon from '@/components/common/MonoIcon';
import TopBar from '@/components/common/TopBar';
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-10 text-center">
        <span className="qd-a-item flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
          <MonoIcon name="lock" size={34} color="#B0B8C1" />
        </span>
        <p className="qd-a-item mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]" style={{ animationDelay: '.06s' }}>로그인이 필요해요</p>
        <Link href="/login" className="qd-a-item mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold text-[#3180F7] transition active:scale-[0.97]" style={{ animationDelay: '.12s' }}>
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white pb-10 page-enter">
      <TopBar title="상담 관리" sub="환자가 1:1로 보낸 상담 요청을 한눈에 볼 수 있어요" />

      {/* 검색 — 회색 면 · 테두리 없음 */}
      <div className="px-5">
        <label className="m-0 flex h-14 items-center gap-2.5 rounded-[14px] bg-[#F2F4F6] px-4 transition-colors focus-within:bg-[#EDEFF2]">
          <MonoIcon name="search" size={20} color="#8B95A1" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름 또는 메시지로 검색"
            className="min-w-0 flex-1 text-[#191F28] outline-none placeholder:text-[#B0B8C1] min-h-0! border-0! bg-transparent! p-0! text-[16px]! font-normal! leading-normal! shadow-none! focus:bg-transparent! focus:shadow-none!"
          />
        </label>
      </div>

      {loading ? (
        <p className="py-20 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <span className="qd-a-item flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
            <MonoIcon name="chat-bubble" size={34} color="#B0B8C1" />
          </span>
          <p className="qd-a-item mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]" style={{ animationDelay: '.06s' }}>
            {q ? '찾는 상담이 없어요' : '아직 상담 요청이 없어요'}
          </p>
          <p className="qd-a-item mt-1.5 text-[15px] leading-[1.6] text-[#8B95A1]" style={{ animationDelay: '.12s' }}>
            {q ? '다른 이름이나 말로 찾아 보세요' : '환자가 상담을 보내면 여기에 모여요'}
          </p>
        </div>
      ) : (
        <div className="px-3 pt-4">
          {filtered.map((r, i) => (
            <Link
              key={r.id}
              href={`/partner/chat?roomId=${r.id}`}
              className="qd-a-item flex items-center gap-3 rounded-[16px] px-2 py-3 transition-colors active:bg-[#F9FAFB]"
              style={{ animationDelay: `${Math.min(i, 8) * 0.035}s` }}
            >
              <Avatar src={r.user?.profile_image} seed={r.user?.name ?? r.id} size={44} alt="" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[17px] font-bold text-[#191F28]">{r.user?.name ?? '익명'}</span>
                  <span className="shrink-0 text-[13px] text-[#B0B8C1]">{relTime(r.last_at ?? r.created_at)}</span>
                </span>
                <span className="mt-0.5 block truncate text-[15px] text-[#6B7684]">{r.last_message ?? '(메시지 없음)'}</span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-[#B0B8C1]" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
