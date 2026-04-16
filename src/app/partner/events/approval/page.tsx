'use client';

import { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';

type Approval = {
  id: string;
  requestedAt: string;
  country: 'KR' | 'JP' | 'CN' | 'EN';
  eventId: string;
  eventTitle: string;
  thumb: string;
  status: '승인대기' | '승인' | '반려';
  processedAt?: string;
  rejectReason?: string;
  baseEventTitle?: string;
  history: { date: string; status: string; note?: string }[];
};

const COUNTRY: Record<Approval['country'], string> = {
  KR: '🇰🇷 한국',
  JP: '🇯🇵 일본',
  CN: '🇨🇳 중국',
  EN: '🇺🇸 글로벌',
};

const STATUS_COLOR: Record<Approval['status'], { bg: string; text: string }> = {
  승인대기: { bg: '#FFF8E1', text: '#B45309' },
  승인: { bg: '#E6F7EB', text: '#15803D' },
  반려: { bg: '#FFF1F0', text: '#E5484D' },
};

const ITEMS: Approval[] = [
  {
    id: 'a1',
    requestedAt: '2026-04-16 12:10',
    country: 'KR',
    eventId: 'evt-1041',
    eventTitle: '눈매교정 + 쌍꺼풀 자연유착',
    thumb: '🦴',
    status: '승인대기',
    history: [{ date: '2026-04-16 12:10', status: '승인대기' }],
  },
  {
    id: 'a2',
    requestedAt: '2026-04-15 16:42',
    country: 'JP',
    eventId: 'evt-1039',
    eventTitle: '코끝 재수술 · 3D 디자인',
    thumb: '🦴',
    status: '반려',
    processedAt: '2026-04-15 18:20',
    rejectReason: '의료광고 심의 필증 누락. 심의 필증 번호 기재 후 재요청 부탁드립니다.',
    baseEventTitle: '코끝 재수술',
    history: [
      { date: '2026-04-15 16:42', status: '승인대기' },
      { date: '2026-04-15 18:20', status: '반려', note: '심의 필증 누락' },
    ],
  },
  {
    id: 'a3',
    requestedAt: '2026-04-12 09:30',
    country: 'KR',
    eventId: 'evt-1035',
    eventTitle: '리프팅 올드클래식 15라인',
    thumb: '🦴',
    status: '승인',
    processedAt: '2026-04-12 11:00',
    history: [
      { date: '2026-04-12 09:30', status: '승인대기' },
      { date: '2026-04-12 11:00', status: '승인' },
    ],
  },
];

export default function EventsApprovalPage() {
  const [selected, setSelected] = useState<Approval | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">승인 요청 내역</h1>
        <p className="text-[12px] text-gray-500 mt-1">등록한 이벤트의 검수 결과를 확인할 수 있습니다.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[760px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">요청일시</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">대상국가</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">이벤트</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">처리상태/일시</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600">사유</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ITEMS.map((a) => {
              const sc = STATUS_COLOR[a.status];
              return (
                <tr key={a.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{a.requestedAt}</td>
                  <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{COUNTRY[a.country]}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
                        {a.thumb}
                      </div>
                      <div>
                        <p className="text-gray-900 font-semibold line-clamp-1">{a.eventTitle}</p>
                        <p className="text-[10px] text-gray-400">{a.eventId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[11px] font-bold"
                      style={{ backgroundColor: sc.bg, color: sc.text }}
                    >
                      {a.status}
                    </span>
                    {a.processedAt && <p className="text-[10px] text-gray-400 mt-0.5">{a.processedAt}</p>}
                  </td>
                  <td className="px-3 py-3 text-gray-700 max-w-xs">
                    <p className="line-clamp-2 text-[11px]">{a.rejectReason ?? '—'}</p>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => setSelected(a)}
                      className="text-[11px] font-semibold text-[#5B8B25] flex items-center gap-0.5"
                    >
                      상세 <ChevronRight size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function DetailModal({ item, onClose }: { item: Approval; onClose: () => void }) {
  const sc = STATUS_COLOR[item.status];
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 modal-overlay-enter flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col modal-content-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[15px] font-bold text-gray-900">승인 요청 상세</h3>
          <button onClick={onClose}>
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Row label="처리상태">
            <span
              className="inline-block px-2 py-0.5 rounded text-[11px] font-bold"
              style={{ backgroundColor: sc.bg, color: sc.text }}
            >
              {item.status}
            </span>
          </Row>
          <Row label="처리일시">{item.processedAt ?? '—'}</Row>
          <Row label="요청일시">{item.requestedAt}</Row>
          <Row label="이벤트">
            <span className="font-semibold text-gray-900">{item.eventTitle}</span>
            <span className="ml-2 text-[10px] text-gray-400">{item.eventId}</span>
          </Row>
          <Row label="기존 이벤트">{item.baseEventTitle ?? '—'}</Row>
          {item.rejectReason && (
            <div className="p-3 rounded-lg bg-[#FFF1F0] text-[12px] text-[#E5484D] leading-relaxed">
              <p className="font-bold mb-1">반려 사유</p>
              {item.rejectReason}
            </div>
          )}
          <div>
            <p className="text-[12px] font-bold text-gray-900 mb-2">승인 요청 과거내역</p>
            <ol className="border-l-2 border-gray-200 pl-3 space-y-2">
              {item.history.map((h, i) => (
                <li key={i} className="text-[11px]">
                  <span className="text-gray-400">{h.date}</span>
                  <span className="mx-1.5">·</span>
                  <span className="text-gray-900 font-semibold">{h.status}</span>
                  {h.note && <span className="text-gray-500 ml-1">({h.note})</span>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="w-[86px] text-[12px] text-gray-500 flex-shrink-0">{label}</div>
      <div className="flex-1 text-[12px] text-gray-800">{children}</div>
    </div>
  );
}
