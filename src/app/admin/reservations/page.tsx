'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Calendar,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Filter,
  AlertTriangle,
} from 'lucide-react';

// ---------- Types ----------
type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface Reservation {
  id: string;
  customer: string;
  product: string;
  hospital: string;
  dateTime: string;
  amount: number;
  paymentMethod: 'app' | 'onsite';
  status: ReservationStatus;
  doctor: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const statusTabs: { key: ReservationStatus | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '예약확인중' },
  { key: 'confirmed', label: '예약확정' },
  { key: 'completed', label: '완료' },
  { key: 'cancelled', label: '취소' },
];

const statusConfig: Record<ReservationStatus, { label: string; className: string }> = {
  pending: { label: '확인중', className: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: '확정', className: 'bg-blue-100 text-blue-700' },
  completed: { label: '완료', className: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소', className: 'bg-red-100 text-red-700' },
};

const paymentConfig: Record<string, { label: string; className: string }> = {
  app: { label: '앱결제', className: 'bg-purple-100 text-[#7C3AED]' },
  onsite: { label: '현장결제', className: 'bg-gray-100 text-gray-600' },
};

function formatAmount(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

type SortKey = 'id' | 'customer' | 'product' | 'hospital' | 'dateTime' | 'amount' | 'doctor';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

export default function AdminReservationsPage() {
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');
  const [apiReservations, setApiReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/reservations', { cache: 'no-store' });
        if (!res.ok) return;
        const { reservations } = await res.json();
        if (cancelled) return;
        setApiReservations(
          (reservations ?? []).map((r: any) => ({
            id: r.id,
            customer: r.user?.name ?? r.customer_name ?? '환자',
            product: r.product?.title ?? '-',
            hospital: r.hospital?.name ?? '-',
            dateTime: r.visit_at
              ? new Date(r.visit_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
              : '-',
            amount: r.amount ?? 0,
            paymentMethod: (r.payment_method ? 'app' : 'onsite') as 'app' | 'onsite',
            status: r.status as ReservationStatus,
            doctor: r.doctor?.name ? `${r.doctor.name} 원장` : '미지정',
          }))
        );
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  // Modal
  const [modal, setModal] = useState<{ type: 'confirm' | 'cancel'; reservation: Reservation } | null>(null);

  // ---- Filter & Sort ----
  const filtered = useMemo(() => {
    let list = [...apiReservations];
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.customer.toLowerCase().includes(q) ||
          r.product.toLowerCase().includes(q) ||
          r.hospital.toLowerCase().includes(q)
      );
    }
    if (startDate) list = list.filter((r) => r.dateTime >= startDate);
    if (endDate) list = list.filter((r) => r.dateTime <= endDate + ' 23:59');

    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [search, statusFilter, startDate, endDate, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats (fixed display values)
  const statsRow = [
    { label: '전체', value: '1,847', color: 'text-gray-900' },
    { label: '확인중', value: '234', color: 'text-yellow-600' },
    { label: '확정', value: '856', color: 'text-blue-600' },
    { label: '완료', value: '623', color: 'text-green-600' },
    { label: '취소', value: '134', color: 'text-red-500' },
  ];

  // ---- Handlers ----
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown size={14} className="text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp size={14} className="text-[#7C3AED]" /> : <ChevronDown size={14} className="text-[#7C3AED]" />;
  }

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">예약 관리</h2>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <Download size={16} /> 내보내기
        </button>
      </div>

      {/* ---------- Stats ---------- */}
      <div className="grid grid-cols-5 gap-4">
        {statsRow.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ---------- Status Tabs ---------- */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`px-4 py-2 text-sm rounded-md transition-colors font-medium ${
              statusFilter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ---------- Filters ---------- */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[280px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="예약번호, 고객명, 상품명, 병원명 검색..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/30"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED] bg-white"
            />
            <span className="text-gray-400 text-sm">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED] bg-white"
            />
          </div>
        </div>
      </div>

      {/* ---------- Table ---------- */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                {(
                  [
                    ['id', '예약번호', 'min-w-[160px]'],
                    ['customer', '고객명', 'w-24'],
                    ['product', '상품명', 'min-w-[200px]'],
                    ['hospital', '병원명', 'min-w-[160px]'],
                    ['dateTime', '예약일시', 'w-40'],
                    ['amount', '금액', 'w-32'],
                    [null, '결제방법', 'w-24'],
                    [null, '상태', 'w-20'],
                    ['doctor', '담당의사', 'w-28'],
                    [null, '관리', 'w-36'],
                  ] as [SortKey | null, string, string][]
                ).map(([key, label, width]) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase ${width} ${key ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
                    onClick={() => key && handleSort(key)}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {key && <SortIcon col={key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageData.map((res) => {
                const st = statusConfig[res.status];
                const pm = paymentConfig[res.paymentMethod];
                return (
                  <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-[#7C3AED] font-medium">{res.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{res.customer}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[220px] truncate">{res.product}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{res.hospital}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{res.dateTime}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatAmount(res.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${pm.className}`}>
                        {pm.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{res.doctor}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-gray-400 hover:text-[#7C3AED] hover:bg-purple-50 rounded-lg transition-colors" title="상세">
                          <Eye size={15} />
                        </button>
                        {res.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setModal({ type: 'confirm', reservation: res })}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="예약 확정"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            <button
                              onClick={() => setModal({ type: 'cancel', reservation: res })}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="예약 취소"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {res.status === 'confirmed' && (
                          <button
                            onClick={() => setModal({ type: 'cancel', reservation: res })}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="예약 취소"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400 text-sm">검색 결과가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ---------- Pagination ---------- */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            총 <span className="font-medium text-gray-900">{filtered.length}</span>개 중{' '}
            <span className="font-medium text-gray-900">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  n === page ? 'bg-[#7C3AED] text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Confirmation Modal ---------- */}
      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              {modal.type === 'confirm' ? (
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-blue-600" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                {modal.type === 'confirm' ? '예약 확정' : '예약 취소'}
              </h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">예약번호</span>
                <span className="font-medium text-gray-900">{modal.reservation.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">고객명</span>
                <span className="text-gray-900">{modal.reservation.customer}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">상품</span>
                <span className="text-gray-900">{modal.reservation.product}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">금액</span>
                <span className="font-semibold text-gray-900">{formatAmount(modal.reservation.amount)}</span>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              {modal.type === 'confirm'
                ? '이 예약을 확정하시겠습니까? 고객에게 확정 알림이 발송됩니다.'
                : '이 예약을 취소하시겠습니까? 고객에게 취소 알림이 발송되며, 결제 금액이 환불됩니다.'}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                닫기
              </button>
              <button
                onClick={() => setModal(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                  modal.type === 'confirm'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {modal.type === 'confirm' ? '예약 확정' : '예약 취소'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
