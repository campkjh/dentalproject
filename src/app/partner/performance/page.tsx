'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

type Metric = {
  label: string;
  value: number;
  delta: number; // percent vs prev period
  suffix?: string;
};

const WEEKS = ['4/10~16', '4/3~9', '3/27~4/2', '3/20~26'];
const IMPRESSIONS = [18420, 15200, 16800, 19100];
const CLICKS = [1240, 980, 1080, 1320];
const CONSULTS = [124, 92, 108, 131];
const CONSULT_BAR_MAX = Math.max(...CONSULTS);

const TOP_EVENTS = [
  { title: '눈매교정 + 쌍꺼풀 자연유착', impressions: 5240, consults: 48, rate: 0.91 },
  { title: '코끝 재수술 3D', impressions: 3980, consults: 32, rate: 0.8 },
  { title: '리프팅 올드클래식 15라인', impressions: 3120, consults: 28, rate: 0.89 },
  { title: '보톡스 이마+미간', impressions: 2480, consults: 12, rate: 0.48 },
];

export default function PerformancePage() {
  const [range, setRange] = useState<'7일' | '30일' | '90일'>('30일');

  const METRICS: Metric[] = [
    { label: '노출수', value: 69520, delta: 12.4 },
    { label: '클릭수', value: 4620, delta: 8.1 },
    { label: 'CTR', value: 6.6, delta: -0.4, suffix: '%' },
    { label: '상담 신청수', value: 455, delta: 18.2 },
    { label: '상담 전환율', value: 9.8, delta: 1.2, suffix: '%' },
    { label: '예상 매출', value: 89400000, delta: 22.3, suffix: '원' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">성과 관리</h1>
          <p className="text-[12px] text-gray-500 mt-1">
            노출·상담·매출 지표를 한눈에 확인합니다.
          </p>
        </div>
        <div className="flex gap-1">
          {(['7일', '30일', '90일'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1.5 rounded text-[11px] font-semibold"
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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {METRICS.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[11px] text-gray-500">{m.label}</p>
            <p className="text-[22px] font-extrabold text-gray-900 mt-1">
              {m.value.toLocaleString()}
              {m.suffix && (
                <span className="text-[12px] font-semibold text-gray-600 ml-1">
                  {m.suffix}
                </span>
              )}
            </p>
            <p
              className="text-[11px] font-semibold mt-1 flex items-center gap-0.5"
              style={{ color: m.delta >= 0 ? '#15803D' : '#E5484D' }}
            >
              {m.delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(m.delta).toFixed(1)}% <span className="text-gray-400 font-normal">vs 이전</span>
            </p>
          </div>
        ))}
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-[14px] font-bold text-gray-900 mb-3">주간 상담 신청수</h2>
        <div className="flex items-end gap-6 h-36 mb-2">
          {WEEKS.map((w, i) => {
            const h = (CONSULTS[i] / CONSULT_BAR_MAX) * 120;
            return (
              <div key={w} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500">{CONSULTS[i]}</span>
                <div
                  className="w-full max-w-[40px] rounded-t"
                  style={{ height: h, backgroundColor: '#8DC63F' }}
                />
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-4 gap-6">
          {WEEKS.map((w) => (
            <span key={w} className="text-[10px] text-gray-400 text-center">
              {w}
            </span>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-[14px] font-bold text-gray-900">인기 이벤트 TOP</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">상담 전환율 순</p>
        </div>
        <table className="w-full text-[12px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-gray-600">이벤트</th>
              <th className="px-4 py-2.5 text-right font-semibold text-gray-600">노출</th>
              <th className="px-4 py-2.5 text-right font-semibold text-gray-600">상담</th>
              <th className="px-4 py-2.5 text-right font-semibold text-gray-600">전환율</th>
            </tr>
          </thead>
          <tbody>
            {TOP_EVENTS.map((e, idx) => (
              <tr key={e.title} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#F5FAEF] text-[#5B8B25] flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-gray-900 font-semibold">{e.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{e.impressions.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-gray-900 font-semibold">{e.consults}</td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold" style={{ color: e.rate >= 0.8 ? '#5B8B25' : '#B45309' }}>
                    {(e.rate * 100).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
