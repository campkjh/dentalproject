'use client';

import { useState } from 'react';
import { Search, MessageSquare, X, Phone } from 'lucide-react';

type Consult = {
  id: string;
  requestedAt: string;
  name: string;
  gender: '남' | '여';
  age: number;
  phone: string;
  isOverseas?: boolean;
  isInCall?: boolean;
  channel: '병원 페이지' | '이벤트' | '의사';
  eventName?: string;
  status: '미확인' | '상담중' | '예약확정' | '시술완료' | '상담취소';
  visitDate?: string;
  procedureDate?: string;
  surgeon?: string;
  memo: string;
};

const INITIAL: Consult[] = [
  {
    id: 'r1',
    requestedAt: '2026-04-16 14:32',
    name: '이지은',
    gender: '여',
    age: 28,
    phone: '010-1234-5678',
    channel: '이벤트',
    eventName: '쌍꺼풀 자연유착',
    status: '미확인',
    memo: '',
  },
  {
    id: 'r2',
    requestedAt: '2026-04-16 13:12',
    name: '박민수',
    gender: '남',
    age: 35,
    phone: '010-2345-6789',
    channel: '병원 페이지',
    status: '상담중',
    visitDate: '2026-04-20 11:00',
    memo: '오전 선호',
  },
  {
    id: 'r3',
    requestedAt: '2026-04-15 17:50',
    name: '김하늘',
    gender: '여',
    age: 31,
    phone: '+81 90 1234 5678',
    isOverseas: true,
    channel: '의사',
    status: '예약확정',
    visitDate: '2026-04-25 15:30',
    memo: '일본인 통역 필요',
  },
  {
    id: 'r4',
    requestedAt: '2026-04-14 09:08',
    name: '정유나',
    gender: '여',
    age: 26,
    phone: '010-3456-7890',
    channel: '이벤트',
    eventName: '코끝 재수술',
    status: '시술완료',
    visitDate: '2026-04-05 10:00',
    procedureDate: '2026-04-10 14:00',
    surgeon: '김정우 원장',
    memo: '재수술 케이스',
  },
  {
    id: 'r5',
    requestedAt: '2026-04-13 11:30',
    name: '(in call)',
    gender: '남',
    age: 0,
    phone: '번호 확인 불가',
    isInCall: true,
    channel: '병원 페이지',
    status: '상담취소',
    memo: '3초 이내 통화 종료',
  },
];

const STATUSES: Consult['status'][] = [
  '미확인',
  '상담중',
  '예약확정',
  '시술완료',
  '상담취소',
];

const STATUS_COLOR: Record<Consult['status'], { bg: string; text: string }> = {
  미확인: { bg: '#FFF1F0', text: '#E5484D' },
  상담중: { bg: '#FFF8E1', text: '#B45309' },
  예약확정: { bg: '#E6F7EB', text: '#15803D' },
  시술완료: { bg: '#E6F2FF', text: '#1E6FD9' },
  상담취소: { bg: '#F3F4F6', text: '#6B7280' },
};

export default function ConsultsPage() {
  const [consults, setConsults] = useState<Consult[]>(INITIAL);
  const [filter, setFilter] = useState<'전체' | Consult['status']>('전체');
  const [query, setQuery] = useState('');
  const [smsTarget, setSmsTarget] = useState<Consult | null>(null);

  const filtered = consults.filter((c) => {
    if (filter !== '전체' && c.status !== filter) return false;
    if (query && !c.name.includes(query) && !c.phone.includes(query)) return false;
    return true;
  });

  const count = (s: Consult['status']) => consults.filter((c) => c.status === s).length;

  const updateStatus = (id: string, s: Consult['status']) => {
    setConsults((prev) => prev.map((c) => (c.id === id ? { ...c, status: s } : c)));
  };
  const updateField = (id: string, patch: Partial<Consult>) => {
    setConsults((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">상담 관리</h1>
        <p className="text-[12px] text-gray-500 mt-1">
          상담 인입 3개월 이후 고객정보가 자동 마스킹됩니다.
        </p>
      </div>

      {/* Filter + Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {(['전체', ...STATUSES] as const).map((s) => {
            const active = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(s as typeof filter)}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={{
                  backgroundColor: active ? '#2B313D' : '#F4F5F7',
                  color: active ? '#fff' : '#51535C',
                }}
              >
                {s} {s !== '전체' && <span className="opacity-70 ml-0.5">{count(s as Consult['status'])}</span>}
              </button>
            );
          })}
        </div>
        <div
          className="ml-auto flex items-center gap-2 px-3"
          style={{
            height: 34,
            borderRadius: 9999,
            backgroundColor: '#F4F5F7',
            minWidth: 220,
          }}
        >
          <Search size={14} className="text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·연락처 검색"
            className="flex-1 text-[12px] bg-transparent outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[960px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th>신청일시</Th>
                <Th>고객 정보</Th>
                <Th>연락처</Th>
                <Th>상담경로</Th>
                <Th>결제·상담상태</Th>
                <Th>내원 일정</Th>
                <Th>시술 일정</Th>
                <Th>집도의</Th>
                <Th>메모</Th>
                <Th>문자</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const sc = STATUS_COLOR[c.status];
                return (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0 align-top">
                    <Td className="whitespace-nowrap">{c.requestedAt}</Td>
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">
                          {c.name}
                          {c.isInCall && (
                            <span className="ml-1 text-[10px] text-gray-400">[in call]</span>
                          )}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {c.gender} · 만 {c.age}세
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-col">
                        <span className="text-gray-900">{c.phone}</span>
                        {c.isOverseas && (
                          <span className="text-[10px] text-[#B45309] bg-[#FFF8E1] rounded px-1.5 py-0.5 w-fit mt-0.5">
                            해외
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <span className="text-gray-800">{c.channel}</span>
                      {c.eventName && (
                        <p className="text-[10px] text-gray-500 mt-0.5">{c.eventName}</p>
                      )}
                    </Td>
                    <Td>
                      <select
                        value={c.status}
                        onChange={(e) => updateStatus(c.id, e.target.value as Consult['status'])}
                        className="text-[11px] font-bold rounded px-2 py-1 border-0 outline-none"
                        style={{ backgroundColor: sc.bg, color: sc.text }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </Td>
                    <Td>
                      <input
                        type="datetime-local"
                        value={toDtLocal(c.visitDate)}
                        onChange={(e) =>
                          updateField(c.id, { visitDate: fromDtLocal(e.target.value) })
                        }
                        className="text-[11px] border border-gray-200 rounded px-1.5 py-1 outline-none"
                      />
                    </Td>
                    <Td>
                      <input
                        type="datetime-local"
                        value={toDtLocal(c.procedureDate)}
                        onChange={(e) =>
                          updateField(c.id, { procedureDate: fromDtLocal(e.target.value) })
                        }
                        className="text-[11px] border border-gray-200 rounded px-1.5 py-1 outline-none"
                      />
                    </Td>
                    <Td>
                      <input
                        type="text"
                        value={c.surgeon ?? ''}
                        onChange={(e) => updateField(c.id, { surgeon: e.target.value })}
                        placeholder="집도의"
                        className="text-[11px] border border-gray-200 rounded px-1.5 py-1 outline-none w-24"
                      />
                    </Td>
                    <Td>
                      <input
                        type="text"
                        value={c.memo}
                        onChange={(e) => updateField(c.id, { memo: e.target.value })}
                        placeholder="메모 입력"
                        className="text-[11px] border border-gray-200 rounded px-1.5 py-1 outline-none w-32"
                      />
                    </Td>
                    <Td>
                      <button
                        onClick={() => setSmsTarget(c)}
                        disabled={c.isOverseas || c.isInCall}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7C3AED] border border-[#7C3AED] rounded px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <MessageSquare size={11} /> 문자전송
                      </button>
                    </Td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-[12px] text-gray-400">
                    조회된 상담 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {smsTarget && (
        <SmsModal
          consult={smsTarget}
          onClose={() => setSmsTarget(null)}
          onSend={() => setSmsTarget(null)}
        />
      )}
    </div>
  );
}

function toDtLocal(v?: string) {
  if (!v) return '';
  return v.replace(' ', 'T').slice(0, 16);
}
function fromDtLocal(v: string) {
  if (!v) return undefined;
  return v.replace('T', ' ') + (v.length < 16 ? '' : '');
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">
      {children}
    </th>
  );
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3 ${className}`}>{children}</td>;
}

function SmsModal({
  consult,
  onClose,
  onSend,
}: {
  consult: Consult;
  onClose: () => void;
  onSend: () => void;
}) {
  const [msg, setMsg] = useState(
    `안녕하세요 ${consult.name}님, 오케이치과의원입니다.\n상담 신청해주셔서 감사합니다. 희망하시는 방문일정 회신 부탁드립니다.`
  );

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 modal-overlay-enter flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md flex flex-col modal-content-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[15px] font-bold text-gray-900">문자 전송</h3>
          <button onClick={onClose}>
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
            <Phone size={14} className="text-gray-500" />
            <span className="text-[13px] font-semibold text-gray-900">
              {consult.name} · {consult.phone}
            </span>
          </div>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={6}
            maxLength={200}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#7C3AED] resize-none"
          />
          <p className="text-[11px] text-gray-400 text-right">{msg.length}/200</p>
          <div className="text-[11px] text-gray-500 bg-[#F4EFFF] rounded px-3 py-2">
            해외 번호는 전송할 수 없으며, 국내 번호에 한해 문자 전송료는 무료입니다.
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-700"
          >
            취소
          </button>
          <button
            onClick={onSend}
            className="flex-1 py-2.5 rounded-lg bg-[#7C3AED] text-white text-[13px] font-semibold"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
