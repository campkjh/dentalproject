'use client';

import { useState, useMemo, useEffect } from 'react';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { Download, CheckCircle2, AlertTriangle, CalendarDays } from 'lucide-react';
import { useStore } from '@/store';
import {
  PageHeader, FilterChips, SearchInput, StatCard, StatRow, PillButton, StatusBadge, EmptyState, SecondaryCTA,
  AdminListCard, Toolbar, Count, TableFoot, LoadingRows, AdminModal,
} from '@/components/admin/ui';
import { AdminDatePop } from '@/components/admin/AdminDatePop';

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

  const GRID = 'grid grid-cols-[1fr_1fr_1.4fr_1.1fr_140px_120px_90px_90px_auto] gap-4 items-center';

  return (
    <div className="adm-stack">
      <PageHeader
        right={
          <SecondaryCTA onClick={handleExport}>
            <Download size={16} /> CSV 내보내기
          </SecondaryCTA>
        }
      />

      <StatRow cols={5}>
        <StatCard label="전체" value={apiReservations.length} suffix="건" />
        <StatCard label="확인중" value={counts.pending} suffix="건" accent="#F59E0B" />
        <StatCard label="확정" value={counts.confirmed} suffix="건" accent="#3182F6" />
        <StatCard label="완료" value={counts.completed} suffix="건" accent="#1AB554" />
        <StatCard label="취소" value={counts.cancelled} suffix="건" accent="#E54848" />
      </StatRow>

      <AdminListCard
        filter={
          <>
            <Toolbar>
              <SearchInput value={search} onChange={setSearch} placeholder="예약번호, 고객, 상품" width={300} />
              <div className="adm-daterange">
                <AdminDatePop value={startDate} onChange={setStartDate} placeholder="시작일" ariaLabel="예약 시작일" rangeStart={startDate} rangeEnd={endDate} />
                <span>~</span>
                <AdminDatePop value={endDate} onChange={setEndDate} placeholder="종료일" ariaLabel="예약 종료일" rangeStart={startDate} rangeEnd={endDate} />
              </div>
              <span className="grow" />
              <Count n={filtered.length} />
            </Toolbar>
            <Toolbar>
              <FilterChips value={statusFilter} onChange={setStatusFilter} options={FILTER_TABS} ariaLabel="예약 상태" />
            </Toolbar>
          </>
        }
      >
        {loading ? (
          <LoadingRows />
        ) : pageData.length === 0 ? (
          <EmptyState icon={<CalendarDays size={22} />} title="예약이 없어요" hint="거르기를 바꿔 보세요." />
        ) : (
          <div className="adm-tscroll">
            <div className="adm-tscroll-in">
              <div className={`${GRID} adm-ghead`}>
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
              {pageData.map((r) => (
                <div key={r.id} className={`${GRID} adm-grow`}>
                  <div className="adm-mono truncate">{r.id.slice(0, 8)}</div>
                  <div className="adm-cell-main">{r.customer}</div>
                  <div className="adm-cell">{r.product}</div>
                  <div className="adm-cell">{r.hospital}</div>
                  <div className="adm-cell dim">{r.dateTime}</div>
                  <div className="adm-num">{formatAmount(r.amount)}</div>
                  <div><StatusBadge tone={paymentTone[r.paymentMethod]}>{paymentLabel[r.paymentMethod]}</StatusBadge></div>
                  <div><StatusBadge tone={statusTone[r.status]}>{statusLabel[r.status]}</StatusBadge></div>
                  <div className="adm-actions">
                    <PillButton onClick={() => setDetailReservation(r)}>상세</PillButton>
                    {r.status === 'pending' && (
                      <>
                        <PillButton tone="blue" onClick={() => setModal({ type: 'confirm', reservation: r })}>확정</PillButton>
                        <PillButton tone="red" onClick={() => setModal({ type: 'cancel', reservation: r })}>취소</PillButton>
                      </>
                    )}
                    {r.status === 'confirmed' && (
                      <PillButton tone="red" onClick={() => setModal({ type: 'cancel', reservation: r })}>취소</PillButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && <TableFoot total={filtered.length} shown={visibleCount} sentinelRef={sentinelRef} />}
      </AdminListCard>

      {/* 확정·취소 확인 */}
      {modal && (
        <AdminModal
          onClose={() => { setModal(null); setActionError(null); }}
          busy={actionBusy}
          icon={
            <span className={`adm-modal-ic ${modal.type === 'confirm' ? '' : 'red'}`}>
              {modal.type === 'confirm' ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
            </span>
          }
          title={modal.type === 'confirm' ? '예약을 확정할까요?' : '예약을 취소할까요?'}
          actions={
            <>
              <button type="button" className="adm-btn" onClick={() => { setModal(null); setActionError(null); }} disabled={actionBusy}>
                닫기
              </button>
              <button
                type="button"
                className={`adm-btn ${modal.type === 'confirm' ? 'primary' : 'danger-solid'}`}
                onClick={handleModalAction}
                disabled={actionBusy}
              >
                {actionBusy ? '처리 중…' : modal.type === 'confirm' ? '예약 확정' : '예약 취소'}
              </button>
            </>
          }
        >
          <div className="adm-kvbox">
            <div className="adm-kv"><span>예약번호</span><span className="adm-mono">{modal.reservation.id.slice(0, 8)}</span></div>
            <div className="adm-kv"><span>고객</span><span>{modal.reservation.customer}</span></div>
            <div className="adm-kv"><span>상품</span><span className="truncate">{modal.reservation.product}</span></div>
            <div className="adm-kv"><span>금액</span><span className="adm-num">{formatAmount(modal.reservation.amount)}</span></div>
          </div>
          <p className="adm-modal-note">
            {modal.type === 'confirm'
              ? '고객에게 확정 알림이 발송됩니다.'
              : '고객에게 취소 알림이 발송되고 결제 금액이 환불 처리됩니다.'}
          </p>
          {actionError && <p className="adm-note red mt-3">{actionError}</p>}
        </AdminModal>
      )}

      {/* 예약 상세 */}
      {detailReservation && (
        <AdminModal
          onClose={() => setDetailReservation(null)}
          title="예약 상세"
          actions={
            <>
              <button type="button" className="adm-btn" onClick={() => setDetailReservation(null)}>닫기</button>
              {(detailReservation.status === 'pending' || detailReservation.status === 'confirmed') && (
                <button
                  type="button"
                  className="adm-btn danger"
                  onClick={() => { setModal({ type: 'cancel', reservation: detailReservation }); setDetailReservation(null); }}
                >
                  예약 취소
                </button>
              )}
            </>
          }
        >
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
          ].map(([k, v]) => (
            <div key={k} className="adm-kv"><span>{k}</span><span>{v}</span></div>
          ))}
        </AdminModal>
      )}
    </div>
  );
}
