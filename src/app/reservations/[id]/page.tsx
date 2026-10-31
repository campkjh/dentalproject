'use client';

// 예약 상세 — 상품 상세(261031 쿠팡 견본) 톤: 상태 띠 · 상품 줄 · 연파랑 금액 카드 · 회색 이름 정보 줄 ·
// 회색 띠로 칸 나눔 · 20 굵은 제목 · 회색 안내 카드 · 토스 흑백 아이콘 · 바닥에 떠 있는 버튼(흐림 띠).
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useReservationRealtimeRefresh } from '@/lib/realtime/reservations';
import { formatWhen } from '@/lib/reservation-format';
import { useStore } from '@/store';
import { Reservation } from '@/types';
import { resolveHospitalImageUrl, resolveProductImageUrl } from '@/lib/images';

type Status = Reservation['status'];

const statusLabel: Record<Status, string> = {
  pending: '예약확인중',
  confirmed: '예약확정',
  completed: '시술완료',
  cancelled: '취소',
};

/** 예약내역 목록과 같은 배지 색 — 확인중=회색 · 확정=파랑 · 완료=초록 · 취소=빨강 */
function statusTone(status: Status) {
  if (status === 'completed') return 'bg-[#E6F7EE] text-[#03A94D]';
  if (status === 'confirmed') return 'bg-[#E8F3FF] text-[#3180F7]';
  if (status === 'cancelled') return 'bg-[#FFEEEF] text-[#F04452]';
  return 'bg-[#F2F4F6] text-[#6B7684]';
}

/** 상태 한 줄 안내 — 실제 상태로만 */
function statusGuide(r: Reservation) {
  if (r.status === 'pending') return `${r.hospitalName || '병원'}에서 예약을 확인하고 있어요`;
  if (r.status === 'confirmed') return r.scheduleHistory?.[0]?.content || '예약이 확정됐어요. 늦지 않게 방문해 주세요';
  if (r.status === 'completed') return '시술을 마쳤어요. 후기를 남기면 500P를 드려요';
  return '취소된 예약이에요';
}

const POLICY: { title: string; items: string[] }[] = [
  {
    title: '예약 취소 가능 시간',
    items: ['예약 취소는 예약 시간 이전까지 앱 내에서 직접 취소가 가능합니다.', '예약 시간이 지난 후에는 시스템상 취소가 제한될 수 있습니다.'],
  },
  {
    title: '진료일 기준 취소 정책',
    items: [
      '진료일 1일 전까지 취소: 수수료 없이 전액 취소 가능합니다.',
      '진료 당일 취소: 병원 운영 정책에 따라 취소 수수료가 발생할 수 있습니다.',
      '예약 시간 이후 취소 또는 미방문(No-show): 환불이 제한되거나 취소 수수료가 부과될 수 있습니다.',
    ],
  },
  {
    title: '병원 사정에 의한 예약 취소',
    items: ['병원의 일정 변경, 긴급 휴진 등 불가피한 사유로 예약이 취소될 수 있으며, 이 경우 전액 환불 또는 일정 재조율이 안내됩니다.'],
  },
];

function InfoRows({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <div>
      {rows.map((r) => (
        <p key={r.label} className="flex min-h-11 items-center py-1.5">
          <span className="w-[86px] shrink-0 text-[17px] text-[#8B95A1]">{r.label}</span>
          <span className="min-w-0 flex-1 break-keep text-[17px] text-[#333D4B]">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

const Band = () => <div className="h-2.5 bg-[#F2F4F6]" />;
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">{children}</h2>
);

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { authUser } = useSession();
  const { reservations, hospitals, updateReservationStatus, showConfirm, showAlert, showToast, hydrateMe } = useStore();

  const reservation = reservations.find((r) => r.id === id);

  useReservationRealtimeRefresh({
    enabled: Boolean(authUser?.id),
    userId: authUser?.id,
    onChange: hydrateMe,
  });

  if (!reservation) {
    return (
      <div className="mx-auto min-h-screen max-w-[640px] bg-white">
        <TopBar title="예약 정보" />
        <p className="py-20 text-center text-[15px] text-[#8B95A1]">예약 정보를 찾을 수 없어요.</p>
      </div>
    );
  }

  const r = reservation;
  const hospital = hospitals.find((h) => h.id === r.hospitalId);
  const productImage = resolveProductImageUrl(r.productImage, r.productId ?? r.id);
  const hospitalImage = r.hospitalImage || resolveHospitalImageUrl(hospital);
  const hospitalAddress = hospital?.address || r.location;
  const appPay = r.paymentMethod === '앱결제';

  const handleCancel = () => {
    showConfirm(
      '예약 취소',
      '정말 예약을 취소하시겠습니까?\n결제한 금액은 함께 취소돼요.',
      async () => {
        // 결제 취소까지 몇 초 걸리므로 처리 중임을 바로 알린다
        showToast('예약을 취소하고 있어요…');
        const { error } = await updateReservationStatus(r.id, 'cancelled');
        if (error) {
          showAlert('예약을 취소하지 못했어요', error);
          return;
        }
        showAlert('예약이 취소되었습니다', '앱에서 결제한 금액은 결제수단에 따라 영업일 기준 3~5일 안에 환불돼요.', {
          onConfirm: () => router.push('/reservations'),
        });
      },
      { confirmText: '예약 취소', cancelText: '닫기' }
    );
  };

  const quick = [
    ...(hospital?.phone ? [{ label: '전화하기', icon: 'call', onClick: () => window.location.assign(`tel:${hospital.phone.replace(/[^0-9+]/g, '')}`) }] : []),
    { label: '길찾기', icon: 'pin-location', onClick: () => window.open(`https://map.naver.com/p?q=${encodeURIComponent(hospitalAddress || r.hospitalName)}`, '_blank') },
    { label: '병원 홈', icon: 'hospital', onClick: () => router.push(`/hospital/detail/${r.hospitalId}`) },
  ];

  // 바닥 버튼 — 상태별 하나(확정은 버튼 대신 안내)
  const action =
    r.status === 'pending' ? (
      <button type="button" onClick={handleCancel} className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[#F2F4F6] text-[17px] font-bold text-[#F04452] transition-all active:scale-[0.98]">
        예약 취소하기
      </button>
    ) : r.status === 'completed' ? (
      <button
        type="button"
        onClick={() => router.push(`/mypage/reviews/write?productId=${r.productId ?? ''}&reservationId=${r.id}`)}
        className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98]"
      >
        후기 쓰고 500P 받기
      </button>
    ) : r.status === 'confirmed' ? (
      <div className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[#F2F4F6] text-[16px] font-semibold text-[#8B95A1]">
        확정된 예약은 병원에 문의해 취소할 수 있어요
      </div>
    ) : null;

  return (
    <div className="mx-auto min-h-screen max-w-[640px] bg-white page-enter" style={{ paddingBottom: action ? 'max(calc(env(safe-area-inset-bottom, 0px) + 112px), 128px)' : 48 }}>
      <TopBar title="예약 정보" />

      {/* ─── 상태 · 상품 · 금액 카드 · 일정 ─── */}
      <div className="px-5 pb-5 pt-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-7 items-center rounded-[6px] px-2 text-[14px] font-bold ${statusTone(r.status)}`}>{statusLabel[r.status]}</span>
          <span className="min-w-0 truncate text-[15px] text-[#4E5968]">{statusGuide(r)}</span>
        </div>

        <Link href={r.productId ? `/product/${r.productId}` : '#'} className="-mx-2 mt-4 flex items-center gap-3.5 rounded-[16px] px-2 py-2 transition-colors active:bg-[#F9FAFB]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImage} alt="" className="h-[56px] w-[56px] shrink-0 rounded-[14px] bg-[#F2F4F6] object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-bold text-[#191F28]">{r.productTitle || '시술 상품'}</span>
            <span className="mt-0.5 block truncate text-[14px] text-[#8B95A1]">{r.hospitalName}</span>
          </span>
          {r.productId && <ChevronRight size={20} className="shrink-0 text-[#B0B8C1]" />}
        </Link>

        {/* 금액 카드 — 상품 상세 가격 카드와 같은 연파랑 · 남색 */}
        <div className="mt-4 rounded-[14px] bg-[#EFF5FE] px-5 pb-5 pt-4">
          <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">{appPay ? '앱결제' : '현장결제'}</span>
          <p className="mt-3 text-[15px] font-semibold text-[#1E3A78]">{appPay ? '결제한 금액' : '예약 금액'}</p>
          <p className="mt-0.5 text-[30px] font-bold tracking-[-0.8px] text-[#1E3A78]">{r.amount.toLocaleString()}원</p>
        </div>

        <div className="mt-3">
          <InfoRows
            rows={[
              { label: '방문일시', value: formatWhen(r.visitDate) || '-' },
              { label: '예약일시', value: formatWhen(r.reservationDate || r.date) || '-' },
              ...(r.status === 'cancelled' && r.cancelDate ? [{ label: '취소일시', value: formatWhen(r.cancelDate) }] : []),
              ...(r.assignedDoctor ? [{ label: '담당', value: `${r.assignedDoctor} ${r.assignedDoctorTitle || '원장'}` }] : []),
            ]}
          />
        </div>
      </div>

      {/* ─── 취소 내용 ─── */}
      {r.status === 'cancelled' && r.cancelReason && (
        <>
          <Band />
          <div className="px-5 py-7">
            <SectionTitle>취소 내용</SectionTitle>
            <p className="mt-4 whitespace-pre-line rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[15px] leading-[1.6] text-[#333D4B]">{r.cancelReason}</p>
          </div>
        </>
      )}

      {/* ─── 일정 변경 기록 ─── */}
      {r.scheduleHistory && r.scheduleHistory.length > 0 && (
        <>
          <Band />
          <div className="px-5 py-7">
            <SectionTitle>일정 변경</SectionTitle>
            <div className="mt-3">
              {r.scheduleHistory.map((h) => (
                <div key={h.id} className="py-2.5">
                  <p className="text-[16px] font-semibold text-[#333D4B]">{h.title}</p>
                  <p className="mt-0.5 text-[15px] text-[#4E5968]">{h.content}</p>
                  <p className="mt-0.5 text-[13px] text-[#B0B8C1]">{formatWhen(h.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── 병원 정보 ─── */}
      <Band />
      <div className="px-5 py-7">
        <SectionTitle>병원 정보</SectionTitle>
        <Link href={`/hospital/detail/${r.hospitalId}`} className="-mx-2 mt-3 flex items-center gap-3.5 rounded-[16px] px-2 py-2 transition-colors active:bg-[#F9FAFB]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hospitalImage} alt="" className="h-[52px] w-[52px] shrink-0 rounded-[14px] bg-[#F2F4F6] object-cover" />
          <span className="min-w-0 flex-1 truncate text-[17px] font-bold text-[#191F28]">{r.hospitalName}</span>
          <ChevronRight size={20} className="shrink-0 text-[#B0B8C1]" />
        </Link>
        <div className="mt-3">
          <InfoRows
            rows={[
              ...(hospitalAddress ? [{ label: '주소', value: hospitalAddress }] : []),
              ...(hospital?.phone ? [{ label: '전화', value: hospital.phone }] : []),
              ...(hospital?.tags?.length ? [{ label: '키워드', value: hospital.tags.slice(0, 6).map((t) => t.replace(/^#/, '')).join(', ') }] : []),
            ]}
          />
        </div>
        <div className={`mt-4 grid gap-2 ${quick.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {quick.map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={b.onClick}
              className="flex h-12 items-center justify-center gap-1.5 rounded-[14px] bg-[#F2F4F6] text-[15px] font-semibold text-[#333D4B] transition-all active:scale-[0.98] active:bg-[#E5E8EB]"
            >
              <MonoIcon name={b.icon} size={18} color="#6B7684" />
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 예약자 ─── */}
      <Band />
      <div className="px-5 py-7">
        <SectionTitle>예약자 정보</SectionTitle>
        <div className="mt-3">
          <InfoRows rows={[{ label: '이름', value: r.customerName || '-' }, { label: '전화번호', value: r.customerPhone || '-' }]} />
        </div>
      </div>

      {/* ─── 병원 정책 ─── */}
      <Band />
      <div className="px-5 py-7">
        <SectionTitle>취소 정책</SectionTitle>
        <p className="mt-4 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
          <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
          원활한 진료 운영과 다른 이용자의 예약 기회를 위해 아래 취소 정책이 적용돼요.
        </p>
        <div className="mt-5 space-y-5">
          {POLICY.map((p, i) => (
            <div key={p.title}>
              <p className="text-[16px] font-semibold text-[#333D4B]">{i + 1}. {p.title}</p>
              <ul className="mt-1.5 space-y-1">
                {p.items.map((it) => (
                  <li key={it} className="flex gap-2 text-[14px] leading-[1.6] text-[#6B7684]">
                    <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#B0B8C1]" />
                    <span className="min-w-0 flex-1">{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 바닥 버튼 — 흐림 띠 위에 떠 있다(상품 상세와 같은 결) ─── */}
      {action && (
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40" style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)' }}>
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, white 30%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.5) 70%, rgba(255,255,255,0) 100%)',
              maskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
            }}
          />
          <div className="pointer-events-auto relative mx-auto max-w-[608px] pt-10">{action}</div>
        </div>
      )}
    </div>
  );
}
