'use client';

import { useState, Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resolveHospitalImageUrl, resolveProductImageUrl } from '@/lib/images';
import {
  requestTossPayment,
  generateOrderId,
  isTossConfigured,
  VIRTUAL_ACCOUNT_VALID_HOURS,
  VIRTUAL_ACCOUNT_ENABLED,
  type TossPayMethod,
} from '@/lib/toss';
import { useStore } from '@/store';
import { markPendingPayment, clearPendingPayment, cancelAbandonedPayment } from '@/lib/pending-payment';
import type { Coupon } from '@/types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { FlowSheet, cx, stag, useFlowSheet } from '@/components/booking/FlowKit';
import { formatKDate, formatKTime } from '@/components/booking/schedule';
// 금액 바뀔 때 통통 튀는 .pop 만 빌려 쓴다(쿠폰 시트 껍데기도 FlowSheet 그대로)
import s from '@/components/booking/flow.module.css';

const agreementTerms = [
  { id: 'ePayment', label: '(필수) 전자금융거래 이용약관' },
  { id: 'thirdParty', label: '(필수) 개인정보 제3자 제공 동의' },
  { id: 'refund', label: '(필수) 환불·취소 규정 확인' },
];

function getVisitTimestamp(dateParam: string | null, timeParam: string | null) {
  if (!dateParam || !timeParam) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam) || !/^\d{2}:\d{2}$/.test(timeParam)) return null;

  const iso = `${dateParam}T${timeParam}:00+09:00`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return { date, iso };
}

/** 지금 시각(ms) — 결제 버튼을 누른 순간에만 부른다 */
const currentMs = () => Date.now();

/** 토스 결제수단별 최소 결제금액(원). 계좌이체는 200원 미만이면 결제창이 오류를 띄운다. */
const TOSS_MIN_AMOUNT: Record<TossPayMethod, number> = { CARD: 1, TRANSFER: 200, VIRTUAL_ACCOUNT: 1 };

/** 앱결제 하위 결제수단. 무통장입금은 토스 가상계좌 계약 후 환경변수로 켠다. */
const APP_PAY_METHODS: ReadonlyArray<readonly [TossPayMethod, string]> = [
  ['CARD', '카드·간편결제'],
  ['TRANSFER', '계좌이체'],
  ...(VIRTUAL_ACCOUNT_ENABLED ? ([['VIRTUAL_ACCOUNT', '무통장입금']] as const) : []),
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
  const dateParam = searchParams.get('date'); // YYYY-MM-DD
  const timeParam = searchParams.get('time'); // HH:mm
  const paymentParam = searchParams.get('payment'); // 'app' | null
  const { user, showToast, addReservation, products, hospitals } = useStore();
  const coupons = user?.coupons ?? [];
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'후불결제' | '앱결제'>(paymentParam === 'app' ? '앱결제' : '후불결제');
  const [appPayMethod, setAppPayMethod] = useState<TossPayMethod>('CARD');

  const [showCouponSheet, setShowCouponSheet] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [pointInput, setPointInput] = useState('');
  const [agreed, setAgreed] = useState<Set<string>>(new Set());
  const [showAgreeAccordion, setShowAgreeAccordion] = useState(false);
  const [agreedFlow, setAgreedFlow] = useState(false);
  const agreementRef = useRef<HTMLDivElement>(null);

  // 결제창에서 결제를 끝내지 않고 돌아온 경우(안드로이드 뒤로가기 등) 결제 전에 만든 예약을 정리한다.
  useEffect(() => {
    cancelAbandonedPayment();
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) cancelAbandonedPayment();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const product = products.find((p) => p.id === productId) ?? products[0];
  if (!product) {
    return (
      <div className="mx-auto min-h-screen max-w-[640px] bg-white">
        <TopBar title="예약 결제" />
        <div className="flex flex-col items-center px-6 pt-20 text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
            <MonoIcon name="receipt" size={34} color="#B0B8C1" />
          </span>
          <p className="mt-5 text-[19px] font-bold text-[#191F28]">결제할 상품을 찾을 수 없어요</p>
          <p className="mt-1.5 text-[15px] text-[#8B95A1]">상품을 다시 골라 주세요.</p>
          <button
            type="button"
            onClick={() => router.push('/search')}
            className="mt-6 h-12 rounded-[14px] bg-[#4A82EE] px-6 text-[16px] font-bold text-white transition-all active:scale-[0.98]"
          >
            상품 다시 찾기
          </button>
        </div>
      </div>
    );
  }
  const hospital = product.hospitalName;
  const hospitalRow = hospitals.find((h) => h.id === product.hospitalId);

  const availableCoupons = coupons.filter((c) => c.status === 'available');
  const selectedCoupon = availableCoupons.find((c) => c.id === selectedCouponId);

  const userPoints = user?.points ?? 5000;
  const pointsToUse = Math.min(parseInt(pointInput || '0', 10) || 0, userPoints);

  // 상품 가격은 VAT 포함가. 부가세는 별도로 더하지 않고, 포함된 금액만 안내용으로 계산한다.
  const basePrice = product.price;
  const vatAmount = basePrice - Math.round(basePrice / 1.1);
  const couponDiscount = selectedCoupon?.discountAmount ?? 0;
  const totalSavings = couponDiscount + pointsToUse;
  const totalPrice = Math.max(basePrice - couponDiscount - pointsToUse, 0);
  const selectedVisitLabel = dateParam && timeParam
    ? `${dateParam.replaceAll('-', '.')} ${timeParam}`
    : '예약일시 미선택';

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

  const handleCta = async () => {
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
    if (!user) {
      showToast('로그인이 필요합니다.');
      router.push('/login');
      return;
    }
    if (submitting) return;

    // Build the actual visit timestamp from URL params (set by booking page)
    const visit = getVisitTimestamp(dateParam, timeParam);
    if (!visit) {
      showToast('예약일시를 다시 선택해주세요.');
      router.push(`/booking?productId=${encodeURIComponent(product.id)}`);
      return;
    }
    if (visit.date.getTime() <= currentMs()) {
      showToast('이미 지난 예약 시간입니다. 다시 선택해주세요.');
      router.push(`/booking?productId=${encodeURIComponent(product.id)}`);
      return;
    }
    // 토스 최소 결제금액 미만이면 결제창이 오류로 끝나므로 예약을 만들기 전에 막는다
    if (paymentMethod === '앱결제' && totalPrice > 0 && totalPrice < TOSS_MIN_AMOUNT[appPayMethod]) {
      showToast(`${APP_PAY_METHODS.find(([m]) => m === appPayMethod)?.[1] ?? '앱결제'}는 ${TOSS_MIN_AMOUNT[appPayMethod].toLocaleString()}원 이상부터 결제할 수 있어요.`);
      return;
    }

    setSubmitting(true);
    const newReservation = {
      id: `res-${currentMs()}`,
      status: 'pending' as const,
      date: new Date().toLocaleDateString('ko-KR'),
      productId: product.id,
      productTitle: product.title,
      productImage: product.imageUrl,
      hospitalName: product.hospitalName,
      hospitalId: product.hospitalId,
      hospitalImage: resolveHospitalImageUrl(hospitalRow),
      location: product.location,
      visitDate: selectedVisitLabel,
      reservationDate: selectedVisitLabel,
      amount: totalPrice,
      customerName: user.name ?? '',
      customerPhone: user.phone ?? '',
      paymentMethod,
    };
    const result = await addReservation(newReservation, { visitAtIso: visit.iso });
    if (result?.error) {
      setSubmitting(false);
      showToast(result.error);
      return;
    }

    const reservationId = result.id ?? '';

    // 앱결제 + 결제금액 > 0 + 토스 설정됨 → 토스 결제창(카드/간편결제)을 연다.
    // 성공 시 successUrl로 리다이렉트되고, 그 페이지에서 서버 승인(confirm)을 호출한다.
    if (paymentMethod === '앱결제' && totalPrice > 0 && isTossConfigured()) {
      try {
        const origin = window.location.origin;
        if (reservationId) markPendingPayment(reservationId);
        await requestTossPayment({
          method: appPayMethod,
          amount: totalPrice,
          orderId: generateOrderId(),
          orderName: product.title,
          successUrl: `${origin}/payment/success?reservationId=${encodeURIComponent(reservationId)}&productId=${encodeURIComponent(product.id)}`,
          failUrl: `${origin}/payment/fail?reservationId=${encodeURIComponent(reservationId)}`,
          customerName: user.name,
          customerMobilePhone: user.phone,
        });
        return; // 리다이렉트되므로 이 아래는 실행되지 않음
      } catch (e) {
        setSubmitting(false);
        const msg = (e as { message?: string })?.message ?? '';
        const isCancel = /취소|cancel|USER_CANCEL/i.test(msg);
        // 결제창을 열기 전에 만든 예약이 '결제 대기'로 남지 않도록 취소한다.
        clearPendingPayment();
        if (reservationId) {
          fetch(`/api/reservations/${encodeURIComponent(reservationId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'cancelled',
              cancelReason: isCancel
                ? '결제를 취소하여 예약이 취소되었습니다.'
                : '결제가 완료되지 않아 예약이 취소되었습니다.',
            }),
          }).catch(() => {});
        }
        showToast(isCancel || !msg ? '결제가 취소되었습니다.' : msg);
        return;
      }
    }

    // 후불결제(또는 무료/미설정) — 즉시 완료 처리
    setSubmitting(false);
    showToast('결제가 완료되었습니다!');
    router.push(`/payment/success?reservationId=${encodeURIComponent(reservationId)}&productId=${encodeURIComponent(product.id)}`);
  };

  // ── 화면 표시용 값(결제 금액 계산에는 쓰지 않는다) ──
  const productImage = resolveProductImageUrl(product.imageUrl, product.id);
  // 정가·상품 할인 — 상품 가격(basePrice)에 이미 반영된 할인을 안내만 한다
  const listPrice = product.originalPrice && product.originalPrice > basePrice ? product.originalPrice : basePrice;
  const productDiscount = listPrice - basePrice;
  const discountRate = productDiscount > 0 ? Math.round((productDiscount / listPrice) * 100) : 0;
  const visitPretty = dateParam && timeParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && /^\d{2}:\d{2}$/.test(timeParam)
    ? `${formatKDate(dateParam).replace(/^\d{4}년 /, '')} ${formatKTime(timeParam)}`
    : '';
  const rebook = () => router.push(`/booking?productId=${encodeURIComponent(product.id)}${paymentParam === 'app' ? '&payment=app' : ''}`);

  const appMethodHint = appPayMethod === 'CARD'
    ? '앱에서 카드결제로 미리 결제해요.'
    : appPayMethod === 'TRANSFER'
      ? '내 은행 계좌에서 바로 이체해 결제해요.'
      : `발급된 계좌로 ${VIRTUAL_ACCOUNT_VALID_HOURS}시간 안에 입금하면 결제가 끝나요.`;

  return (
    <div className="mx-auto min-h-screen max-w-[640px] bg-white" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 140px), 156px)' }}>
      <TopBar title="예약 결제" sub="방문 일정과 결제 금액을 확인해 주세요" />

      {/* ─── 예약 상품 · 금액 카드 · 일정 ─── */}
      <div className="px-5 pb-6 pt-2">
        <div className="qd-a-item -mx-2 flex items-center gap-3.5 rounded-[16px] px-2 py-2" style={stag(0)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImage} alt="" className="h-[56px] w-[56px] shrink-0 rounded-[14px] bg-[#F2F4F6] object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-bold text-[#191F28]">{product.title}</span>
            <span className="mt-0.5 block truncate text-[14px] text-[#8B95A1]">{hospital}</span>
          </span>
        </div>

        {/* 금액 카드 — 상품 상세 가격 카드와 같은 연파랑 · 남색 */}
        <div className="qd-a-item mt-4 rounded-[14px] bg-[#EFF5FE] px-5 pb-5 pt-4" style={stag(1)}>
          <div className="flex items-center gap-2">
            <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">{paymentMethod === '앱결제' ? '앱결제' : '현장결제'}</span>
            {discountRate > 0 && <span className="text-[14px] font-semibold text-[#2F6FE4]">상품 {discountRate}% 할인 적용</span>}
          </div>
          <p className="mt-3 text-[15px] font-semibold text-[#1E3A78]">최종 결제금액</p>
          <p key={totalPrice} className={cx('mt-0.5 text-[30px] font-bold tracking-[-0.8px] text-[#1E3A78]', s.pop)}>{totalPrice.toLocaleString()}원</p>
          {totalSavings > 0 && (
            <p key={totalSavings} className="mt-1 text-[14px] font-semibold text-[#2F6FE4]">쿠폰·포인트로 {totalSavings.toLocaleString()}원 아꼈어요</p>
          )}
        </div>

        <div className="qd-a-item mt-3" style={stag(2)}>
          <p className="flex min-h-11 items-center py-1.5">
            <span className="w-[86px] shrink-0 text-[17px] text-[#8B95A1]">방문일시</span>
            <span className={cx('min-w-0 flex-1 break-keep text-[17px]', visitPretty ? 'text-[#333D4B]' : 'text-[#B0B8C1]')}>{visitPretty || selectedVisitLabel}</span>
            <button type="button" onClick={rebook} className="ml-2 h-8 shrink-0 rounded-[8px] bg-[#F2F4F6] px-3 text-[14px] font-semibold text-[#4E5968] transition-all active:scale-[0.97] active:bg-[#E5E8EB]">변경</button>
          </p>
          <InfoRow label="위치" value={product.location || '-'} />
          <InfoRow
            label="예약자"
            value={user ? [user.name, user.phone || '연락처 미등록'].filter(Boolean).join(' · ') : '로그인이 필요해요'}
            muted={!user}
          />
        </div>
      </div>

      {/* ─── 할인 — 쿠폰·포인트 ─── */}
      <Band />
      <div className="qd-a-item px-5 py-7" style={stag(3)}>
        <div className="flex items-baseline justify-between">
          <SectionTitle>할인</SectionTitle>
          <span className="text-[14px] text-[#8B95A1]">사용 가능 쿠폰 <b className="font-bold text-[#3180F7]">{availableCoupons.length}</b>장</span>
        </div>
        <button
          type="button"
          onClick={() => setShowCouponSheet(true)}
          className={cx(
            'mt-4 flex h-14 w-full items-center gap-2 rounded-[14px] px-4 text-left transition-all active:scale-[0.99]',
            selectedCoupon ? 'bg-[#EFF5FE]' : 'bg-[#F2F4F6]'
          )}
        >
          <MonoIcon name="tag" size={18} color={selectedCoupon ? '#2F6FE4' : '#8B95A1'} />
          <span className={cx('min-w-0 flex-1 truncate text-[16px]', selectedCoupon ? 'font-semibold text-[#191F28]' : 'text-[#8B95A1]')}>
            {selectedCoupon ? selectedCoupon.name : availableCoupons.length > 0 ? '쿠폰을 선택해 주세요' : '사용 가능한 쿠폰이 없어요'}
          </span>
          {selectedCoupon && <span className="shrink-0 text-[16px] font-bold text-[#2F6FE4]">-{selectedCoupon.discountAmount.toLocaleString()}원</span>}
          <ChevronRight size={20} className="shrink-0 text-[#B0B8C1]" />
        </button>
        <div className="mt-2 flex gap-2">
          <label className="flex h-14 min-w-0 flex-1 items-center gap-2 rounded-[14px] bg-[#F2F4F6] px-4 transition-colors focus-within:bg-[#EDEFF2]">
            <input
              type="number"
              inputMode="numeric"
              value={pointInput}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (isNaN(val) || val < 0) setPointInput('');
                else if (val > userPoints) setPointInput(String(userPoints));
                else setPointInput(e.target.value);
              }}
              placeholder={`포인트 (보유 ${userPoints.toLocaleString()}P)`}
              aria-label="사용할 포인트"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-[#191F28] outline-none placeholder:text-[#B0B8C1]"
            />
            <span className="shrink-0 text-[16px] font-semibold text-[#8B95A1]">P</span>
          </label>
          <button type="button" onClick={handleUseAllPoints} className="h-14 shrink-0 rounded-[14px] bg-[#F2F4F6] px-4 text-[15px] font-semibold text-[#333D4B] transition-all active:scale-[0.98] active:bg-[#E5E8EB]">
            전액사용
          </button>
        </div>
      </div>

      {/* ─── 결제 수단 ─── */}
      <Band />
      <div className="qd-a-item px-5 py-7" style={stag(4)}>
        <SectionTitle>결제 수단</SectionTitle>
        <div className="mt-4 space-y-2">
          {([
            ['후불결제', '진료 후 병원에서 직접 결제해요', 'hospital'],
            ['앱결제', '지금 앱에서 미리 결제해요', 'coin'],
          ] as const).map(([method, hint, icon]) => {
            const on = paymentMethod === method;
            return (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                aria-pressed={on}
                className={cx('flex w-full items-center gap-3 rounded-[14px] px-4 py-4 text-left transition-all active:scale-[0.99]', on ? 'bg-[#EFF5FE]' : 'bg-[#F2F4F6]')}
              >
                <MonoIcon name={icon} size={22} color={on ? '#2F6FE4' : '#8B95A1'} />
                <span className="min-w-0 flex-1">
                  <span className={cx('block text-[17px] font-bold', on ? 'text-[#191F28]' : 'text-[#333D4B]')}>{method}</span>
                  <span className="mt-0.5 block text-[14px] text-[#6B7684]">{hint}</span>
                </span>
                {checkDot(on)}
              </button>
            );
          })}
        </div>
        {paymentMethod === '앱결제' && (
          <div className="qd-a-item mt-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="앱결제 수단">
              {APP_PAY_METHODS.map(([method, label]) => {
                const on = appPayMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAppPayMethod(method)}
                    className={cx('h-9 rounded-[8px] px-3 text-[14.5px] font-semibold transition-all active:scale-[0.97]', on ? 'bg-[#EFF5FE] text-[#2F6FE4]' : 'bg-[#F2F4F6] text-[#333D4B]')}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
              <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
              {appMethodHint}
            </p>
          </div>
        )}
      </div>

      {/* ─── 금액 내역 ─── */}
      <Band />
      <div className="qd-a-item px-5 py-7" style={stag(5)}>
        <SectionTitle>결제 금액</SectionTitle>
        <div className="mt-3">
          {productDiscount > 0 && (
            <>
              <PriceLine label="정가" value={`${listPrice.toLocaleString()}원`} />
              <PriceLine label="상품 할인" value={`-${productDiscount.toLocaleString()}원`} minus />
            </>
          )}
          <PriceLine label="상품 금액" value={`${basePrice.toLocaleString()}원`} />
          <PriceLine label="└ 부가세(포함)" value={`${vatAmount.toLocaleString()}원`} faint />
          {couponDiscount > 0 && <PriceLine label="쿠폰 할인" value={`-${couponDiscount.toLocaleString()}원`} minus />}
          {pointsToUse > 0 && <PriceLine label="포인트 사용" value={`-${pointsToUse.toLocaleString()}원`} minus />}
          <div className="mt-2 flex items-center justify-between rounded-[14px] bg-[#F2F4F6] px-4 py-4">
            <span className="text-[17px] font-bold text-[#191F28]">최종 결제금액</span>
            <b key={totalPrice} className={cx('text-[20px] font-bold tracking-[-0.4px] text-[#1E3A78]', s.pop)}>{totalPrice.toLocaleString()}원</b>
          </div>
        </div>
      </div>

      {/* ─── 결제 동의 ─── */}
      <Band />
      <div ref={agreementRef} className="qd-a-item px-5 py-7" style={stag(6)}>
        <SectionTitle>결제 동의</SectionTitle>
        <button
          type="button"
          onClick={toggleAgreeAll}
          aria-pressed={allAgreed}
          className={cx('mt-4 flex h-14 w-full items-center gap-3 rounded-[14px] px-4 text-left transition-all active:scale-[0.99]', allAgreed ? 'bg-[#EFF5FE]' : 'bg-[#F2F4F6]')}
        >
          {checkDot(allAgreed)}
          <span className="min-w-0 flex-1 text-[17px] font-bold text-[#191F28]">전체 약관에 동의해요</span>
          <span
            role="button"
            tabIndex={0}
            aria-label={showAgreeAccordion ? '약관 접기' : '약관 펼치기'}
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8B95A1] transition-transform duration-300"
            style={{ transform: showAgreeAccordion ? 'rotate(180deg)' : 'rotate(0deg)' }}
            onClick={(e) => {
              e.stopPropagation();
              setShowAgreeAccordion(!showAgreeAccordion);
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              e.stopPropagation();
              setShowAgreeAccordion(!showAgreeAccordion);
            }}
          >
            <ChevronDown size={20} />
          </span>
        </button>
        <div
          className="overflow-hidden transition-all duration-300 ease-out"
          style={{ maxHeight: showAgreeAccordion ? 200 : 0, opacity: showAgreeAccordion ? 1 : 0 }}
        >
          <div className="pt-2">
            {agreementTerms.map((t) => {
              const checked = agreed.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleAgree(t.id)}
                  aria-pressed={checked}
                  className="flex min-h-11 w-full items-center gap-3 rounded-[12px] px-4 py-1.5 text-left transition-colors active:bg-[#F9FAFB]"
                >
                  {checkDot(checked)}
                  <span className="min-w-0 flex-1 text-[16px] text-[#4E5968]">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 바닥 결제 버튼 — 흐림 띠 위에 떠 있다(동의 전 '약관 동의' → 동의 후 'N원 결제하기') ─── */}
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
          <div
            className="flex items-center justify-between overflow-hidden px-1 transition-all duration-300"
            style={{ maxHeight: agreedFlow ? 30 : 0, opacity: agreedFlow ? 1 : 0, marginBottom: agreedFlow ? 10 : 0 }}
          >
            <span className="text-[15px] text-[#6B7684]">결제할 금액</span>
            <b key={totalPrice} className={cx('text-[17px] font-bold text-[#191F28]', s.pop)}>{totalPrice.toLocaleString()}원</b>
          </div>
          <button
            type="button"
            onClick={handleCta}
            disabled={submitting}
            className={cx(
              'relative flex h-14 w-full items-center justify-center overflow-hidden rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98]',
              submitting && 'opacity-60'
            )}
          >
            <span className="relative block h-[24px] w-full overflow-hidden">
              <span
                className="absolute inset-0 flex items-center justify-center transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: agreedFlow ? 'translateY(-120%)' : 'translateY(0)', opacity: agreedFlow ? 0 : 1 }}
              >
                결제 약관에 동의해요
              </span>
              <span
                className="absolute inset-0 flex items-center justify-center transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: agreedFlow ? 'translateY(0)' : 'translateY(120%)', opacity: agreedFlow ? 1 : 0, transitionDelay: '80ms' }}
              >
                {submitting ? '결제 진행 중...' : `${totalPrice.toLocaleString()}원 결제하기`}
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* 쿠폰 시트 */}
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

/** 전역 .chk-dot — 켜짐 파랑 채움 + 흰 체크 그리기, 꺼짐 회색 테두리(search 거르기 시트와 같은 결) */
function checkDot(on: boolean) {
  return (
    <span key={String(on)} className={`chk-dot flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${on ? 'is-on bg-[#2F6FE4]' : 'is-off border-2 border-[#E5E8EB]'}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={on ? '#fff' : '#D1D6DB'} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
  );
}

const Band = () => <div className="h-2.5 bg-[#F2F4F6]" />;
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">{children}</h2>
);

function InfoRow({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <p className="flex min-h-11 items-center py-1.5">
      <span className="w-[86px] shrink-0 text-[17px] text-[#8B95A1]">{label}</span>
      <span className={cx('min-w-0 flex-1 break-keep text-[17px]', muted ? 'text-[#B0B8C1]' : 'text-[#333D4B]')}>{value}</span>
    </p>
  );
}

function PriceLine({ label, value, minus, faint }: { label: string; value: string; minus?: boolean; faint?: boolean }) {
  return (
    <p className={cx('flex items-center justify-between', faint ? 'min-h-8 py-0.5' : 'min-h-11 py-1.5')}>
      <span className={faint ? 'text-[15px] text-[#B0B8C1]' : 'text-[17px] text-[#8B95A1]'}>{label}</span>
      <span className={cx(faint ? 'text-[15px] text-[#B0B8C1]' : 'text-[17px]', minus ? 'font-semibold text-[#3180F7]' : !faint && 'text-[#333D4B]')}>{value}</span>
    </p>
  );
}

function CouponSheet({
  coupons,
  selectedId,
  onClose,
  onSelect,
}: {
  coupons: Coupon[];
  selectedId: string | null;
  onClose: () => void;
  onSelect: (id: string | null) => void;
}) {
  const { out, close } = useFlowSheet(onClose);
  return (
    <FlowSheet label="쿠폰 선택" out={out} onBackdrop={() => close()}>
      <>
        <h2 className="px-1 pb-3 pt-1 text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">쿠폰 선택</h2>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => close(() => onSelect(null))}
            className={cx('flex w-full items-center gap-3 rounded-[14px] px-4 py-4 text-left transition-all active:scale-[0.99]', !selectedId ? 'bg-[#EFF5FE]' : 'bg-[#F2F4F6]')}
          >
            <span className="min-w-0 flex-1 text-[17px] font-semibold text-[#333D4B]">쿠폰 미사용</span>
            {checkDot(!selectedId)}
          </button>
          {coupons.map((c) => {
            const on = selectedId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => close(() => onSelect(c.id))}
                className={cx('flex w-full items-center gap-3 rounded-[14px] px-4 py-4 text-left transition-all active:scale-[0.99]', on ? 'bg-[#EFF5FE]' : 'bg-[#F2F4F6]')}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-semibold text-[#191F28]">{c.name}</span>
                  <span className="mt-0.5 block text-[14px] text-[#6B7684]">
                    <b className="font-bold text-[#2F6FE4]">-{c.discountAmount.toLocaleString()}원</b>
                    {c.daysLeft !== undefined && ` · ${c.daysLeft}일 남음`}
                  </span>
                </span>
                {checkDot(on)}
              </button>
            );
          })}
        </div>
        {coupons.length === 0 && <p className="py-6 text-center text-[15px] text-[#8B95A1]">지금 사용할 수 있는 쿠폰이 없어요.</p>}
      </>
    </FlowSheet>
  );
}
