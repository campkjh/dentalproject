'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import Avatar from '@/components/common/Avatar';
import { useSession } from '@/lib/supabase/SessionProvider';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Thread = {
  id: string;
  user_id: string;
  hospital_id: string;
  user?: { name?: string; profile_image?: string } | null;
  last_message?: string | null;
  last_at?: string;
};

type Msg = {
  id: string;
  from: 'user' | 'me' | 'system';
  text: string;
  time: string;
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

function timeStr(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function PartnerChatPageWrapper() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>}>
      <PartnerChatPage />
    </Suspense>
  );
}

function PartnerChatPage() {
  const { authUser } = useSession();
  const search = useSearchParams();
  const initialRoomId = search.get('roomId');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialRoomId);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load threads
  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/partner/consult-rooms', { cache: 'no-store' });
      if (!res.ok) return;
      const { rooms } = await res.json();
      if (cancelled) return;
      setThreads(rooms ?? []);
      if (!activeId && rooms?.[0]) setActiveId(rooms[0].id);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  // Load messages for active thread
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/consult/rooms/${activeId}/messages`, { cache: 'no-store' });
      if (!res.ok) return;
      const { messages: rows } = await res.json();
      if (cancelled) return;
      setMessages(
        (rows ?? []).map((m: any): Msg => ({
          id: m.id,
          from: m.sender_type === 'hospital' ? 'me' : m.sender_type === 'system' ? 'system' : 'user',
          text: m.content,
          time: timeStr(m.created_at),
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // Realtime subscribe
  useEffect(() => {
    if (!activeId || !hasSupabaseEnv()) return;
    const sb = createClient();
    const ch = sb
      .channel(`partner-consult-${activeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'consultation_messages', filter: `room_id=eq.${activeId}` },
        (payload) => {
          const m = payload.new as any;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [
              ...prev,
              {
                id: m.id,
                from: m.sender_type === 'hospital' ? 'me' : m.sender_type === 'system' ? 'system' : 'user',
                text: m.content,
                time: timeStr(m.created_at),
              },
            ];
          });
        }
      )
      .subscribe();
    return () => {
      void sb.removeChannel(ch);
    };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || !activeId || pending) return;
    setInput('');
    setPending(true);
    const tempId = `tmp-${Date.now()}`;
    setMessages((p) => [...p, { id: tempId, from: 'me', text, time: '방금' }]);
    try {
      const res = await fetch(`/api/consult/rooms/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) {
        setMessages((p) => p.filter((m) => m.id !== tempId));
      } else {
        const { id } = await res.json();
        setMessages((p) => p.map((m) => (m.id === tempId ? { ...m, id } : m)));
        // Update thread last_message in sidebar
        setThreads((p) =>
          p.map((t) => (t.id === activeId ? { ...t, last_message: text, last_at: new Date().toISOString() } : t))
        );
      }
    } catch {
      setMessages((p) => p.filter((m) => m.id !== tempId));
    } finally {
      setPending(false);
    }
  };

  const filteredThreads = threads.filter(
    (t) => !q || (t.user?.name ?? '').includes(q) || (t.last_message ?? '').includes(q)
  );
  const active = threads.find((t) => t.id === activeId) ?? null;

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

  const canSend = Boolean(input.trim()) && !pending;

  return (
    <div className="min-h-full bg-white pb-6 page-enter">
      <TopBar title="채팅 상담" sub="환자가 보낸 1:1 상담 메시지에 답할 수 있어요" />

      <div className="grid h-[calc(100dvh-220px)] min-h-[480px] grid-rows-[minmax(0,220px)_minmax(0,1fr)] gap-4 px-5 md:grid-cols-[300px_1fr] md:grid-rows-1">
        {/* 상담 목록 */}
        <aside className="flex min-h-0 flex-col">
          <label className="m-0 flex h-12 shrink-0 items-center gap-2 rounded-[14px] bg-[#F2F4F6] px-4 transition-colors focus-within:bg-[#EDEFF2]">
            <MonoIcon name="search" size={18} color="#8B95A1" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="고객명 또는 메시지 검색"
              className="min-w-0 flex-1 text-[#191F28] outline-none placeholder:text-[#B0B8C1] min-h-0! border-0! bg-transparent! p-0! text-[16px]! font-normal! leading-normal! shadow-none! focus:bg-transparent! focus:shadow-none!"
            />
          </label>
          {filteredThreads.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#F2F4F6]">
                <MonoIcon name="chat-bubble" size={26} color="#B0B8C1" />
              </span>
              <p className="mt-3 text-[15px] font-semibold text-[#8B95A1]">상담 내역이 없어요</p>
            </div>
          ) : (
            <ul className="-mx-2 mt-2 min-h-0 flex-1 overflow-y-auto">
              {filteredThreads.map((t) => {
                const on = activeId === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(t.id)}
                      className={`flex w-full items-center gap-3 rounded-[16px] px-2 py-2.5 text-left transition-colors ${on ? 'bg-[#EFF5FE]' : 'active:bg-[#F9FAFB]'}`}
                    >
                      <Avatar seed={t.user_id} size={40} className="flex-shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={`min-w-0 flex-1 truncate text-[16px] font-bold ${on ? 'text-[#2F6FE4]' : 'text-[#191F28]'}`}>{t.user?.name ?? '익명'}</span>
                          <span className="shrink-0 text-[12.5px] text-[#B0B8C1]">{relTime(t.last_at)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[14px] text-[#6B7684]">{t.last_message ?? '대화를 시작해 보세요'}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* 대화 — 회색 면 칸 · 흰/파랑 말풍선 */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[20px] bg-[#F2F4F6]">
          {active ? (
            <>
              <div className="flex shrink-0 items-center gap-2.5 px-4 pb-2 pt-3.5">
                <Avatar seed={active.user_id} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-bold text-[#191F28]">{active.user?.name ?? '익명'}</p>
                  <p className="text-[13px] text-[#8B95A1]">실시간 채팅</p>
                </div>
              </div>

              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <div className="space-y-3">
                  {messages.map((m) =>
                    m.from === 'system' ? (
                      <p key={m.id} className="fade-in-up mx-auto w-fit max-w-[90%] rounded-[10px] bg-white/70 px-3 py-1.5 text-center text-[13px] leading-[1.5] text-[#6B7684]">
                        {m.text}
                      </p>
                    ) : (
                      <div key={m.id} className={`fade-in-up flex items-end gap-1.5 ${m.from === 'me' ? 'flex-row-reverse' : ''}`}>
                        <div
                          className={`max-w-[78%] whitespace-pre-wrap break-words px-3.5 py-2.5 text-[15px] leading-[1.5] ${
                            m.from === 'me'
                              ? 'rounded-[18px] rounded-tr-[6px] bg-[#4A82EE] text-white'
                              : 'rounded-[18px] rounded-tl-[6px] bg-white text-[#333D4B]'
                          }`}
                        >
                          {m.text}
                        </div>
                        <span className="shrink-0 pb-0.5 text-[11.5px] text-[#B0B8C1]">{m.time}</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex shrink-0 items-end gap-2 px-3 pb-3 pt-2"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder="메시지 입력 (Enter 전송, Shift+Enter 줄바꿈)"
                  className="min-h-11! flex-1 resize-none rounded-[14px]! border-0! bg-white! px-4! py-2.5! text-[16px]! font-normal! leading-[1.5]! text-[#191F28]! shadow-none! outline-none placeholder:text-[#B0B8C1] focus:bg-white! focus:shadow-none!"
                  style={{ maxHeight: 100 }}
                />
                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label="보내기"
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full p-0! transition-all active:scale-[0.94] ${canSend ? 'bg-[#4A82EE]' : 'bg-[#E5E8EB]'}`}
                >
                  <MonoIcon name="paper-plane" size={20} color="#fff" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-white">
                <MonoIcon name="chat-bubble" size={34} color="#B0B8C1" />
              </span>
              <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">상담을 골라 주세요</p>
              <p className="mt-1.5 text-[15px] text-[#8B95A1]">목록에서 상담을 누르면 대화가 열려요</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
