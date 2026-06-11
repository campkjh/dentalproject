'use client';

import { useState, useMemo, useEffect } from 'react';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { Calendar, Download, Eye, CheckCircle2, XCircle, AlertTriangle, X, CalendarDays } from 'lucide-react';
import { useStore } from '@/store';
import { PageHeader, FilterChips, SearchInput, StatCard, PillButton, StatusBadge, EmptyState, SecondaryCTA } from '@/components/admin/ui';

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

const statusTone: Record<ReservationStatus, 'orange' | 'blue' | 'green' | 'red'> = {
  pending: 'orange', confirmed: 'blue', completed: 'green', cancelled: 'red',
};
const statusLabel: Record<ReservationStatus, string> = {
  pending: '확인중', confirmed: '확정', completed: '완료', cancelled: '취소',
};
const paymentLabel: Record<'app' | 'onsite', string> = { app: '앱결제', onsite: '현장결제' };
const paymentTone: Record<'app' | 'onsite', 'blue' | 'gray'> = { app: 'blue', onsite: 'gray' };

function formatAmount(n: number) { return n.toLocaleString('ko-KR') + '원'; }

const PAGE_SIZE = 20;

const FILTER_TABS: { value: 'all' | ReservationStatus; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '확인중' },
  { value: 'confirmed', label: '확정' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소' },
];

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AdminReservationsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | ReservationStatus>('all');
  const [apiReservations, setApiReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [modal, setModal] = useState<{ type: 'confirm' | 'cancel'; reservation: Reservation } | null>(null);
  const [detailReservation, setDetailReservation] = useState<Reservation | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  async function handleModalAction() {
    if (!modal) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const nextStatus = modal.type === 'confirm' ? 'confirmed' : 'cancelled';
      const res = await fetch(`/api/reservations/${modal.reservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data?.error ?? '처리에 실패했습니다.');
        return;
      }
      setApiReservations((prev) =>
        prev.map((r) => (r.id === modal.reservation.id ? { ...r, status: nextStatus as ReservationStatus } : r))
      );
      setModal(null);
    } finally {
      setActionBusy(false);
    }
  }

  function handleExport() {
    const header = ['예약번호', '고객명', '상품', '병원', '예약일시', '금액', '결제방법', '상태', '담당의'];
    const rows = filtered.map((r) => [
      r.id, r.customer, r.product, r.hospital, r.dateTime, String(r.amount),
      paymentLabel[r.paymentMethod], statusLabel[r.status], r.doctor,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apiReservations.filter((r) => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        r.hospital.toLowerCase().includes(q);
      const matchStart = !startDate || r.dateTime >= startDate;
      const matchEnd = !endDate || r.dateTime <= endDate + ' 23:59';
      return matchStatus && matchSearch && matchStart && matchEnd;
    });
  }, [apiReservations, search, statusFilter, startDate, endDate]);

  const { visibleCount, sentinelRef } = useInfiniteScroll(filtered.length, PAGE_SIZE);
  const pageData = filtered.slice(0, visibleCount);

  const counts = apiReservations.reduce(
    (acc, r) => { acc[r.status] += 1; return acc; },
    { pending: 0, confirmed: 0, completed: 0, cancelled: 0 } as Record<ReservationStatus, number>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="예약 관리"
        subtitle="앱에서 들어온 예약을 조회하고 확정·취소 처리합니다."
        right={
          <SecondaryCTA onClick={handleExport}>
            CSV 내보내기
          </SecondaryCTA>
        }
      />

      <div className="grid grid-cols-5 gap-3">
        <StatCard label="전체" value={apiReservations.length} suffix="건" />
        <StatCard label="확인중" value={counts.pending} suffix="건" accent="#F59E0B" />
        <StatCard label="확정" value={counts.confirmed} suffix="건" accent="#3182F6" />
        <StatCard label="완료" value={counts.completed} suffix="건" accent="#1AB554" />
        <StatCard label="취소" value={counts.cancelled} suffix="건" accent="#E54848" />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <FilterChips value={statusFilter} onChange={setStatusFilter} options={FILTER_TABS} />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 h-9 px-3 bg-white border border-[#E5E8EB] rounded-[10px]">
            <Calendar size={14} className="text-[#8B95A1]" />
            <input
              type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="h-7 text-[12px] focus:outline-none w-[110px]"
            />
            <span className="text-[#8B95A1] text-[12px]">~</span>
            <input
              type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="h-7 text-[12px] focus:outline-none w-[110px]"
            />
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="예약번호, 고객, 상품" width={240} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        {loading ? (
          <div className="px-5 py-16 text-center text-[13px] text-[#8B95A1]">불러오는 중…</div>
        ) : pageData.length === 0 ? (
          <EmptyState icon={<CalendarDays size={20} className="text-[#8B95A1]" />} title="예약이 없어요" hint="필터를 변경해 보세요." />
        ) : (
          <>
            <div className="grid grid-cols-[1fr_1fr_1.4fr_1.1fr_140px_120px_90px_90px_auto] gap-4 px-5 py-3 bg-[#FAFBFC] border-b border-[#F2F4F6] text-[11px] font-semibold text-[#8B95A1] uppercase tracking-wider">
              <div>예약번호</div>
              <div>고객</div>
              <div>상품</div>
              <div>병원</div>
              <div>예약일시</div>
              <div>금액</div>
              <div>결제</div>
              <div>상태</div>
              <div className="text-right">관리</div>
            </div>
            {pageData.map((r, i) => (
              <div
                key={r.id}
                className="grid grid-cols-[1fr_1fr_1.4fr_1.1fr_140px_120px_90px_90px_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors"
                style={{ borderBottom: i === pageData.length - 1 ? 'none' : '1px solid #F2F4F6' }}
              >
                <div className="text-[12px] font-mono text-[#3182F6] truncate">{r.id.slice(0, 8)}</div>
                <div className="text-[14px] font-semibold text-[#191F28] truncate">{r.customer}</div>
                <div className="text-[13px] text-[#4E5968] truncate">{r.product}</div>
                <div className="text-[13px] text-[#4E5968] truncate">{r.hospital}</div>
                <div className="text-[12px] text-[#8B95A1]">{r.dateTime}</div>
                <div className="text-[14px] font-bold text-[#191F28]">{formatAmount(r.amount)}</div>
                <div><StatusBadge tone={paymentTone[r.paymentMethod]}>{paymentLabel[r.paymentMethod]}</StatusBadge></div>
                <div><StatusBadge tone={statusTone[r.status]}>{statusLabel[r.status]}</StatusBadge></div>
                <div className="flex items-center gap-1.5 justify-end">
                  <PillButton tone="blue" onClick={() => setDetailReservation(r)}>
                    상세
                  </PillButton>
                  {r.status === 'pending' && (
                    <>
                      <PillButton tone="green" onClick={() => setModal({ type: 'confirm', reservation: r })}>
                        확정
                      </PillButton>
                      <PillButton tone="red" onClick={() => setModal({ type: 'cancel', reservation: r })}>
                        취소
                      </PillButton>
                    </>
                  )}
                  {r.status === 'confirmed' && (
                    <PillButton tone="red" onClick={() => setModal({ type: 'cancel', reservation: r })}>
                      취소
                    </PillButton>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
        <div className="px-5 py-4 border-t border-[#F2F4F6]">
          <p className="text-[12px] text-[#8B95A1] text-center">
            전체 <span className="font-semibold text-[#191F28]">{filtered.length.toLocaleString()}</span>건 중{' '}
            <span className="font-semibold text-[#191F28]">{Math.min(visibleCount, filtered.length)}</span>건 표시
          </p>
          {visibleCount < filtered.length && (
            <div ref={sentinelRef} className="h-10 flex items-center justify-center text-[11px] text-[#8B95A1]">
              스크롤하면 더 불러옵니다…
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: modal.type === 'confirm' ? '#E5F1FF' : '#FEECEC' }}
              >
                {modal.type === 'confirm'
                  ? <CheckCircle2 size={18} className="text-[#3182F6]" />
                  : <AlertTriangle size={18} className="text-[#E54848]" />}
              </div>
              <h3 className="text-[18px] font-bold text-[#191F28]">
                {modal.type === 'confirm' ? '예약을 확정할까요?' : '예약을 취소할까요?'}
              </h3>
            </div>

            <div className="bg-[#FAFBFC] rounded-xl p-3 mb-4 border border-[#F2F4F6] space-y-1.5 text-[12px]">
              <div className="flex justify-between"><span className="text-[#8B95A1]">예약번호</span><span className="text-[#191F28] font-mono">{modal.reservation.id.slice(0, 8)}</span></div>
              <div className="flex justify-between"><span className="text-[#8B95A1]">고객</span><span className="text-[#191F28] font-semibold">{modal.reservation.customer}</span></div>
              <div className="flex justify-between gap-3"><span className="text-[#8B95A1] flex-shrink-0">상품</span><span className="text-[#191F28] text-right truncate">{modal.reservation.product}</span></div>
              <div className="flex justify-between"><span className="text-[#8B95A1]">금액</span><span className="text-[#191F28] font-bold">{formatAmount(modal.reservation.amount)}</span></div>
            </div>

            <p className="text-[13px] text-[#4E5968] leading-relaxed mb-5">
              {modal.type === 'confirm'
                ? '고객에게 확정 알림이 발송됩니다.'
                : '고객에게 취소 알림이 발송되고 결제 금액이 환불 처리됩니다.'}
            </p>

            {actionError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                {actionError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setModal(null); setActionError(null); }}
                disabled={actionBusy}
                className="flex-1 h-11 border border-[#E5E8EB] rounded-[10px] text-[14px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleModalAction}
                disabled={actionBusy}
                className="flex-1 h-11 rounded-[10px] text-[14px] font-semibold text-white disabled:opacity-50 transition-colors"
                style={{ background: modal.type === 'confirm' ? '#3182F6' : '#E54848' }}
              >
                {actionBusy ? '처리 중…' : modal.type === 'confirm' ? '예약 확정' : '예약 취소'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailReservation && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setDetailReservation(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold text-[#191F28]">예약 상세</h3>
              <button onClick={() => setDetailReservation(null)} className="p-1 -m-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-[#8B95A1]" />
              </button>
            </div>
            {[
              ['예약번호', detailReservation.id],
              ['고객명', detailReservation.customer],
              ['상품', detailReservation.product],
              ['병원', detailReservation.hospital],
              ['담당의', detailReservation.doctor],
              ['예약일시', detailReservation.dateTime],
              ['결제수단', paymentLabel[detailReservation.paymentMethod]],
              ['금액', formatAmount(detailReservation.amount)],
              ['상태', statusLabel[detailReservation.status]],
            ].map(([k, v], i, arr) => (
              <div
                key={k}
                className="grid grid-cols-[100px_1fr] gap-3 items-center py-2.5"
                style={{ borderBottom: i === arr.length - 1 ? 'none' : '1px solid #F2F4F6' }}
              >
                <span className="text-[12px] font-medium text-[#8B95A1]">{k}</span>
                <span className="text-[13px] text-[#191F28] text-right truncate">{v}</span>
              </div>
            ))}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setDetailReservation(null)} className="flex-1 h-11 border border-[#E5E8EB] rounded-[10px] text-[14px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB]">
                닫기
              </button>
              {(detailReservation.status === 'pending' || detailReservation.status === 'confirmed') && (
                <button
                  onClick={() => { setModal({ type: 'cancel', reservation: detailReservation }); setDetailReservation(null); }}
                  className="flex-1 h-11 bg-[#E54848] text-white rounded-[10px] text-[14px] font-semibold hover:bg-[#C03B3B]"
                >
                  예약 취소
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
