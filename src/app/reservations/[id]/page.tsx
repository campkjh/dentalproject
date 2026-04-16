'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  MapPin,
  Navigation,
  Phone,
  MessageSquare,
  Calendar,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { useStore } from '@/store';
import { Reservation } from '@/types';

const statusIconSrc: Record<Reservation['status'], string> = {
  pending: '/icons/status-pending.svg',
  confirmed: '/icons/status-confirmed.svg',
  completed: '/icons/status-completed.svg',
  cancelled: '/icons/status-cancelled.svg',
};

const statusStyle: Record<
  Reservation['status'],
  { text: string; bg: string; label: string }
> = {
  pending: { text: 'text-[#FFA04E]', bg: 'bg-[#FFF4E6]', label: '예약확인중' },
  confirmed: { text: 'text-[#38B369]', bg: 'bg-[#E6F7EB]', label: '예약확정' },
  completed: { text: 'text-[#1084FD]', bg: 'bg-[#E6F2FF]', label: '시술완료' },
  cancelled: { text: 'text-[#6B7280]', bg: 'bg-[#F3F4F6]', label: '예약취소' },
};

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { reservations, hospitals, updateReservationStatus, showModal, showToast } = useStore();

  const reservation = reservations.find((r) => r.id === id);

  if (!reservation) {
    return (
      <div className="min-h-screen bg-white max-w-[480px] mx-auto">
        <div className="sticky top-0 z-40 bg-white h-12 flex items-center px-2.5">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft size={22} className="text-gray-900" />
          </button>
          <h1 className="text-[16px] font-bold ml-1">예약 상세</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-400 text-sm">예약 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const hospital = hospitals.find((h) => h.id === reservation.hospitalId);
  const style = statusStyle[reservation.status];

  const basePrice = reservation.amount;
  const vat = Math.round(basePrice * 0.1);
  const discount = 0;
  const total = basePrice + vat - discount;

  const copyAddr = async () => {
    if (!reservation.location) return;
    try {
      await navigator.clipboard.writeText(reservation.location);
      showToast('주소가 복사되었습니다.');
    } catch {
      showToast('복사에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    showModal('예약 취소', '정말 예약을 취소하시겠습니까?', () => {
      updateReservationStatus(reservation.id, 'cancelled');
      showToast('예약이 취소되었습니다.');
      router.push('/reservations');
    });
  };

  const canCancel = reservation.status === 'pending' || reservation.status === 'confirmed';
  const canReview = reservation.status === 'completed';

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto pb-32 page-enter">
      {/* Custom header */}
      <header className="sticky top-0 z-40 bg-white h-12 flex items-center px-2.5">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft size={22} className="text-gray-900" />
        </button>
        <h1 className="text-[16px] font-bold ml-1">예약 상세</h1>
      </header>

      {/* Status hero */}
      <section className="px-2.5 pb-6 fade-in-up">
        <div className="flex items-center gap-2 mb-2">
          <img src={statusIconSrc[reservation.status]} alt="" width={28} height={28} />
          <span
            className={`inline-flex items-center text-[12px] font-bold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}
          >
            {style.label}
          </span>
        </div>
        <p className="text-[22px] font-extrabold text-gray-900 leading-tight">
          {reservation.productTitle}
        </p>
        <p className="text-[13px] text-gray-500 mt-1">{reservation.hospitalName}</p>
      </section>

      {/* Product line */}
      <div className="mx-2.5 py-3 border-y border-gray-100 fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🦷</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-500 leading-tight">{reservation.hospitalName}</p>
            <p className="text-[13px] font-semibold text-gray-900 line-clamp-1 leading-tight mt-0.5">
              {reservation.productTitle}
            </p>
          </div>
          <p className="text-[14px] font-bold text-gray-900 flex-shrink-0">
            {basePrice.toLocaleString()}
            <span className="text-[11px] text-gray-500 font-medium ml-0.5">원</span>
          </p>
        </div>
      </div>

      <div className="stagger-children">
        {/* 예약 정보 */}
        <Section title="예약 정보">
          <Row label="예약자" value={reservation.customerName} />
          <Row label="연락처" value={reservation.customerPhone} />
          <Row label="내원일시" value={reservation.reservationDate || reservation.visitDate || '-'} highlight />
          {reservation.visitDate && (
            <Row label="방문 일시" value={reservation.visitDate} />
          )}
          <Row label="예약번호" value={reservation.id} mono />
        </Section>

        <Divider />

        {/* 병원 정보 */}
        {hospital && (
          <>
            <Section
              title="병원 정보"
              right={
                <Link
                  href={`/hospital/detail/${hospital.id}`}
                  className="text-[12px] text-[#7C3AED] font-semibold"
                >
                  병원 상세
                </Link>
              }
            >
              <div className="flex gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-500 text-sm font-bold">
                  {reservation.hospitalName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-gray-900 line-clamp-1">
                    {reservation.hospitalName}
                  </p>
                  {hospital.address && (
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                      {hospital.address}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="flex-1 text-[12px] text-gray-700 leading-snug">
                  {reservation.location}
                </p>
                <button
                  onClick={copyAddr}
                  className="text-[11px] text-gray-500 font-semibold btn-press flex items-center gap-0.5 flex-shrink-0"
                >
                  <Copy size={11} /> 복사
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2.5">
                <a
                  href={`tel:${hospital.phone ?? ''}`}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-700 btn-press"
                >
                  <Phone size={13} /> 전화
                </a>
                <button
                  onClick={() => {
                    const q = encodeURIComponent(reservation.location || hospital.name);
                    window.open(`https://map.naver.com/p?q=${q}`, '_blank');
                  }}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gray-900 text-white text-[12px] font-semibold btn-press"
                >
                  <Navigation size={13} /> 길찾기
                </button>
              </div>
            </Section>
            <Divider />
          </>
        )}

        {/* 집도의 */}
        {reservation.assignedDoctor && (
          <>
            <Section title="집도의">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F4EFFF] text-[#7C3AED] flex-shrink-0 flex items-center justify-center text-sm font-bold">
                  {reservation.assignedDoctor.charAt(0)}
                </div>
                <p className="text-[14px] font-semibold text-gray-900">
                  {reservation.assignedDoctor}
                </p>
              </div>
            </Section>
            <Divider />
          </>
        )}

        {/* 결제 정보 */}
        <Section title="결제 정보">
          <Row label="상품 금액" value={`${basePrice.toLocaleString()}원`} />
          <Row label="부가세 VAT" value={`${vat.toLocaleString()}원`} />
          {discount > 0 && (
            <Row label="할인" value={`-${discount.toLocaleString()}원`} accentColor="#7C3AED" />
          )}
          <div
            className="mt-3 pt-3 flex items-end justify-between"
            style={{ borderTop: '1px solid #F2F3F5' }}
          >
            <span className="text-[13px] font-bold text-gray-900">총 결제금액</span>
            <span className="text-[20px] font-extrabold text-gray-900 leading-none">
              {total.toLocaleString()}
              <span className="text-[13px] font-semibold text-gray-600 ml-0.5">원</span>
            </span>
          </div>
          {reservation.paymentMethod && (
            <p className="text-[11px] text-gray-400 mt-2 text-right">
              {reservation.paymentMethod} 결제
            </p>
          )}
        </Section>

        <Divider />

        {/* 안내 */}
        <Section title="안내사항">
          <ul className="space-y-1.5">
            {[
              '예약 시간 10분 전까지 내원해 주세요.',
              '예약 변경 및 취소는 예약일 3일 전까지 가능합니다.',
              '당일 취소 시 위약금이 발생할 수 있습니다.',
            ].map((note, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-gray-400 mt-0.5">•</span>
                <span className="text-[12px] text-gray-600 leading-snug">{note}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* 취소 사유 (취소된 경우) */}
        {reservation.status === 'cancelled' && reservation.cancelReason && (
          <div className="mx-2.5 my-2 px-3 py-3 rounded-lg bg-gray-50 fade-in-up">
            <p className="text-[12px] font-bold text-gray-700 mb-1">취소 사유</p>
            <p className="text-[12px] text-gray-600 leading-relaxed whitespace-pre-line">
              {reservation.cancelReason}
            </p>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white z-50"
        style={{
          borderTop: '1px solid #F2F3F5',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <div className="px-2.5 py-3 flex gap-2">
          {canCancel && (
            <button
              onClick={handleCancel}
              className="flex-1 py-3.5 rounded-xl border border-gray-200 text-[14px] font-bold text-gray-700 btn-press"
            >
              예약 취소
            </button>
          )}
          {canReview && (
            <button
              onClick={() =>
                router.push(`/mypage/reviews/write?productId=${reservation.hospitalId}`)
              }
              className="flex-1 py-3.5 rounded-xl bg-[#7C3AED] text-white text-[14px] font-bold btn-press"
              style={{ boxShadow: '0 6px 16px rgba(124,58,237,0.3)' }}
            >
              리뷰 작성하고 500P 받기
            </button>
          )}
          {!canCancel && !canReview && (
            <Link
              href="/reservations"
              className="flex-1 py-3.5 rounded-xl bg-gray-900 text-white text-[14px] font-bold text-center btn-press"
            >
              예약내역으로
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="px-2.5 py-4">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[14px] font-bold text-gray-900 leading-tight">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-1 bg-gray-50" />;
}

function Row({
  label,
  value,
  highlight,
  mono,
  accentColor,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
  accentColor?: string;
}) {
  return (
    <div className="flex items-start justify-between py-1.5">
      <span className="text-[12px] text-gray-500">{label}</span>
      <span
        className="text-[13px] font-semibold text-right break-all"
        style={{
          color: accentColor ?? (highlight ? '#7C3AED' : '#2B313D'),
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, monospace' : undefined,
          fontSize: highlight ? 14 : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}
