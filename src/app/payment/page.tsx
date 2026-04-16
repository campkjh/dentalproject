'use client';

import { useState, Suspense, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import { products, coupons } from '@/lib/mock-data';

type PayMethod = 'card' | 'kakao' | 'naver' | 'toss';

const payMethods: { id: PayMethod; label: string; emoji: string; bg: string; color: string }[] = [
  { id: 'card', label: '카드결제', emoji: '💳', bg: '#F3F4F6', color: '#2B313D' },
  { id: 'kakao', label: '카카오페이', emoji: 'K', bg: '#FEE500', color: '#2B313D' },
  { id: 'naver', label: '네이버페이', emoji: 'N', bg: '#03C75A', color: '#fff' },
  { id: 'toss', label: '토스페이', emoji: 'T', bg: '#3182F6', color: '#fff' },
];

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
  const { user, showToast, addReservation } = useStore();

  const [showCouponSheet, setShowCouponSheet] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [pointInput, setPointInput] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  const [cardInstallment, setCardInstallment] = useState<string>('일시불');
  const [agreed, setAgreed] = useState<Set<string>>(new Set());
  const [showAgreeAccordion, setShowAgreeAccordion] = useState(false);

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
  const installmentOptions = useMemo(
    () => ['일시불', '2개월', '3개월', '6개월', '12개월'],
    []
  );

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
    if (allAgreed) setAgreed(new Set());
    else setAgreed(new Set(agreementTerms.map((t) => t.id)));
  };

  const handlePayment = () => {
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
      paymentMethod:
        payMethod === 'card' ? `카드 (${cardInstallment})` : payMethods.find((p) => p.id === payMethod)?.label ?? '카드결제',
    };
    addReservation(newReservation);
    showToast('결제가 완료되었습니다!');
    router.push('/payment/success');
  };

  return (
    <div className="pb-40 bg-white min-h-screen lg:max-w-2xl lg:mx-auto lg:py-8">
      <TopBar title="결제하기" />

      {/* Product summary — line */}
      <div className="mx-2.5 mt-1 py-3 border-y border-gray-100">
        <div className="flex items-center gap-3">
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
          className="w-full flex items-center justify-between px-3 py-3 rounded-xl border border-gray-200 btn-press"
        >
          <span
            className={`text-[13px] ${
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
          <div className="flex-1 flex items-center border border-gray-200 rounded-xl px-3 py-2.5">
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
            className="px-3 py-2.5 bg-gray-100 rounded-xl text-[12px] font-semibold text-gray-700 whitespace-nowrap btn-press"
          >
            전액사용
          </button>
        </div>
      </Section>

      <Divider />

      {/* Payment method */}
      <Section title="결제수단">
        <div className="grid grid-cols-4 gap-2">
          {payMethods.map((m) => {
            const isActive = payMethod === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setPayMethod(m.id)}
                className="py-3 rounded-xl flex flex-col items-center gap-1.5 btn-press"
                style={{
                  backgroundColor: isActive ? '#2B313D' : '#FAFBFC',
                  border: `1.5px solid ${isActive ? '#2B313D' : '#E5E7EB'}`,
                  color: isActive ? '#fff' : '#2B313D',
                  transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black leading-none"
                  style={{ backgroundColor: m.bg, color: m.color }}
                >
                  {m.emoji}
                </span>
                <span className="text-[11px] font-semibold leading-none">
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>

        {payMethod === 'card' && (
          <div className="mt-3 fade-in-up">
            <p className="text-[11px] text-gray-500 mb-2">할부 개월</p>
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
              {installmentOptions.map((opt) => {
                const isActive = cardInstallment === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setCardInstallment(opt)}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap btn-press"
                    style={{
                      backgroundColor: isActive ? '#2B313D' : 'transparent',
                      color: isActive ? '#fff' : '#51535C',
                      border: `1px solid ${isActive ? 'transparent' : '#E5E7EB'}`,
                      transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
            />
          )}
          {pointsToUse > 0 && (
            <Line
              label="포인트 사용"
              value={`-${pointsToUse.toLocaleString()}원`}
              valueColor="#7C3AED"
            />
          )}
        </div>

        {totalSavings > 0 && (
          <div
            className="mt-3 px-3 py-2 rounded-lg flex items-center justify-between fade-in-up"
            style={{ backgroundColor: '#F4EFFF' }}
          >
            <span className="text-[12px] font-semibold text-[#7C3AED]">
              총 {totalSavings.toLocaleString()}원 할인됐어요
            </span>
            <span className="text-[11px] text-[#7C3AED] opacity-70">
              쿠폰 + 포인트
            </span>
          </div>
        )}

        <div
          className="mt-3 pt-3 flex items-end justify-between"
          style={{ borderTop: '1px solid #F2F3F5' }}
        >
          <span className="text-[14px] font-bold text-gray-900">총 결제금액</span>
          <span className="text-[22px] font-extrabold text-gray-900 leading-none">
            {totalPrice.toLocaleString()}
            <span className="text-[13px] font-semibold text-gray-600 ml-0.5">원</span>
          </span>
        </div>
      </Section>

      <Divider />

      {/* Agreements */}
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
              transition: 'all 220ms ease',
            }}
          >
            {allAgreed && <Check size={11} strokeWidth={3} className="text-white check-pop" />}
          </span>
          <span className="text-[13px] font-bold text-gray-900 flex-1">
            전체 약관에 동의
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAgreeAccordion(!showAgreeAccordion);
            }}
            className="p-1"
          >
            {showAgreeAccordion ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </button>
        </button>
        {showAgreeAccordion && (
          <div className="mt-1 pl-7 space-y-1.5 fade-in-up">
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
                      transition: 'all 220ms ease',
                    }}
                  >
                    {checked && <Check size={8} strokeWidth={3.5} className="text-white check-pop" />}
                  </span>
                  <span className="text-[12px] text-gray-600 flex-1">{t.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* Bottom CTA */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white z-50 lg:static lg:mt-6 lg:transform-none lg:left-auto lg:max-w-none"
        style={{
          borderTop: '1px solid #F2F3F5',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <div className="px-2.5 pt-3 pb-3">
          <button
            onClick={handlePayment}
            disabled={!allAgreed}
            className="w-full py-3.5 rounded-xl font-bold text-[15px] btn-press transition-colors"
            style={{
              backgroundColor: allAgreed ? '#7C3AED' : '#F3F4F6',
              color: allAgreed ? '#fff' : '#A4ABBA',
              boxShadow: allAgreed ? '0 6px 16px rgba(124,58,237,0.3)' : 'none',
            }}
          >
            {totalPrice.toLocaleString()}원 결제하기
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
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
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
