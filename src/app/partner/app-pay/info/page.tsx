'use client';

// 앱결제 안내 — 상품 상세(261031 쿠팡 견본) 톤: 연파랑 금액 카드 · 회색 숫자 칸 · 회색 띠로 칸 나눔 · 회색 이름 정보 줄.
import { useMemo } from 'react';
import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useMyHospitalData } from '@/lib/partner/my-hospital-cache';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Hospital = { id: string; name: string };
type ReservationSummary = { amount?: number | null; status?: string | null };

const Band = () => <div className="h-2.5 bg-[#F2F4F6]" />;

const RULES = [
  { label: '결제 수수료', value: '카드 3.3% · 계좌이체 1.1%' },
  { label: '정산 주기', value: '월 1회 (매월 10일)' },
  { label: '부가세', value: '결제 금액에 별도 포함' },
  { label: '환불', value: '다음 정산에서 차감' },
];

export default function AppPayInfoPage() {
  const { authUser } = useSession();
  const { data: hospitalData, loading } = useMyHospitalData<Hospital, ReservationSummary>(authUser?.id);
  const hospital = hospitalData?.hospital ?? null;
  const stats = useMemo(() => {
    const reservations = hospitalData?.reservations ?? [];
    return {
      totalRevenue: reservations.reduce((sum, row) => sum + (row.amount ?? 0), 0),
      totalReservations: reservations.length,
      completed: reservations.filter((row) => row.status === 'completed').length,
    };
  }, [hospitalData?.reservations]);

  if (!authUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
          <MonoIcon name="lock" size={34} color="#B0B8C1" />
        </span>
        <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">로그인이 필요해요</p>
        <Link href="/login" className="mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold text-[#3180F7]">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white pb-12">
      <TopBar title="앱결제 안내" sub="앱 안에서 환자가 결제한 내역과 정산을 관리해요." />

      {/* ─── 금액 카드 · 숫자 칸 ─── */}
      <div className="qd-a-item px-5 pb-7 pt-1">
        <div className="rounded-[14px] bg-[#EFF5FE] px-5 pb-5 pt-4">
          <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">앱결제</span>
          <p className="mt-3 text-[15px] font-semibold text-[#1E3A78]">누적 결제 금액</p>
          <p className="mt-0.5 text-[30px] font-bold tracking-[-0.8px] text-[#1E3A78]">
            {loading ? '—' : stats.totalRevenue.toLocaleString()}원
          </p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-[14px] bg-[#F2F4F6] px-4 py-3.5">
            <p className="text-[14px] text-[#6B7684]">총 결제 건수</p>
            <p className="mt-0.5 text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">
              {loading ? '—' : stats.totalReservations.toLocaleString()}건
            </p>
          </div>
          <div className="rounded-[14px] bg-[#F2F4F6] px-4 py-3.5">
            <p className="text-[14px] text-[#6B7684]">시술 완료 건수</p>
            <p className="mt-0.5 text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">
              {loading ? '—' : stats.completed.toLocaleString()}건
            </p>
          </div>
        </div>
      </div>

      <Band />

      {/* ─── 앱결제란? ─── */}
      <div className="qd-a-item px-5 py-7" style={{ animationDelay: '.06s' }}>
        <h2 className="!text-[20px] font-bold !leading-[1.3] tracking-[-0.4px] text-[#191F28]">앱결제란?</h2>
        <p className="mt-4 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
          <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
          환자가 마이닥 앱에서 직접 시술비를 결제하면, 결제일 다음 달 10일에 병원 계좌로 정산돼요.
        </p>
        <div className="mt-3">
          {RULES.map((r) => (
            <p key={r.label} className="flex min-h-11 items-center py-1.5">
              <span className="w-[96px] shrink-0 text-[16px] text-[#8B95A1]">{r.label}</span>
              <span className="min-w-0 flex-1 break-keep text-[16px] text-[#333D4B]">{r.value}</span>
            </p>
          ))}
          {hospital && (
            <p className="flex min-h-11 items-center py-1.5">
              <span className="w-[96px] shrink-0 text-[16px] text-[#8B95A1]">병원</span>
              <span className="min-w-0 flex-1 break-keep text-[16px] text-[#333D4B]">{hospital.name}</span>
            </p>
          )}
        </div>
        <div className="mt-5 flex gap-2">
          <Link
            href="/partner/app-pay/payments"
            className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#F2F4F6] text-[17px] font-bold text-[#4E5968] transition-all active:scale-[0.98]"
          >
            결제 내역
          </Link>
          <Link
            href="/partner/app-pay/settlement"
            className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98]"
          >
            정산 내역
          </Link>
        </div>
      </div>
    </div>
  );
}
