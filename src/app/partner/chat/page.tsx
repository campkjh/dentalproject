'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Send } from 'lucide-react';
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
    <Suspense fallback={<div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>}>
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
        <h1 className="text-[18px] font-bold text-gray-900">채팅 상담</h1>
        <p className="text-[12px] text-gray-500 mt-1">환자가 보낸 1:1 상담 메시지에 응답합니다.</p>
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-4 h-[calc(100dvh-220px)] min-h-[480px]">
        {/* Thread list */}
        <aside className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="고객명 또는 메시지 검색"
                className="w-full pl-8 pr-3 py-2 text-[12px] bg-gray-50 rounded-lg outline-none"
              />
            </div>
          </div>
          {filteredThreads.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[12px] text-gray-400">
              상담 내역이 없습니다.
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredThreads.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setActiveId(t.id)}
                    className="w-full text-left p-3 flex items-start gap-2 hover:bg-gray-50 transition-colors"
                    style={{ backgroundColor: activeId === t.id ? '#F4EFFF' : undefined }}
                  >
                    <Avatar seed={t.user_id} size={36} className="flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[13px] font-bold text-gray-900 truncate">
                          {t.user?.name ?? '익명'}
                        </span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {relTime(t.last_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{t.last_message ?? '대화를 시작해 보세요'}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Conversation */}
        <section className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
          {active ? (
            <>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <Avatar seed={active.user_id} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-gray-900 truncate">{active.user?.name ?? '익명'}</p>
                  <p className="text-[11px] text-gray-400">실시간 채팅</p>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 bg-[#FAFBFC]">
                <div className="space-y-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 ${m.from === 'me' ? 'flex-row-reverse' : ''} fade-in-up`}
                    >
                      <div className="max-w-[78%]">
                        <div
                          className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
                          style={{
                            backgroundColor: m.from === 'me' ? '#7C3AED' : '#fff',
                            color: m.from === 'me' ? '#fff' : '#2B313D',
                            border: m.from === 'me' ? 'none' : '1px solid #F2F3F5',
                            borderTopRightRadius: m.from === 'me' ? 4 : 16,
                            borderTopLeftRadius: m.from === 'me' ? 16 : 4,
                          }}
                        >
                          {m.text}
                        </div>
                        <p
                          className="text-[10px] text-gray-400 mt-1"
                          style={{ textAlign: m.from === 'me' ? 'right' : 'left' }}
                        >
                          {m.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-end gap-2 px-3 py-3 border-t border-gray-100"
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
                  className="flex-1 text-[13px] px-3 py-2 bg-gray-50 rounded-xl outline-none resize-none"
                  style={{ maxHeight: 100 }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || pending}
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: input.trim() && !pending ? '#7C3AED' : '#E5E7EB',
                    color: '#fff',
                  }}
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[12px] text-gray-400">
              왼쪽에서 상담 스레드를 선택하세요.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
