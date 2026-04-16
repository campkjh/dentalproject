'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

type Allocation = {
  id: string;
  name: string;
  type: 'CPV' | '부가광고';
  daily: number;
  monthly: number;
  spentMonth: number;
  active: boolean;
};

const INITIAL: Allocation[] = [
  { id: 'b1', name: '전체 이벤트 (CPV)', type: 'CPV', daily: 200000, monthly: 5000000, spentMonth: 3280000, active: true },
  { id: 'b2', name: '홈 배너 (부가광고)', type: '부가광고', daily: 50000, monthly: 1500000, spentMonth: 420000, active: true },
  { id: 'b3', name: '카테고리 프리미엄', type: '부가광고', daily: 30000, monthly: 900000, spentMonth: 220000, active: false },
];

export default function BudgetPage() {
  const [items, setItems] = useState<Allocation[]>(INITIAL);
  const totalMonthly = items.filter((i) => i.active).reduce((s, i) => s + i.monthly, 0);
  const totalSpent = items.reduce((s, i) => s + i.spentMonth, 0);

  const update = (id: string, patch: Partial<Allocation>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">예산 관리</h1>
        <p className="text-[12px] text-gray-500 mt-1">
          채널별 일 한도·월 한도를 설정해 포인트 소진을 제어할 수 있습니다.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Stat label="이번 달 예산" value={totalMonthly} sub="활성 채널 합산" />
        <Stat label="이번 달 소진" value={totalSpent} sub={`${Math.round((totalSpent / totalMonthly) * 100)}% 사용`} />
        <Stat label="잔여 예산" value={Math.max(0, totalMonthly - totalSpent)} sub="이번 달 남은 금액" />
      </div>

      <div className="rounded-lg bg-[#F5FAEF] text-[11px] text-[#5B8B25] px-3 py-2 flex items-start gap-1.5">
        <Info size={11} className="mt-0.5 flex-shrink-0" />
        일 한도에 도달하면 해당 채널은 자동으로 노출이 일시 정지되며, 자정에 리셋됩니다.
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[760px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">채널</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">유형</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">일 한도</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">월 한도</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">월 소진</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">활성</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const pct = Math.min(100, (i.spentMonth / i.monthly) * 100);
                return (
                  <tr key={i.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-3 text-gray-900 font-semibold">{i.name}</td>
                    <td className="px-3 py-3">
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-semibold"
                        style={{
                          backgroundColor: i.type === 'CPV' ? '#F5FAEF' : '#FFF8E1',
                          color: i.type === 'CPV' ? '#5B8B25' : '#B45309',
                        }}
                      >
                        {i.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        value={i.daily}
                        onChange={(e) => update(i.id, { daily: Number(e.target.value) || 0 })}
                        className="w-28 text-right text-[12px] border border-gray-200 rounded px-2 py-1 outline-none"
                      />
                      <span className="ml-1 text-gray-500">원</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        value={i.monthly}
                        onChange={(e) => update(i.id, { monthly: Number(e.target.value) || 0 })}
                        className="w-32 text-right text-[12px] border border-gray-200 rounded px-2 py-1 outline-none"
                      />
                      <span className="ml-1 text-gray-500">원</span>
                    </td>
                    <td className="px-3 py-3 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: pct > 85 ? '#E5484D' : '#8DC63F',
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700 w-16 text-right">
                          {i.spentMonth.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Toggle on={i.active} onToggle={() => update(i.id, { active: !i.active })} />
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

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-[22px] font-extrabold text-gray-900 mt-1">
        {value.toLocaleString()}
        <span className="text-[12px] font-semibold text-gray-600 ml-1">원</span>
      </p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-9 h-5 rounded-full"
      style={{
        backgroundColor: on ? '#8DC63F' : '#E5E7EB',
        transition: 'background-color 220ms ease',
      }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
        style={{ left: on ? 18 : 2, transition: 'left 240ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      />
    </button>
  );
}
