'use client';

// 고객 상세(261101) — 예약관리 › 고객관리 줄을 누르면 모달 대신 이 페이지로 온다.
//  · 머리 = TopBar(둥근 뒤로 + 큰 제목) · 이름·전화·배지 → 연파랑 결제 합계 카드 → 회색 숫자 칸 3개
//    → 회색 띠 → 예약 기록(누르면 예약 상세) → 바닥에 떠 있는 전화하기.
//  · 자료는 고객 목록과 같은 /api/my-hospital/customers 에서 키로 찾는다.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';
import {
  RESERVATION_STATUS_LABEL,
  monthDayOf,
  reservationStatusTone,
  timeOf,
  wonOf,
  type CustomerRow,
} from '@/lib/partner/customers';

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function PartnerCustomerDetailPage() {
  const params = useParams<{ key: string }>();
  const rawKey = params.key ?? '';
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const [customers, setCustomers] = useState<CustomerRow[] | null>(null);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    fetch('/api/my-hospital/customers', { cache: 'no-store' })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || '고객 정보를 불러오지 못했습니다.');
        return Array.isArray(payload.customers) ? (payload.customers as CustomerRow[]) : [];
      })
      .then((rows) => {
        if (!cancelled) setCustomers(rows);
      })
      .catch((error) => {
        if (cancelled) return;
        setCustomers([]);
        showToast(error instanceof Error ? error.message : '고객 정보를 불러오지 못했습니다.');
      });
    return () => {
      cancelled = true;
    };
  }, [authUser, showToast]);

  // 주소의 키가 인코딩된 채로 오든 풀려서 오든 찾는다
  const customer = useMemo(() => {
    if (!customers) return null;
    const decoded = safeDecode(rawKey);
    return customers.find((c) => c.key === rawKey || c.key === decoded) ?? null;
  }, [customers, rawKey]);

  const loading = customers === null;
  const phoneHref = customer?.phone ? `tel:${customer.phone.replace(/[^\d+]/g, '')}` : null;

  return (
    <div
      className="pd-detail min-h-full bg-white page-enter"
      style={{ paddingBottom: phoneHref ? 'max(calc(env(safe-area-inset-bottom, 0px) + 112px), 128px)' : 48 }}
    >
      <TopBar title="고객 정보" />

      {loading ? (
        <p className="py-20 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
      ) : !customer ? (
        <div className="flex flex-col items-center px-6 py-20 text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
            <MonoIcon name="user" size={34} color="#B0B8C1" />
          </span>
          <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">고객 정보를 찾을 수 없어요</p>
          <p className="mt-1.5 text-[15px] leading-[1.6] text-[#8B95A1]">고객관리 목록에서 다시 골라 주세요</p>
        </div>
      ) : (
        <>
          {/* ─── 이름 · 전화 · 배지 · 결제 합계 · 숫자 칸 ─── */}
          <div className="px-5 pb-7 pt-2">
            <div className="qd-a-item flex items-center gap-3.5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F2F4F6] text-[22px] font-bold text-[#4E5968]">
                {customer.name.trim().charAt(0) || '환'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[22px] font-bold tracking-[-0.5px] text-[#191F28]">{customer.name}</span>
                  {customer.visits >= 3 && (
                    <span className="inline-flex h-6 shrink-0 items-center rounded-[6px] bg-[#E8F3FF] px-2 text-[13px] font-semibold text-[#3180F7]">단골</span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[15px] text-[#6B7684]">{customer.phone || '전화번호 없음'}</span>
              </span>
            </div>

            {customer.cancelled > 0 && (
              <p className="qd-a-item mt-4 flex gap-2 rounded-[14px] bg-[#FFF4F4] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]" style={{ animationDelay: '.04s' }}>
                <MonoIcon name="exclamation-circle" size={18} color="#F04452" className="mt-px" />
                취소하거나 오지 않은 예약이 {customer.cancelled}건 있어요
              </p>
            )}

            {/* 결제 합계 — 상품 상세 가격 카드와 같은 연파랑 · 남색 */}
            <div className="qd-a-item mt-4 rounded-[14px] bg-[#EFF5FE] px-5 pb-5 pt-4" style={{ animationDelay: '.08s' }}>
              <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">우리 병원 결제</span>
              <p className="mt-3 text-[15px] font-semibold text-[#1E3A78]">결제 합계</p>
              <p className="mt-0.5 text-[30px] font-bold tabular-nums tracking-[-0.8px] text-[#1E3A78]">{wonOf(customer.paid)}</p>
            </div>

            <div className="qd-a-item mt-3 grid grid-cols-3 gap-2" style={{ animationDelay: '.12s' }}>
              {[
                { label: '방문 완료', value: `${customer.visits}회` },
                { label: '예약 전체', value: `${customer.total}건` },
                { label: '취소', value: `${customer.cancelled}건` },
              ].map((tile) => (
                <div key={tile.label} className="rounded-[14px] bg-[#F2F4F6] px-4 py-3.5">
                  <p className="text-[14px] text-[#8B95A1]">{tile.label}</p>
                  <p className="mt-1 truncate text-[20px] font-bold tabular-nums tracking-[-0.4px] text-[#333D4B]">{tile.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="h-2.5 bg-[#F2F4F6]" />

          {/* ─── 예약 기록 ─── */}
          <section className="px-5 pb-6 pt-7">
            <h2 className="text-[20px]! font-bold leading-tight! tracking-[-0.4px] text-[#191F28]">
              예약 기록 <span className="tabular-nums text-[#8B95A1]">{customer.reservations.length}</span>
            </h2>
            <div className="mt-2">
              {customer.reservations.map((r, index) => {
                const when = r.visit_at ?? r.reservation_at ?? r.created_at;
                return (
                  <Link
                    key={r.id}
                    href={`/partner/reservations/${r.id}`}
                    className="qd-a-item -mx-2 flex items-center gap-3 rounded-[16px] px-2 py-3 text-left transition-colors active:bg-[#F9FAFB]"
                    style={{ animationDelay: `${Math.min(index, 6) * 0.04}s` }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[16px] font-semibold tabular-nums text-[#191F28]">
                          {monthDayOf(when) || '날짜 없음'}{r.visit_at ? ` ${timeOf(r.visit_at)}` : ''}
                        </span>
                        <span className={`inline-flex h-6 shrink-0 items-center rounded-[6px] px-2 text-[13px] font-semibold ${reservationStatusTone(r.status)}`}>
                          {RESERVATION_STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[14px] text-[#8B95A1]">{r.product_title ?? '상품 정보 없음'}</span>
                    </span>
                    <span className="shrink-0 text-[15px] font-semibold tabular-nums text-[#333D4B]">{wonOf(r.amount)}</span>
                    <ChevronRight size={18} className="shrink-0 text-[#B0B8C1]" />
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* 바닥에 떠 있는 전화하기 — 위는 선 대신 흰 그라데이션 */}
      {phoneHref && (
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40" style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)' }}>
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, white 30%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.5) 70%, rgba(255,255,255,0) 100%)',
              maskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
            }}
          />
          <div className="pointer-events-auto relative mx-auto max-w-[608px] pt-10">
            <a
              href={phoneHref}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98]"
            >
              <MonoIcon name="call" size={20} color="#FFFFFF" />
              전화하기
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
