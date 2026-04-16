'use client';

import { useState } from 'react';
import { Info, Upload, Plus, Eye } from 'lucide-react';

type AdSlot = {
  id: string;
  name: string;
  description: string;
  pricePerDay: number;
  minDays: number;
  active: boolean;
};

type Campaign = {
  id: string;
  slot: string;
  title: string;
  period: string;
  dailyImpressions: number;
  status: '노출중' | '예정' | '종료';
  spent: number;
};

const SLOTS: AdSlot[] = [
  {
    id: 's1',
    name: '홈 상단 배너',
    description: '앱 홈 최상단에 노출되는 가로형 배너 (CTR 평균 3.2%)',
    pricePerDay: 150000,
    minDays: 3,
    active: true,
  },
  {
    id: 's2',
    name: '카테고리 프리미엄',
    description: '시술 카테고리 검색 결과 상단 고정 노출',
    pricePerDay: 80000,
    minDays: 7,
    active: true,
  },
  {
    id: 's3',
    name: '리뷰 노출 부스터',
    description: '후기 피드 상단에 이벤트 카드 우선 노출',
    pricePerDay: 60000,
    minDays: 5,
    active: false,
  },
  {
    id: 's4',
    name: '푸시 알림 캠페인',
    description: '타겟 유저에게 발송되는 마케팅 푸시 (비용 CPM 기준)',
    pricePerDay: 0,
    minDays: 1,
    active: true,
  },
];

const CAMPAIGNS: Campaign[] = [
  {
    id: 'c1',
    slot: '홈 상단 배너',
    title: '봄맞이 쌍꺼풀 특가',
    period: '2026-04-10 ~ 2026-04-17',
    dailyImpressions: 8420,
    status: '노출중',
    spent: 900000,
  },
  {
    id: 'c2',
    slot: '카테고리 프리미엄',
    title: '리프팅 · 안면윤곽',
    period: '2026-04-12 ~ 2026-04-25',
    dailyImpressions: 3120,
    status: '노출중',
    spent: 320000,
  },
  {
    id: 'c3',
    slot: '홈 상단 배너',
    title: '신규 원장 프로모션',
    period: '2026-04-20 ~ 2026-04-30',
    dailyImpressions: 0,
    status: '예정',
    spent: 0,
  },
];

const STATUS_COLOR: Record<Campaign['status'], { bg: string; text: string }> = {
  노출중: { bg: '#E6F7EB', text: '#15803D' },
  예정: { bg: '#FFF8E1', text: '#B45309' },
  종료: { bg: '#F3F4F6', text: '#6B7280' },
};

export default function AdsPage() {
  const [tab, setTab] = useState<'캠페인' | '슬롯'>('캠페인');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">부가광고 관리</h1>
        <p className="text-[12px] text-gray-500 mt-1">
          CPV 외 부가광고 슬롯을 구매하고 노출 캠페인을 관리합니다.
        </p>
      </div>

      <div className="rounded-lg bg-[#FFF8E1] text-[11px] text-[#B45309] px-3 py-2 flex items-start gap-1.5">
        <Info size={11} className="mt-0.5 flex-shrink-0" />
        부가광고 예산은 병원포인트에서 차감되며, 예산 관리에서 일/월 한도를 설정할 수 있습니다.
      </div>

      <div className="flex gap-1">
        {(['캠페인', '슬롯'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold"
            style={{
              backgroundColor: tab === t ? '#2B313D' : '#F4F5F7',
              color: tab === t ? '#fff' : '#51535C',
            }}
          >
            {t === '캠페인' ? '진행 캠페인' : '슬롯 구매'}
          </button>
        ))}
      </div>

      {tab === '캠페인' ? (
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-[14px] font-bold text-gray-900">진행 중인 캠페인</h2>
            <button className="px-3 py-1.5 rounded-lg bg-[#8DC63F] text-white text-[12px] font-semibold btn-press flex items-center gap-1">
              <Plus size={13} /> 캠페인 만들기
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[760px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">슬롯</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">캠페인</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">기간</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">일 노출</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">누적 소진</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600">상태</th>
                </tr>
              </thead>
              <tbody>
                {CAMPAIGNS.map((c) => {
                  const sc = STATUS_COLOR[c.status];
                  return (
                    <tr key={c.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{c.slot}</td>
                      <td className="px-3 py-3 text-gray-900 font-semibold">{c.title}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{c.period}</td>
                      <td className="px-3 py-3 text-right text-gray-700">
                        {c.dailyImpressions > 0 ? c.dailyImpressions.toLocaleString() : '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-900 font-bold">
                        {c.spent.toLocaleString()}원
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[11px] font-bold"
                          style={{ backgroundColor: sc.bg, color: sc.text }}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="grid md:grid-cols-2 gap-3">
          {SLOTS.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-[14px] font-bold text-gray-900">{s.name}</h3>
                <span
                  className="text-[10px] font-bold rounded px-1.5 py-0.5"
                  style={{
                    backgroundColor: s.active ? '#E6F7EB' : '#F3F4F6',
                    color: s.active ? '#15803D' : '#6B7280',
                  }}
                >
                  {s.active ? '구매 가능' : '모집중'}
                </span>
              </div>
              <p className="text-[12px] text-gray-500 leading-relaxed mb-3">
                {s.description}
              </p>
              <div className="text-[11px] text-gray-700 bg-gray-50 rounded-lg px-3 py-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">일 단가</span>
                  <span className="font-bold text-gray-900">
                    {s.pricePerDay > 0 ? `${s.pricePerDay.toLocaleString()}원` : 'CPM 견적'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-500">최소 기간</span>
                  <span className="font-semibold text-gray-900">{s.minDays}일</span>
                </div>
              </div>
              <div className="flex gap-2 mt-auto">
                <button className="flex-1 py-2 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-700 flex items-center justify-center gap-1">
                  <Eye size={12} /> 예시 보기
                </button>
                <button
                  disabled={!s.active}
                  className="flex-1 py-2 rounded-lg text-[12px] font-semibold disabled:opacity-40"
                  style={{
                    backgroundColor: s.active ? '#8DC63F' : '#E5E7EB',
                    color: '#fff',
                  }}
                >
                  캠페인 신청
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
