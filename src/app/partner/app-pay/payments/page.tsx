'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

type Payment = {
  id: string;
  paidAt: string;
  customerName: string;
  customerPhone: string;
  eventTitle: string;
  passType: '1회권' | '5회권' | '10회권';
  status: '결제완료' | '사용완료' | '부분사용' | '환불';
  amount: number;
  memo: string;
};

const INITIAL: Payment[] = [
  {
    id: 'PAY-24-1041',
    paidAt: '2026-04-16 15:22',
    customerName: '이지은',
    customerPhone: '010-1234-5678',
    eventTitle: '피부관리 5회권',
    passType: '5회권',
    status: '결제완료',
    amount: 450000,
    memo: '첫 방문 안내 문자 발송',
  },
  {
    id: 'PAY-24-1039',
    paidAt: '2026-04-15 10:05',
    customerName: '박민수',
    customerPhone: '010-2345-6789',
    eventTitle: '리프팅 1회권',
    passType: '1회권',
    status: '사용완료',
    amount: 280000,
    memo: '',
  },
  {
    id: 'PAY-24-1035',
    paidAt: '2026-04-13 18:40',
    customerName: '김하늘',
    customerPhone: '010-3456-7890',
    eventTitle: '피부관리 10회권',
    passType: '10회권',
    status: '부분사용',
    amount: 900000,
    memo: '잔여 6회',
  },
  {
    id: 'PAY-24-1030',
    paidAt: '2026-04-10 12:15',
    customerName: '정유나',
    customerPhone: '010-4567-8901',
    eventTitle: '보톡스 1회권',
    passType: '1회권',
    status: '환불',
    amount: 180000,
    memo: '당일 취소',
  },
];

const STATUS_COLOR: Record<Payment['status'], { bg: string; text: string }> = {
  결제완료: { bg: '#E6F2FF', text: '#1E6FD9' },
  사용완료: { bg: '#F4EFFF', text: '#7C3AED' },
  부분사용: { bg: '#FFF8E1', text: '#B45309' },
  환불: { bg: '#F3F4F6', text: '#6B7280' },
};

export default function AppPayPaymentsPage() {
  const [items, setItems] = useState<Payment[]>(INITIAL);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'전체' | Payment['status']>('전체');

  const filtered = items.filter((p) => {
    if (statusFilter !== '전체' && p.status !== statusFilter) return false;
    if (q && !p.customerName.includes(q) && !p.id.includes(q)) return false;
    return true;
  });

  const updateMemo = (id: string, memo: string) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, memo } : p)));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">앱결제 정보 관리</h1>
        <p className="text-[12px] text-gray-500 mt-1">총 {items.length}건</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 flex-wrap">
          {(['전체', '결제완료', '사용완료', '부분사용', '환불'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as typeof statusFilter)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
              style={{
                backgroundColor: statusFilter === s ? '#2B313D' : '#F4F5F7',
                color: statusFilter === s ? '#fff' : '#51535C',
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <div
          className="ml-auto flex items-center gap-2 px-3"
          style={{ height: 34, borderRadius: 9999, backgroundColor: '#F4F5F7', minWidth: 220 }}
        >
          <Search size={14} className="text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="결제번호·이름 검색"
            className="flex-1 text-[12px] bg-transparent outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[960px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">결제번호/일시</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">결제자</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">결제 시술</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">이용권</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">결제 상태/금액</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">메모</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const sc = STATUS_COLOR[p.status];
                return (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0 align-top">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-gray-900 whitespace-nowrap">{p.id}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{p.paidAt}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-gray-900 font-semibold">{p.customerName}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{p.customerPhone}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-800">{p.eventTitle}</td>
                    <td className="px-3 py-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-bold">
                        {p.passType}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[11px] font-bold"
                        style={{ backgroundColor: sc.bg, color: sc.text }}
                      >
                        {p.status}
                      </span>
                      <p className="text-gray-900 font-bold mt-0.5">
                        {p.amount.toLocaleString()}원
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={p.memo}
                        onChange={(e) => updateMemo(p.id, e.target.value)}
                        placeholder="메모 입력"
                        className="text-[11px] border border-gray-200 rounded px-1.5 py-1 outline-none w-36"
                      />
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
