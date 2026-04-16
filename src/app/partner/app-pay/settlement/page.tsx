'use client';

import { Info, Download } from 'lucide-react';

type Settlement = {
  id: string;
  periodLabel: string;
  fileGeneratedAt: string;
  payoutDate: string;
  totalAmount: number;
  totalCount: number;
  status: '지급완료' | '지급예정' | '확인중';
};

const SETTLEMENTS: Settlement[] = [
  {
    id: 'S-2026-16',
    periodLabel: '2026-04-08 ~ 2026-04-14',
    fileGeneratedAt: '2026-04-15 (월)',
    payoutDate: '2026-04-17 (수)',
    totalAmount: 3280000,
    totalCount: 12,
    status: '지급완료',
  },
  {
    id: 'S-2026-15',
    periodLabel: '2026-04-01 ~ 2026-04-07',
    fileGeneratedAt: '2026-04-08 (월)',
    payoutDate: '2026-04-10 (수)',
    totalAmount: 2450000,
    totalCount: 9,
    status: '지급완료',
  },
  {
    id: 'S-2026-17',
    periodLabel: '2026-04-15 ~ 2026-04-21',
    fileGeneratedAt: '2026-04-22 (월)',
    payoutDate: '2026-04-24 (수)',
    totalAmount: 1820000,
    totalCount: 7,
    status: '지급예정',
  },
];

const STATUS_COLOR: Record<Settlement['status'], { bg: string; text: string }> = {
  지급완료: { bg: '#E6F7EB', text: '#15803D' },
  지급예정: { bg: '#FFF8E1', text: '#B45309' },
  확인중: { bg: '#F3F4F6', text: '#6B7280' },
};

export default function SettlementPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">정산 내역 확인</h1>
        <p className="text-[12px] text-gray-500 mt-1">
          사용처리 날짜 기준 주 1회 정산이 진행됩니다.
        </p>
      </div>

      <div className="rounded-lg bg-[#F5FAEF] text-[11px] text-[#5B8B25] px-3 py-2 flex items-start gap-1.5">
        <Info size={12} className="mt-0.5 flex-shrink-0" />
        <p className="leading-snug">
          사용 완료처리가 진행된 날짜를 기준으로 차주 월요일에 정산 파일이 생성되며,
          파일 생성일자의 차주 수요일에 다회성 시술권의 전체 금액에 대한 정산이 진행됩니다.
          지급일이 공휴일인 경우 다음 영업일에 지급됩니다.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Stat label="이번 달 지급 예정" value={1820000} sub="1건" tone="pending" />
        <Stat label="이번 달 지급 완료" value={5730000} sub="21건" tone="done" />
        <Stat label="누적 정산 금액" value={125480000} sub="전체" tone="total" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-[14px] font-bold text-gray-900">정산 내역</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[760px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">정산번호</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">정산 기간</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">파일 생성일</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">지급일</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">정산 건수</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">정산 금액</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">상태</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">파일</th>
              </tr>
            </thead>
            <tbody>
              {SETTLEMENTS.map((s) => {
                const sc = STATUS_COLOR[s.status];
                return (
                  <tr key={s.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{s.id}</td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{s.periodLabel}</td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{s.fileGeneratedAt}</td>
                    <td className="px-3 py-3 text-gray-900 font-semibold whitespace-nowrap">{s.payoutDate}</td>
                    <td className="px-3 py-3 text-right text-gray-700">{s.totalCount}건</td>
                    <td className="px-3 py-3 text-right text-gray-900 font-bold whitespace-nowrap">
                      {s.totalAmount.toLocaleString()}원
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[11px] font-bold"
                        style={{ backgroundColor: sc.bg, color: sc.text }}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        disabled={s.status !== '지급완료'}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5B8B25] disabled:text-gray-300"
                      >
                        <Download size={12} /> 정산서
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  tone: 'pending' | 'done' | 'total';
}) {
  const colors = {
    pending: { bg: '#FFF8E1', text: '#B45309' },
    done: { bg: '#F5FAEF', text: '#5B8B25' },
    total: { bg: '#F3F4F6', text: '#2B313D' },
  }[tone];
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-[22px] font-extrabold mt-1" style={{ color: colors.text }}>
        {value.toLocaleString()}
        <span className="text-[12px] font-semibold text-gray-600 ml-1">원</span>
      </p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}
