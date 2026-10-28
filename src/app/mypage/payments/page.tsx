'use client';

// 결제·환불 내역 — 프리티풀 마이 '구매·결제내역' 어법 그대로.
//  · 머리 = TopBar(뒤로) + 큰 제목 ⌄ 거르기(탭 대신). 고르면 제목이 그 이름으로('결제·환불 내역 ⌄' → '취소 내역 ⌄').
//  · 칸 = 사진 색 카드(ToneListCard = 프리티풀 PaymentToneCard): 상품 사진 · 상태 유리 배지 · 결제일 | 병원 · 금액 줄 · 방문 일정/결제 방식.
//  · 거르기를 바꾸면 목록 칸이 오른쪽→왼쪽 순차 슬라이드(QdBody, key 로 다시 재생).
import { useMemo, useState } from 'react';
import TopBar from '@/components/common/TopBar';
import LoginRequired from '@/components/common/LoginRequired';
import ToneListCard, { type ToneListRow } from '@/components/common/ToneListCard';
import { QdBody } from '@/components/detail/QdKit';
import type { TitleFilterOption } from '@/components/reservations/TitleFilterMenu';
import { BillingEmpty, BillingHeader, TossIcon, formatKDay } from '@/components/mypage/billing/BillingKit';
import { useStore } from '@/store';
import { Reservation } from '@/types';
import { resolveProductImageUrl } from '@/lib/images';

type Status = Reservation['status'];
type FilterKey = 'all' | 'paid' | 'pending' | 'cancelled';

/** 거르기 → 상태 묶음(예전 탭 '결제완료/결제대기/취소' 그대로) */
const filterToStatus: Record<FilterKey, Status[] | null> = {
  all: null,
  paid: ['confirmed', 'completed'],
  pending: ['pending'],
  cancelled: ['cancelled'],
};

const FILTERS: { key: FilterKey; label: string; title: string; icon: string }[] = [
  { key: 'all', label: '전체', title: '결제·환불 내역', icon: 'list' },
  { key: 'paid', label: '결제완료', title: '결제완료 내역', icon: 'pay-card' },
  { key: 'pending', label: '결제대기', title: '결제대기 내역', icon: 'clock' },
  { key: 'cancelled', label: '취소·환불', title: '취소 내역', icon: 'coin' },
];

const statusLabel: Record<Status, string> = {
  pending: '결제대기',
  confirmed: '결제완료',
  completed: '이용완료',
  cancelled: '취소됨',
};

/** 유리 배지 색 점 — 대기=주황 · 결제=파랑 · 이용완료=초록 · 취소=빨강 */
const statusDot: Record<Status, string> = {
  pending: '#FFB331',
  confirmed: '#3182F6',
  completed: '#12B76A',
  cancelled: '#F04452',
};

function CalendarMini() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function PaymentsPage() {
  const { isLoggedIn, reservations } = useStore();
  const [filter, setFilter] = useState<FilterKey>('all');

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: reservations.length, paid: 0, pending: 0, cancelled: 0 };
    reservations.forEach((r) => {
      (Object.keys(filterToStatus) as FilterKey[]).forEach((k) => {
        const target = filterToStatus[k];
        if (target && target.includes(r.status)) c[k] += 1;
      });
    });
    return c;
  }, [reservations]);

  const filtered = useMemo(() => {
    const target = filterToStatus[filter];
    if (!target) return reservations;
    return reservations.filter((r) => target.includes(r.status));
  }, [filter, reservations]);

  if (!isLoggedIn) {
    return (
      <div className="mx-auto min-h-screen max-w-[600px] bg-white pb-[86px] pc:pb-16">
        <TopBar title="결제·환불 내역" />
        <LoginRequired />
      </div>
    );
  }

  const options: TitleFilterOption<FilterKey>[] = FILTERS.map((f) => ({
    key: f.key,
    label: f.label,
    title: f.title,
    icon: <TossIcon name={f.icon} />,
    count: counts[f.key],
  }));
  const current = FILTERS.find((f) => f.key === filter) || FILTERS[0];

  return (
    <div className="mx-auto min-h-screen max-w-[600px] bg-white pb-[86px] pc:pb-16" style={{ letterSpacing: '-0.02em' }}>
      <BillingHeader<FilterKey>
        value={filter}
        options={options}
        onChange={setFilter}
        sub={reservations.length > 0 ? `결제 ${counts.paid}건 · 대기 ${counts.pending}건 · 취소 ${counts.cancelled}건` : undefined}
      />

      {filtered.length === 0 ? (
        filter === 'all' ? (
          <BillingEmpty
            icon="pay-card"
            title="아직 결제한 내역이 없어요"
            desc="시술을 예약하고 결제하면 이곳에 모여요"
            cta={{ href: '/', label: '시술 둘러보기' }}
          />
        ) : (
          <BillingEmpty icon={current.icon} title={`${current.label} 내역이 없어요`} desc="다른 내역은 제목 ⌄ 를 눌러 고를 수 있어요" />
        )
      ) : (
        <QdBody key={filter} className="space-y-3 px-5 pc:px-0">
          {filtered.map((payment, i) => {
            const productImage = resolveProductImageUrl(payment.productImage, payment.productId ?? payment.id);
            const isApp = payment.paymentMethod === '앱결제';
            const paidOn = formatKDay(payment.date);
            const visitRaw = payment.reservationDate || payment.visitDate;
            // 방문 일정은 칸이 좁아 연도를 뺀다('10.30 (금) 오전 11:00')
            const visit = formatKDay(visitRaw, true).replace(/^\d{4}\./, '');
            const rows: ToneListRow[] = [{ label: '결제금액', value: `${payment.amount.toLocaleString()}원` }];
            if (payment.status === 'cancelled') {
              rows.push({ label: '취소 금액', value: `${payment.amount.toLocaleString()}원`, tone: 'danger' });
            }
            return (
              <ToneListCard
                key={payment.id}
                index={i}
                href={`/reservations/${payment.id}`}
                image={productImage}
                name={payment.productTitle || '시술 상품'}
                badge={{ label: statusLabel[payment.status], dot: statusDot[payment.status] }}
                meta={[
                  ...(paidOn ? [<span key="d" className="inline-flex items-center gap-1"><CalendarMini />{paidOn}</span>] : []),
                  payment.hospitalName || '병원',
                ]}
                rows={rows}
                footer={
                  <div className="mt-2.5 flex items-center justify-between gap-3 px-0.5">
                    <span className="min-w-0 truncate text-[13px] tracking-[-0.2px] text-[#6B7684]">
                      {visit ? `방문 ${visit}` : payment.location}
                    </span>
                    {/* 결제 방식 — 앱결제=보라 · 현장결제=회색(예전 태그 색 그대로) */}
                    <span
                      className="shrink-0 rounded-[6px] px-[7px] py-0.5 text-[12px] font-semibold"
                      style={{ color: isApp ? '#8037FF' : '#51535C', backgroundColor: isApp ? '#F4EFFF' : 'rgba(255,255,255,.7)' }}
                    >
                      {isApp ? '앱결제' : '현장결제'}
                    </span>
                  </div>
                }
              />
            );
          })}
        </QdBody>
      )}
    </div>
  );
}
