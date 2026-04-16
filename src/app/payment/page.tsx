'use client';

import { useState, Suspense, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, ChevronLeft, Check, X } from 'lucide-react';
import { useStore } from '@/store';

const agreementTerms = [
  { id: 'ePayment', label: '(필수) 전자금융거래 이용약관' },
  { id: 'thirdParty', label: '(필수) 개인정보 제3자 제공 동의' },
  { id: 'refund', label: '(필수) 환불·취소 규정 확인' },
];

export default function PaymentPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩중...</div>}>
      <PaymentPage />
    </Suspense>
  );
}

function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const { user, showToast, addReservation, products } = useStore();
  const coupons = user?.coupons ?? [];

  const [showCouponSheet, setShowCouponSheet] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [pointInput, setPointInput] = useState('');
  const [agreed, setAgreed] = useState<Set<string>>(new Set());
  const [showAgreeAccordion, setShowAgreeAccordion] = useState(false);
  const [agreedFlow, setAgreedFlow] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const agreementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const product = products.find((p) => p.id === productId) ?? products[0];
  const hospital = product.hospitalName;

  const availableCoupons = coupons.filter((c) => c.status === 'available');
  const selectedCoupon = availableCoupons.find((c) => c.id === selectedCouponId);

  const userPoints = user?.points ?? 5000;
  const pointsToUse = Math.min(parseInt(pointInput || '0', 10) || 0, userPoints);

  const basePrice = product.price;
  const vatAmount = Math.round(basePrice * 0.1);
  const couponDiscount = selectedCoupon?.discountAmount ?? 0;
  const totalSavings = couponDiscount + pointsToUse;
  const totalPrice = Math.max(basePrice + vatAmount - couponDiscount - pointsToUse, 0);

  const allAgreed = agreementTerms.every((t) => agreed.has(t.id));

  const handleUseAllPoints = () => setPointInput(String(userPoints));

  const toggleAgree = (id: string) => {
    setAgreed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAgreeAll = () => {
    if (allAgreed) {
      setAgreed(new Set());
      setAgreedFlow(false);
    } else {
      setAgreed(new Set(agreementTerms.map((t) => t.id)));
    }
  };

  const handleCta = () => {
    if (!agreedFlow) {
      setAgreedFlow(true);
      setAgreed(new Set(agreementTerms.map((t) => t.id)));
      setShowAgreeAccordion(true);
      setTimeout(() => {
        agreementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 120);
      return;
    }
    if (!allAgreed) {
      showToast('필수 약관에 동의해주세요.');
      return;
    }
    const newReservation = {
      id: `res-${Date.now()}`,
      status: 'pending' as const,
      date: new Date().toLocaleDateString('ko-KR'),
      productTitle: product.title,
      productImage: product.imageUrl,
      hospitalName: product.hospitalName,
      hospitalId: product.hospitalId,
      location: product.location,
      visitDate: '2026년 4월 15일',
      reservationDate: '2026년 4월 15일 17:00',
      amount: totalPrice,
      customerName: user?.name ?? '홍길동',
      customerPhone: user?.phone ?? '010-0000-0000',
      paymentMethod: '카드결제',
    };
    addReservation(newReservation);
    showToast('결제가 완료되었습니다!');
    router.push('/payment/success');
  };

  return (
    <div className="pb-28 bg-white min-h-screen lg:max-w-2xl lg:mx-auto lg:py-8">
      {/* Unified sticky header: back + title, product summary, amount bar */}
      <header
        className="sticky top-0 z-40 bg-white lg:static"
        style={{
          boxShadow: scrolled ? '0 1px 0 #F2F3F5' : 'none',
          transition: 'box-shadow 260ms ease',
        }}
      >
        {/* Row 1: back, title, amount (right-aligned when agreed) */}
        <div className="flex items-center h-12 px-2.5 gap-1 lg:hidden">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <h1 className="text-[16px] font-bold text-gray-900">결제하기</h1>

          {/* Amount badge appears in header on agree */}
          <div
            className="ml-auto flex items-center gap-1 overflow-hidden"
            style={{
              maxWidth: agreedFlow ? 200 : 0,
              opacity: agreedFlow ? 1 : 0,
              transform: agreedFlow ? 'translateX(0)' : 'translateX(12px)',
              transition:
                'max-width 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease, transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <span className="text-[11px] text-gray-500 whitespace-nowrap">결제할 금액</span>
            <AmountChip value={totalPrice} />
          </div>
        </div>

        {/* Product summary — merges into header */}
        <div
          className="overflow-hidden"
          style={{
            maxHeight: scrolled ? 0 : 72,
            opacity: scrolled ? 0 : 1,
            transition: 'max-height 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease',
          }}
        >
          <div className="mx-2.5 py-2.5 border-t border-gray-100 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-500 leading-tight">{hospital}</p>
              <p className="text-[13px] font-semibold text-gray-900 line-clamp-1 leading-tight mt-0.5">
                {product.title}
              </p>
            </div>
            <p className="text-[14px] font-bold text-gray-900 flex-shrink-0">
              {basePrice.toLocaleString()}
              <span className="text-[11px] text-gray-500 font-medium ml-0.5">원</span>
            </p>
          </div>
        </div>
      </header>

      <div className="stagger-children">
        {/* Reservation info */}
        <Section title="예약 정보">
          <Row label="예약자" value={user?.name ?? '홍길동'} />
          <Row label="연락처" value={user?.phone ?? '010-1245-2189'} />
          <Row label="예약일시" value="2026년 4월 15일 (수) 17:00" />
          <Row label="위치" value={product.location} valueClass="truncate max-w-[200px]" />
        </Section>

        <Divider />

        {/* Coupon */}
        <Section title="쿠폰">
          <button
            onClick={() => setShowCouponSheet(true)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl border border-gray-200 btn-press hover:border-gray-300 transition-colors"
          >
            <span
              className={`text-[13px] transition-colors ${
                selectedCoupon ? 'text-gray-900 font-semibold' : 'text-gray-500'
              }`}
            >
              {selectedCoupon
                ? `${selectedCoupon.name}`
                : `사용 가능한 쿠폰 ${availableCoupons.length}장`}
            </span>
            <div className="flex items-center gap-2">
              {selectedCoupon && (
                <span className="text-[12px] font-bold text-gray-900">
                  -{selectedCoupon.discountAmount.toLocaleString()}원
                </span>
              )}
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          </button>
        </Section>

        <Divider />

        {/* Points */}
        <Section title="포인트">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-gray-500">
              보유{' '}
              <span className="text-gray-900 font-bold">
                {userPoints.toLocaleString()}
              </span>
              P
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-gray-400 transition-colors">
              <input
                type="number"
                value={pointInput}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val) || val < 0) setPointInput('');
                  else if (val > userPoints) setPointInput(String(userPoints));
                  else setPointInput(e.target.value);
                }}
                placeholder="0"
                className="flex-1 text-[13px] outline-none bg-transparent"
              />
              <span className="text-[12px] text-gray-400 ml-1">P</span>
            </div>
            <button
              onClick={handleUseAllPoints}
              className="px-3 py-2.5 bg-gray-100 rounded-xl text-[12px] font-semibold text-gray-700 whitespace-nowrap btn-press hover:bg-gray-200 transition-colors"
            >
              전액사용
            </button>
          </div>
        </Section>

        <Divider />

        {/* Price breakdown */}
        <Section title="결제 금액">
          <div className="space-y-2">
            <Line label="상품 금액" value={`${basePrice.toLocaleString()}원`} />
            <Line label="부가세 VAT" value={`${vatAmount.toLocaleString()}원`} />
            {couponDiscount > 0 && (
              <Line
                label="쿠폰 할인"
                value={`-${couponDiscount.toLocaleString()}원`}
                valueColor="#7C3AED"
                animate
              />
            )}
            {pointsToUse > 0 && (
              <Line
                label="포인트 사용"
                value={`-${pointsToUse.toLocaleString()}원`}
                valueColor="#7C3AED"
                animate
              />
            )}
          </div>

          {totalSavings > 0 && (
            <div
              key={totalSavings}
              className="mt-3 px-3 py-2 rounded-lg flex items-center justify-between fade-in-up"
              style={{ backgroundColor: '#F4EFFF' }}
            >
              <span className="text-[12px] font-semibold text-[#7C3AED]">
                총 {totalSavings.toLocaleString()}원 할인됐어요
              </span>
              <span className="text-[11px] text-[#7C3AED] opacity-70">쿠폰 + 포인트</span>
            </div>
          )}

          <div
            className="mt-3 pt-3 flex items-end justify-between"
            style={{ borderTop: '1px solid #F2F3F5' }}
          >
            <span className="text-[14px] font-bold text-gray-900">총 결제금액</span>
            <AnimatedAmount value={totalPrice} size={22} />
          </div>
        </Section>

        <Divider />

        {/* Agreements */}
        <div ref={agreementRef}>
          <Section title="결제 동의">
            <button
              onClick={toggleAgreeAll}
              className="w-full flex items-center gap-2.5 py-2 text-left"
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: allAgreed ? '#2B313D' : 'transparent',
                  border: allAgreed ? '2px solid #2B313D' : '2px solid #D1D5DB',
                  transition: 'background-color 220ms ease, border-color 220ms ease',
                }}
              >
                {allAgreed && <Check size={11} strokeWidth={3} className="text-white check-pop" />}
              </span>
              <span className="text-[13px] font-bold text-gray-900 flex-1">
                전체 약관에 동의
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAgreeAccordion(!showAgreeAccordion);
                }}
                className="p-1 cursor-pointer"
              >
                {showAgreeAccordion ? (
                  <ChevronUp size={16} className="text-gray-400" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400" />
                )}
              </span>
            </button>
            <div
              className="overflow-hidden"
              style={{
                maxHeight: showAgreeAccordion ? 200 : 0,
                opacity: showAgreeAccordion ? 1 : 0,
                transition:
                  'max-height 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease',
              }}
            >
              <div className="mt-1 pl-7 space-y-1.5">
                {agreementTerms.map((t) => {
                  const checked = agreed.has(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleAgree(t.id)}
                      className="w-full flex items-center gap-2 py-1.5 text-left"
                    >
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: checked ? '#2B313D' : 'transparent',
                          border: checked ? '2px solid #2B313D' : '2px solid #D1D5DB',
                          transition: 'background-color 220ms ease, border-color 220ms ease',
                        }}
                      >
                        {checked && <Check size={8} strokeWidth={3.5} className="text-white check-pop" />}
                      </span>
                      <span className="text-[12px] text-gray-600 flex-1">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Bottom CTA (transforms on agreedFlow) */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white z-50 lg:static lg:mt-6 lg:transform-none lg:left-auto lg:max-w-none"
        style={{
          borderTop: '1px solid #F2F3F5',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <div className="px-2.5 pt-3 pb-3">
          <button
            onClick={handleCta}
            className="cta-morph w-full py-3.5 rounded-xl font-bold text-[15px] btn-press relative overflow-hidden"
            style={{
              backgroundColor: agreedFlow ? '#7C3AED' : '#2B313D',
              color: '#fff',
              boxShadow: agreedFlow ? '0 8px 20px rgba(124,58,237,0.35)' : 'none',
              transition:
                'background-color 420ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 420ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <span className="relative block h-[22px] overflow-hidden">
              <span
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: agreedFlow ? 'translateY(-120%)' : 'translateY(0)',
                  opacity: agreedFlow ? 0 : 1,
                  transition:
                    'transform 450ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease',
                }}
              >
                결제 약관에 동의합니다
              </span>
              <span
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: agreedFlow ? 'translateY(0)' : 'translateY(120%)',
                  opacity: agreedFlow ? 1 : 0,
                  transition:
                    'transform 450ms cubic-bezier(0.22, 1, 0.36, 1) 80ms, opacity 320ms ease 80ms',
                }}
              >
                {totalPrice.toLocaleString()}원 결제하기
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* Coupon bottom sheet */}
      {showCouponSheet && (
        <CouponSheet
          coupons={availableCoupons}
          selectedId={selectedCouponId}
          onClose={() => setShowCouponSheet(false)}
          onSelect={(id) => {
            setSelectedCouponId(id);
            setShowCouponSheet(false);
          }}
        />
      )}
    </div>
  );
}

// ===== Reusable parts =====

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-2.5 py-4">
      <h3 className="text-[14px] font-bold text-gray-900 mb-2.5 leading-tight">{title}</h3>
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
  valueClass = '',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start justify-between py-1">
      <span className="text-[12px] text-gray-500">{label}</span>
      <span className={`text-[13px] text-gray-900 font-medium text-right ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

function Line({
  label,
  value,
  valueColor,
  animate = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  animate?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${animate ? 'fade-in-up' : ''}`}>
      <span className="text-[13px] text-gray-500">{label}</span>
      <span
        className="text-[13px] font-semibold"
        style={{ color: valueColor ?? '#2B313D' }}
      >
        {value}
      </span>
    </div>
  );
}

// Top-header small animated amount chip
function AmountChip({ value }: { value: number }) {
  return (
    <span
      key={value}
      className="text-[14px] font-extrabold text-[#7C3AED] whitespace-nowrap count-up"
    >
      {value.toLocaleString()}
      <span className="text-[11px] font-semibold text-gray-600 ml-0.5">원</span>
    </span>
  );
}

// Large total amount with scale-pop on change
function AnimatedAmount({ value, size = 22 }: { value: number; size?: number }) {
  return (
    <span
      key={value}
      className="leading-none count-up"
      style={{
        fontSize: size,
        fontWeight: 800,
        color: '#2B313D',
        display: 'inline-block',
      }}
    >
      {value.toLocaleString()}
      <span
        className="text-[13px] font-semibold ml-0.5"
        style={{ color: '#51535C' }}
      >
        원
      </span>
    </span>
  );
}

function CouponSheet({
  coupons,
  selectedId,
  onClose,
  onSelect,
}: {
  coupons: ReturnType<typeof import('@/lib/mock-data').coupons.filter>;
  selectedId: string | null;
  onClose: () => void;
  onSelect: (id: string | null) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/40 modal-overlay-enter"
      onClick={onClose}
    >
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] flex flex-col modal-content-enter lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:max-w-md lg:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[16px] font-bold text-gray-900">쿠폰 선택</h3>
          <button onClick={onClose}>
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <button
            onClick={() => onSelect(null)}
            className={`w-full text-left px-5 py-4 border-b border-gray-50 ${
              !selectedId ? 'bg-gray-50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[13px] ${
                  !selectedId ? 'text-gray-900 font-bold' : 'text-gray-500'
                }`}
              >
                쿠폰 미사용
              </span>
              {!selectedId && <Check size={16} className="text-gray-900" strokeWidth={3} />}
            </div>
          </button>
          {coupons.map((c) => {
            const isActive = selectedId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`w-full text-left px-5 py-4 border-b border-gray-50 ${
                  isActive ? 'bg-gray-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[14px] leading-snug ${
                        isActive ? 'text-gray-900 font-bold' : 'text-gray-800 font-semibold'
                      }`}
                    >
                      {c.name}
                    </p>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                      -{c.discountAmount.toLocaleString()}원
                      {c.daysLeft !== undefined && ` · ${c.daysLeft}일 남음`}
                    </p>
                  </div>
                  {isActive && <Check size={16} className="text-gray-900" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
