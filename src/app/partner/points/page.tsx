'use client';

import { useState, useMemo } from 'react';
import { Copy, Info } from 'lucide-react';

type Tx = {
  id: string;
  date: string;
  type: '충전' | 'CPV 소진' | '부가광고 소진' | '환불';
  description: string;
  amount: number; // positive = charge, negative = spend
  balance: number;
};

const INITIAL_TX: Tx[] = [
  { id: 't1', date: '2026-04-16', type: '충전', description: '세금계산서 발행', amount: 2200000, balance: 3840000 },
  { id: 't2', date: '2026-04-15', type: 'CPV 소진', description: '이벤트 #1041 노출', amount: -32000, balance: 1640000 },
  { id: 't3', date: '2026-04-15', type: 'CPV 소진', description: '이벤트 #1039 노출', amount: -48000, balance: 1672000 },
  { id: 't4', date: '2026-04-14', type: '부가광고 소진', description: '홈 배너 노출 3일', amount: -150000, balance: 1720000 },
  { id: 't5', date: '2026-04-13', type: 'CPV 소진', description: '이벤트 #1035 노출', amount: -25000, balance: 1870000 },
  { id: 't6', date: '2026-04-10', type: '충전', description: '세금계산서 발행', amount: 1650000, balance: 1895000 },
  { id: 't7', date: '2026-04-05', type: '환불', description: '이벤트 #1022 부분 환불', amount: 48000, balance: 245000 },
];

const WEEKS = ['4/10~16', '4/3~9', '3/27~4/2', '3/20~26'];
const WEEK_CPV = [105000, 82000, 98000, 120000];
const WEEK_AD = [150000, 0, 200000, 0];

export default function PointsPage() {
  const [range, setRange] = useState<'7일' | '30일' | '90일'>('30일');
  const [filter, setFilter] = useState<'전체' | Tx['type']>('전체');

  const totalPoints = INITIAL_TX[0].balance;
  const totalSpent = INITIAL_TX.filter((t) => t.amount < 0).reduce((s, t) => s + -t.amount, 0);

  const filtered = useMemo(
    () => (filter === '전체' ? INITIAL_TX : INITIAL_TX.filter((t) => t.type === filter)),
    [filter]
  );

  const maxBar = Math.max(...WEEK_CPV.map((v, i) => v + WEEK_AD[i]));

  return (
    <div className="space-y-4">
      <h1 className="text-[18px] font-bold text-gray-900">병원포인트</h1>

      {/* Top summary */}
      <div className="grid md:grid-cols-[1fr_1fr] gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-[12px] text-gray-500">총 포인트</p>
          <p className="text-[28px] font-extrabold text-gray-900 mt-1">
            {totalPoints.toLocaleString()}
            <span className="text-[14px] font-semibold text-gray-600 ml-1">P</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-2">
            최근 30일 소진 {totalSpent.toLocaleString()}P
          </p>
          <button className="mt-4 px-4 py-2 rounded-lg bg-[#8DC63F] text-white text-[12px] font-semibold btn-press">
            포인트 충전
          </button>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-[12px] text-gray-500">포인트 입금 계좌번호</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-[17px] font-extrabold text-gray-900">
              신한 110-555-012345
            </p>
            <button
              aria-label="복사"
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            >
              <Copy size={13} />
            </button>
          </div>
          <p className="text-[11px] text-[#B45309] bg-[#FFF8E1] rounded px-2 py-1.5 mt-3 leading-snug flex items-start gap-1.5">
            <Info size={11} className="mt-0.5 flex-shrink-0" />
            충전을 원하는 금액의 부가세 10%를 함께 입금해주세요. (예: 200만원 충전 → 220만원 입금)
          </p>
          <p className="text-[11px] text-gray-400 mt-2">
            세금계산서 발행처: 오케이치과의원 (변경은 파트너 고객센터로 문의)
          </p>
        </div>
      </div>

      {/* Chart */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-bold text-gray-900">병원포인트 내역</h2>
          <div className="flex gap-1">
            {(['7일', '30일', '90일'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-2.5 py-1 rounded text-[11px] font-semibold"
                style={{
                  backgroundColor: range === r ? '#2B313D' : '#F4F5F7',
                  color: range === r ? '#fff' : '#51535C',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Stacked bar chart */}
        <div className="flex items-end gap-6 h-40 mb-2">
          {WEEKS.map((w, i) => {
            const cpv = WEEK_CPV[i];
            const ad = WEEK_AD[i];
            const total = cpv + ad;
            const cpvH = (cpv / maxBar) * 140;
            const adH = (ad / maxBar) * 140;
            return (
              <div key={w} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500 mb-1">
                  {total.toLocaleString()}
                </span>
                <div className="w-full max-w-[40px] flex flex-col-reverse rounded overflow-hidden">
                  <div style={{ height: cpvH, backgroundColor: '#8DC63F' }} />
                  <div style={{ height: adH, backgroundColor: '#FDCB6E' }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-4 gap-6 mb-3">
          {WEEKS.map((w) => (
            <span key={w} className="text-[10px] text-gray-400 text-center">
              {w}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4 text-[11px] text-gray-600">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#8DC63F]" /> CPV 소진
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#FDCB6E]" /> 부가광고 소진
          </span>
        </div>
      </section>

      {/* Transaction table */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-[14px] font-bold text-gray-900">상세 내역</h2>
          <div className="flex gap-1 flex-wrap">
            {(['전체', '충전', 'CPV 소진', '부가광고 소진', '환불'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as typeof filter)}
                className="px-2.5 py-1 rounded text-[11px] font-semibold"
                style={{
                  backgroundColor: filter === f ? '#2B313D' : '#F4F5F7',
                  color: filter === f ? '#fff' : '#51535C',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600">날짜</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600">유형</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600">내용</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600">포인트</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600">잔액</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-700">{t.date}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold"
                      style={{
                        backgroundColor:
                          t.type === '충전' ? '#F5FAEF'
                          : t.type === '환불' ? '#E6F7EB'
                          : '#FFF8E1',
                        color:
                          t.type === '충전' ? '#5B8B25'
                          : t.type === '환불' ? '#15803D'
                          : '#B45309',
                      }}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{t.description}</td>
                  <td
                    className="px-4 py-3 text-right font-bold"
                    style={{ color: t.amount > 0 ? '#15803D' : '#E5484D' }}
                  >
                    {t.amount > 0 ? '+' : ''}
                    {t.amount.toLocaleString()}P
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 font-semibold">
                    {t.balance.toLocaleString()}P
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-400 px-4 py-3 border-t border-gray-100">
          당일 차감된 포인트 내역은 익일 새벽에 업데이트됩니다.
        </p>
      </section>
    </div>
  );
}
