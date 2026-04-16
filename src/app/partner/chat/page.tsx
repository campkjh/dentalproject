'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Send, Paperclip, Phone } from 'lucide-react';

type Message = {
  id: string;
  from: 'user' | 'me';
  text: string;
  time: string;
};

type Thread = {
  id: string;
  name: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  tag?: string;
  messages: Message[];
};

const THREADS: Thread[] = [
  {
    id: 'c1',
    name: '이지은',
    lastMessage: '전후 사진 확인이 가능할까요?',
    lastTime: '방금',
    unread: 2,
    tag: '쌍꺼풀',
    messages: [
      { id: 'm1', from: 'user', text: '안녕하세요! 쌍꺼풀 상담 문의드립니다.', time: '14:10' },
      { id: 'm2', from: 'me', text: '안녕하세요 고객님, 어떤 부분이 궁금하신지 말씀해 주세요.', time: '14:11' },
      { id: 'm3', from: 'user', text: '전후 사진 확인이 가능할까요?', time: '14:12' },
    ],
  },
  {
    id: 'c2',
    name: '박민수',
    lastMessage: '예약 시간 변경 가능할지 문의드립니다',
    lastTime: '12분 전',
    unread: 1,
    tag: '코성형',
    messages: [
      { id: 'm1', from: 'user', text: '예약 시간 변경 가능할지 문의드립니다', time: '13:48' },
    ],
  },
  {
    id: 'c3',
    name: '김하늘',
    lastMessage: '네 감사합니다!',
    lastTime: '1시간 전',
    unread: 0,
    tag: '리프팅',
    messages: [
      { id: 'm1', from: 'me', text: '오전 11시 예약 확정되었습니다.', time: '13:01' },
      { id: 'm2', from: 'user', text: '네 감사합니다!', time: '13:02' },
    ],
  },
  {
    id: 'c4',
    name: '유리',
    lastMessage: '가격 문의드려요',
    lastTime: '어제',
    unread: 0,
    messages: [
      { id: 'm1', from: 'user', text: '가격 문의드려요', time: '어제 18:20' },
      { id: 'm2', from: 'me', text: '해당 시술은 80만원입니다.', time: '어제 18:30' },
    ],
  },
];

export default function ChatPage() {
  const [threads, setThreads] = useState<Thread[]>(THREADS);
  const [activeId, setActiveId] = useState<string>(THREADS[0].id);
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = threads.find((t) => t.id === activeId)!;
  const filtered = threads.filter((t) => !q || t.name.includes(q) || t.lastMessage.includes(q));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [activeId, active.messages.length]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? {
              ...t,
              lastMessage: text,
              lastTime: '방금',
              messages: [
                ...t.messages,
                { id: `m-${Date.now()}`, from: 'me', text, time: '방금' },
              ],
            }
          : t
      )
    );
    setInput('');
  };

  const markRead = (id: string) => {
    setActiveId(id);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
  };

  return (
    <div className="flex bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 110px)' }}>
      {/* Threads list */}
      <aside className="w-[280px] flex-shrink-0 border-r border-gray-200 flex flex-col">
        <div className="p-3 border-b border-gray-100">
          <div
            className="flex items-center gap-2 px-3"
            style={{ height: 34, borderRadius: 9999, backgroundColor: '#F4F5F7' }}
          >
            <Search size={14} className="text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="고객명·내용 검색"
              className="flex-1 text-[12px] bg-transparent outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => markRead(t.id)}
              className="w-full flex items-start gap-2 px-3 py-3 text-left hover:bg-gray-50 border-b border-gray-50"
              style={{ backgroundColor: t.id === activeId ? '#F4EFFF' : 'transparent' }}
            >
              <div className="w-9 h-9 rounded-full bg-[#F4F5F7] text-gray-700 flex items-center justify-center text-[12px] font-bold flex-shrink-0">
                {t.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[12px] font-semibold text-gray-900 truncate">
                    {t.name}
                  </span>
                  {t.tag && (
                    <span className="text-[9px] text-gray-500 bg-gray-100 rounded px-1 py-0.5 flex-shrink-0">
                      {t.tag}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-gray-400 flex-shrink-0">
                    {t.lastTime}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 truncate">{t.lastMessage}</p>
              </div>
              {t.unread > 0 && (
                <span className="flex-shrink-0 text-[9px] font-bold text-white bg-red-500 rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 mt-1.5">
                  {t.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Active chat */}
      <section className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-4 border-b border-gray-100 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#F4F5F7] text-gray-700 flex items-center justify-center text-[12px] font-bold">
            {active.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-gray-900">{active.name}</p>
            {active.tag && <p className="text-[11px] text-gray-500">{active.tag} 문의</p>}
          </div>
          <button className="p-2 rounded hover:bg-gray-100" aria-label="통화">
            <Phone size={14} className="text-gray-600" />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-[#FAFBFC]">
          <div className="space-y-3">
            {active.messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[70%]">
                  <div
                    className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
                    style={{
                      backgroundColor: m.from === 'me' ? '#7C3AED' : '#fff',
                      color: m.from === 'me' ? '#fff' : '#2B313D',
                      border: m.from === 'me' ? 'none' : '1px solid #F2F3F5',
                      borderTopLeftRadius: m.from === 'me' ? 16 : 4,
                      borderTopRightRadius: m.from === 'me' ? 4 : 16,
                    }}
                  >
                    {m.text}
                  </div>
                  <p
                    className={`text-[10px] text-gray-400 mt-1 ${
                      m.from === 'me' ? 'text-right' : 'text-left'
                    }`}
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
          className="p-3 border-t border-gray-100 flex items-end gap-2"
        >
          <button type="button" className="p-2 rounded hover:bg-gray-100" aria-label="첨부">
            <Paperclip size={16} className="text-gray-500" />
          </button>
          <div className="flex-1 rounded-2xl px-3 py-2 bg-[#F4F5F7]">
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
              className="w-full text-[13px] outline-none bg-transparent resize-none"
              style={{ maxHeight: 120 }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 btn-press"
            style={{
              backgroundColor: input.trim() ? '#7C3AED' : '#E5E7EB',
              color: '#fff',
            }}
          >
            <Send size={15} />
          </button>
        </form>
      </section>
    </div>
  );
}
