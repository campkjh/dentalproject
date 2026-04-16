'use client';

import { useState } from 'react';
import { Calendar, XCircle, CheckCircle, RefreshCw, MessageSquare } from 'lucide-react';

type Alert = {
  id: string;
  type: '예약확정' | '예약취소' | '일정변경' | '상담신청' | '후기작성' | '답변필요';
  customer: string;
  detail: string;
  time: string;
  isNew?: boolean;
};

const ALERTS: Alert[] = [
  {
    id: 'al1',
    type: '예약확정',
    customer: '이지은',
    detail: '2026-04-20 11:00 내원 확정',
    time: '5분 전',
    isNew: true,
  },
  {
    id: 'al2',
    type: '상담신청',
    customer: '박민수',
    detail: '이벤트 "코끝 재수술 3D"',
    time: '1시간 전',
    isNew: true,
  },
  {
    id: 'al3',
    type: '일정변경',
    customer: '김하늘',
    detail: '내원 일정을 2026-04-25 → 2026-04-26 으로 변경 요청',
    time: '3시간 전',
  },
  {
    id: 'al4',
    type: '답변필요',
    customer: '유리',
    detail: '이벤트 Q&A 미답변 12시간 경과',
    time: '12시간 전',
  },
  {
    id: 'al5',
    type: '예약취소',
    customer: '정유나',
    detail: '2026-04-18 15:00 예약을 취소했습니다.',
    time: '어제',
  },
  {
    id: 'al6',
    type: '후기작성',
    customer: '혜원',
    detail: '코 수술 후기 ⭐5',
    time: '2일 전',
  },
];

const TYPE_CFG: Record<Alert['type'], { icon: React.ReactNode; bg: string; color: string }> = {
  예약확정: { icon: <CheckCircle size={14} />, bg: '#E6F7EB', color: '#15803D' },
  예약취소: { icon: <XCircle size={14} />, bg: '#FFF1F0', color: '#E5484D' },
  일정변경: { icon: <RefreshCw size={14} />, bg: '#FFF8E1', color: '#B45309' },
  상담신청: { icon: <Calendar size={14} />, bg: '#E6F2FF', color: '#1E6FD9' },
  후기작성: { icon: <MessageSquare size={14} />, bg: '#F3F4F6', color: '#6B7280' },
  답변필요: { icon: <MessageSquare size={14} />, bg: '#EDE7FF', color: '#6D28D9' },
};

export default function NoticesPage() {
  const [items, setItems] = useState<Alert[]>(ALERTS);
  const [filter, setFilter] = useState<'전체' | Alert['type']>('전체');

  const filtered = filter === '전체' ? items : items.filter((i) => i.type === filter);

  const markAllRead = () => setItems((prev) => prev.map((p) => ({ ...p, isNew: false })));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">알림</h1>
          <p className="text-[12px] text-gray-500 mt-1">
            상담신청에 따른 예약·취소·일정변경 등을 확인할 수 있습니다.
          </p>
        </div>
        <button
          onClick={markAllRead}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-700 btn-press"
        >
          모두 읽음 처리
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-1">
        {(['전체', '예약확정', '예약취소', '일정변경', '상담신청', '후기작성', '답변필요'] as const).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
              style={{
                backgroundColor: filter === f ? '#2B313D' : '#F4F5F7',
                color: filter === f ? '#fff' : '#51535C',
              }}
            >
              {f}
            </button>
          )
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
        {filtered.map((a) => {
          const cfg = TYPE_CFG[a.type];
          return (
            <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: cfg.bg, color: cfg.color }}
              >
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}
                  >
                    {a.type}
                  </span>
                  <span className="text-[12px] font-semibold text-gray-900">{a.customer}</span>
                  {a.isNew && (
                    <span className="text-[9px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 leading-none">
                      NEW
                    </span>
                  )}
                  <span className="ml-auto text-[11px] text-gray-400 flex-shrink-0">{a.time}</span>
                </div>
                <p className="text-[12px] text-gray-600 leading-snug">{a.detail}</p>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-10 text-center text-[12px] text-gray-400">알림이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
