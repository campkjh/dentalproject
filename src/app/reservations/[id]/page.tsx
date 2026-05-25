'use client';

import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Info } from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useReservationRealtimeRefresh } from '@/lib/realtime/reservations';
import { useStore } from '@/store';
import { Reservation } from '@/types';
import { resolveHospitalImageUrl, resolveProductImageUrl } from '@/lib/images';

/* Status chip styling — pending gets a trailing ellipsis like the mockup. */
const statusStyle: Record<
  Reservation['status'],
  { label: string; bg: string; text: string }
> = {
  pending:   { label: '예약확인중...', bg: '#FFEEDB', text: '#FF8C2D' },
  confirmed: { label: '예약확정',      bg: '#DCF6E6', text: '#1FAF5B' },
  completed: { label: '시술완료',      bg: '#DDEEFF', text: '#1084FD' },
  cancelled: { label: '취소',          bg: '#EAECEF', text: '#6B7280' },
};

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { authUser } = useSession();
  const { reservations, hospitals, updateReservationStatus, showModal, showToast, hydrateMe } = useStore();

  const reservation = reservations.find((r) => r.id === id);

  useReservationRealtimeRefresh({
    enabled: Boolean(authUser?.id),
    userId: authUser?.id,
    onChange: hydrateMe,
  });

  if (!reservation) {
    return (
      <div className="min-h-screen bg-white max-w-[480px] mx-auto">
        <PageHeader onBack={() => router.back()} />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-400 text-sm">예약 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const hospital = hospitals.find((h) => h.id === reservation.hospitalId);
  const status = statusStyle[reservation.status];
  const productImage = resolveProductImageUrl(
    reservation.productImage,
    reservation.productId ?? reservation.id
  );
  const hospitalImage = reservation.hospitalImage || resolveHospitalImageUrl(hospital);
  const hospitalAddress = hospital?.address || reservation.location;
  const tags = hospital?.tags ?? [];
  const visibleTags = tags.slice(0, 3);
  const extraCount = Math.max(0, tags.length - visibleTags.length);

  const handleCancel = () => {
    showModal('예약 취소', '정말 예약을 취소하시겠습니까?', () => {
      updateReservationStatus(reservation.id, 'cancelled');
      showToast('예약이 취소되었습니다.');
      router.push('/reservations');
    });
  };

  const openNaverMap = () => {
    const q = encodeURIComponent(hospitalAddress || reservation.hospitalName);
    window.open(`https://map.naver.com/p?q=${q}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto pb-12 page-enter">
      <PageHeader onBack={() => router.back()} />

      <div className="px-4 space-y-3 pb-8">
        {/* ============ Status + Product + Dates + Action ============ */}
        <section className="bg-[#F7F8FA] rounded-[20px] p-4 fade-in-up">
          {/* status chip + date */}
          <div className="flex items-center justify-between">
            <span
              className="inline-flex items-center rounded-full text-[14px] font-bold"
              style={{
                backgroundColor: status.bg,
                color: status.text,
                padding: '5px 12px',
              }}
            >
              {status.label}
            </span>
            <span className="text-[15px] font-medium text-gray-500">
              {reservation.date}
            </span>
          </div>

          {/* product */}
          <div className="flex gap-3 mt-3.5">
            <div className="w-[60px] h-[60px] rounded-xl overflow-hidden bg-white flex-shrink-0">
              <img src={productImage} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-bold text-[#2B313D] leading-tight line-clamp-1">
                {reservation.productTitle}
              </p>
              <p className="text-[14px] text-gray-500 mt-1 leading-tight">
                {reservation.hospitalName}
              </p>
              <p className="text-[14px] text-gray-500 leading-tight line-clamp-1">
                {hospitalAddress}
              </p>
            </div>
          </div>

          {/* date rows */}
          <div className="mt-4 space-y-2.5">
            <DataRow label="방문일시" value={reservation.visitDate || '-'} />
            <DataRow label="예약일시" value={reservation.reservationDate || reservation.visitDate || '-'} />
            {reservation.status === 'cancelled' && reservation.cancelDate && (
              <DataRow label="취소일시" value={reservation.cancelDate} />
            )}
            <DataRow label="금액" value={`${reservation.amount.toLocaleString()}원`} />
          </div>

          {/* action button — varies per status */}
          {reservation.status === 'pending' && (
            <button
              onClick={handleCancel}
              className="btn-press mt-4 w-full rounded-xl text-[16px] font-bold"
              style={{
                height: 48,
                backgroundColor: '#FFEFEF',
                color: '#FF4757',
              }}
            >
              취소하기
            </button>
          )}
          {reservation.status === 'confirmed' && (
            <div
              aria-disabled
              className="mt-4 w-full rounded-xl text-[16px] font-bold flex items-center justify-center"
              style={{
                height: 48,
                backgroundColor: '#E9EAEC',
                color: '#9CA3AF',
              }}
            >
              취소불가
            </div>
          )}
          {reservation.status === 'completed' && (
            <button
              onClick={() =>
                router.push(
                  `/mypage/reviews/write?productId=${reservation.productId ?? ''}&reservationId=${reservation.id}`
                )
              }
              className="btn-press mt-4 w-full rounded-xl text-[16px] font-bold text-white"
              style={{
                height: 48,
                backgroundColor: '#8037FF',
              }}
            >
              리뷰 작성하고 500P 받기
            </button>
          )}
        </section>

        {/* ============ 취소내용 (cancelled only) ============ */}
        {reservation.status === 'cancelled' && reservation.cancelReason && (
          <section className="bg-[#F7F8FA] rounded-[20px] p-4 fade-in-up">
            <h2 className="text-[16px] font-bold text-[#2B313D] mb-3">취소내용</h2>
            <p className="text-[15px] text-[#2B313D] leading-[1.65] whitespace-pre-line">
              {reservation.cancelReason}
            </p>
            <p className="text-[14px] text-gray-400 mt-4">
              {reservation.hospitalName}
            </p>
          </section>
        )}

        {/* ============ 병원정보 ============ */}
        <section className="bg-[#F7F8FA] rounded-[20px] p-4 fade-in-up">
          <h2 className="text-[16px] font-bold text-[#2B313D] mb-3">병원정보</h2>
          <div className="flex gap-3">
            <div className="w-[60px] h-[60px] rounded-xl overflow-hidden bg-white flex-shrink-0 flex items-center justify-center">
              <img src={hospitalImage} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-bold text-[#2B313D] leading-tight">
                {reservation.hospitalName}
              </p>
              <p className="text-[14px] text-gray-500 mt-1 leading-tight line-clamp-1">
                {hospitalAddress}
              </p>
              {(visibleTags.length > 0 || extraCount > 0) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {visibleTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center text-[13px] text-gray-700 rounded-md bg-white"
                      style={{ padding: '2px 8px' }}
                    >
                      {tag}
                    </span>
                  ))}
                  {extraCount > 0 && (
                    <span
                      className="inline-flex items-center text-[13px] text-gray-500 rounded-md bg-white"
                      style={{ padding: '2px 8px' }}
                    >
                      +{extraCount}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={openNaverMap}
            className="btn-press mt-3 w-full rounded-xl bg-white flex items-center justify-center gap-2 text-[16px] font-bold text-[#2B313D]"
            style={{ height: 48 }}
          >
            <NaverPinIcon />
            찾아가는길
          </button>
        </section>

        {/* ============ 고객정보 ============ */}
        <section className="bg-[#F7F8FA] rounded-[20px] p-4 fade-in-up">
          <h2 className="text-[16px] font-bold text-[#2B313D] mb-3">고객정보</h2>
          <div className="space-y-3">
            <div>
              <p className="text-[14px] text-gray-400">이름</p>
              <p className="text-[16px] font-bold text-[#2B313D] mt-0.5">
                {reservation.customerName}
              </p>
            </div>
            <div>
              <p className="text-[14px] text-gray-400">전화번호</p>
              <p className="text-[16px] font-bold text-[#2B313D] mt-0.5">
                {reservation.customerPhone}
              </p>
            </div>
          </div>
        </section>

        {/* ============ 병원정책 ============ */}
        <section className="bg-[#F7F8FA] rounded-[20px] p-4 fade-in-up">
          <h2 className="flex items-center gap-1.5 text-[16px] font-bold text-[#2B313D] mb-3">
            <Info size={16} className="text-gray-500" strokeWidth={2.2} />
            병원정책
          </h2>
          <p className="text-[14px] text-gray-600 leading-[1.65] mb-4">
            서비스 내 병원 예약은 원활한 진료 운영과 다른 이용자의 예약 기회를 보호하기 위해 아래의 취소 정책이 적용됩니다.
          </p>
          <div className="space-y-3 text-[14px] text-gray-600 leading-[1.65]">
            <PolicyBlock
              title="1. 예약 취소 가능 시간"
              items={[
                '예약 취소는 예약 시간 이전까지 앱 내에서 직접 취소가 가능합니다.',
                '예약 시간이 지난 후에는 시스템상 취소가 제한될 수 있습니다.',
              ]}
            />
            <PolicyBlock
              title="2. 진료일 기준 취소 정책"
              items={[
                '진료일 1일 전까지 취소: 수수료 없이 전액 취소 가능합니다.',
                '진료 당일 취소: 병원 운영 정책에 따라 취소 수수료가 발생할 수 있습니다.',
                '예약 시간 이후 취소 또는 미방문(No-show): 환불이 제한되거나 취소 수수료가 부과될 수 있습니다.',
              ]}
            />
            <PolicyBlock
              title="3. 병원 사정에 의한 예약 취소"
              text="병원의 일정 변경, 긴급 휴진 등 불가피한 사유로 예약이 취소될 수 있으며, 이 경우 전액 환불 또는 일정 재조율이 안내됩니다."
            />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============================== Sub-components ============================== */

function PageHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-40 bg-white h-14 flex items-center px-4">
      <button onClick={onBack} className="p-1 -ml-1" aria-label="뒤로가기">
        <ChevronLeft size={26} strokeWidth={2.4} className="text-[#2B313D]" />
      </button>
      <h1 className="text-[18px] font-bold ml-2 text-[#2B313D]">정보</h1>
    </header>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[15px] text-gray-500">{label}</span>
      <span className="text-[15px] font-bold text-[#2B313D] text-right break-all">
        {value}
      </span>
    </div>
  );
}

function PolicyBlock({
  title,
  items,
  text,
}: {
  title: string;
  items?: string[];
  text?: string;
}) {
  return (
    <div>
      <p className="font-semibold text-gray-700 mb-1">{title}</p>
      {items && (
        <ul className="space-y-1 ml-1">
          {items.map((item, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-gray-400 flex-shrink-0">•</span>
              <span className="flex-1">{item}</span>
            </li>
          ))}
        </ul>
      )}
      {text && <p>{text}</p>}
    </div>
  );
}

/** Naver Map location pin — blue→green gradient with a bold white "N". */
function NaverPinIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" fill="none" aria-hidden>
      <defs>
        <linearGradient id="naverPinGrad" x1="18%" y1="0%" x2="82%" y2="100%">
          <stop offset="0%" stopColor="#1F8AFF" />
          <stop offset="55%" stopColor="#22B6C8" />
          <stop offset="100%" stopColor="#22D365" />
        </linearGradient>
      </defs>
      <path
        d="M11 1.4C6.5 1.4 2.9 5 2.9 9.5c0 5.4 8.1 11.1 8.1 11.1s8.1-5.7 8.1-11.1C19.1 5 15.5 1.4 11 1.4z"
        fill="url(#naverPinGrad)"
      />
      {/* Bold white N — slightly chunky strokes to match the brand mark */}
      <path
        d="M8 5.6h2.35l3.3 5.65V5.6H16v9.3h-2.35l-3.3-5.65v5.65H8V5.6z"
        fill="#fff"
      />
    </svg>
  );
}
