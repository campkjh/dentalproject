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
import { CheckIcon, FlowHeader, FlowSheet, cx, stag, useFlowSheet } from '@/components/booking/FlowKit';
import { formatKDate, formatKTime } from '@/components/booking/schedule';
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
      <div className="min-h-screen bg-white flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-base font-bold text-gray-900">결제할 상품을 찾을 수 없습니다.</p>
          <button
            type="button"
            onClick={() => router.push('/search')}
            className="mt-4 h-12 px-6 rounded-2xl bg-[#3180F7] text-white text-[16px] font-semibold"
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

  return (
    <div className={s.root}>
      <div className={s.page}>
        <FlowHeader onBack={() => router.back()} />

        <main className={s.main}>
          <p className={cx(s.eyebrow, s.aTitle)}>마지막 단계</p>
          <h1 className={cx(s.coTitle, s.aTitle)}>예약 결제</h1>
          <p className={cx(s.sub, s.aSub)}>방문 일정과 결제 금액을 확인해 주세요.</p>

          {/* 주문 요약 */}
          <section className={cx(s.card, s.aItem)} style={stag(0)}>
            <p className={s.cardLabel}>예약 상품</p>
            <div className={s.orderTop}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={s.orderImg} src={productImage} alt="" />
              <div className={s.orderTxt}>
                <p className={s.orderHos}>{hospital}</p>
                <p className={s.orderTitle}>{product.title}</p>
                <p className={s.orderPrice}>
                  {discountRate > 0 && <span className={s.rate}>{discountRate}%</span>}
                  <span className={s.now}>{basePrice.toLocaleString()}원</span>
                  {productDiscount > 0 && <s>{listPrice.toLocaleString()}원</s>}
                </p>
              </div>
            </div>
            <div className={s.kv}>
              <div className={s.kvRow}>
                <span>방문 일시</span>
                <b className={visitPretty ? undefined : s.muted}>{visitPretty || selectedVisitLabel}</b>
                <button type="button" className={s.linkBtn} onClick={rebook}>변경</button>
              </div>
              <div className={s.kvRow}><span>위치</span><b>{product.location || '-'}</b></div>
              <div className={s.kvRow}>
                <span>예약자</span>
                <b className={user ? undefined : s.muted}>
                  {user ? [user.name, user.phone || '연락처 미등록'].filter(Boolean).join(' · ') : '로그인 필요'}
                </b>
              </div>
            </div>
          </section>

          {/* 할인 — 쿠폰·포인트 */}
          <section className={cx(s.section, s.aItem)} style={stag(1)}>
            <div className={s.sectionHead}>
              <h2>할인</h2>
              <em>사용 가능 쿠폰 <b>{availableCoupons.length}</b>장</em>
            </div>
            <button type="button" className={cx(s.pickRow, selectedCoupon && s.on)} onClick={() => setShowCouponSheet(true)}>
              <span className={s.t}>{selectedCoupon ? selectedCoupon.name : availableCoupons.length > 0 ? '쿠폰을 선택해 주세요' : '사용 가능한 쿠폰이 없어요'}</span>
              {selectedCoupon && <span className={s.amt}>-{selectedCoupon.discountAmount.toLocaleString()}원</span>}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className={s.pointRow}>
              <label className={s.pointInput}>
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
                />
                <span>P</span>
              </label>
              <button type="button" className={s.pointAll} onClick={handleUseAllPoints}>전액사용</button>
            </div>
          </section>

          {/* 결제 수단 */}
          <section className={cx(s.section, s.aItem)} style={stag(2)}>
            <div className={s.sectionHead}><h2>결제 수단</h2></div>
            <div className={s.list}>
              {([
                ['후불결제', '진료 후 병원에서 직접 결제합니다.'],
                ['앱결제', '지금 앱에서 미리 결제합니다.'],
              ] as const).map(([method, hint]) => {
                const on = paymentMethod === method;
                return (
                  <button key={method} type="button" className={cx(s.opt, on && s.on)} onClick={() => setPaymentMethod(method)} aria-pressed={on}>
                    <span className={s.optTt}>
                      <span className={s.optT}>{method}</span>
                      <span className={s.optHint}>{hint}</span>
                    </span>
                    <span className={cx(s.radio, on && s.on)}>{on && <CheckIcon size={14} width={3} />}</span>
                  </button>
                );
              })}
            </div>
            {paymentMethod === '앱결제' && (
              <div className={s.subFade}>
                <div className={s.chips} role="group" aria-label="앱결제 수단">
                  {APP_PAY_METHODS.map(([method, label]) => (
                    <button key={method} type="button" className={cx(s.chip, appPayMethod === method && s.on)} aria-pressed={appPayMethod === method} onClick={() => setAppPayMethod(method)}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className={s.methodHint}>
                  {appPayMethod === 'CARD'
                    ? '앱에서 카드결제로 미리 결제합니다.'
                    : appPayMethod === 'TRANSFER'
                      ? '내 은행 계좌에서 바로 이체해 결제합니다.'
                      : `발급된 계좌로 ${VIRTUAL_ACCOUNT_VALID_HOURS}시간 안에 입금하면 결제가 완료됩니다.`}
                </p>
              </div>
            )}
          </section>

          {/* 금액 내역 */}
          <section className={cx(s.card, s.aItem)} style={{ ...stag(3), marginTop: 32 }}>
            {productDiscount > 0 && (
              <>
                <div className={s.line}><span>정가</span><span>{listPrice.toLocaleString()}원</span></div>
                <div className={s.line}><span>상품 할인</span><span className={s.minus}>-{productDiscount.toLocaleString()}원</span></div>
              </>
            )}
            <div className={s.line}><span>상품 금액 (VAT 포함)</span><span>{basePrice.toLocaleString()}원</span></div>
            <div className={cx(s.line, s.vat)}><span>└ 부가세 VAT (포함)</span><span>{vatAmount.toLocaleString()}원</span></div>
            {couponDiscount > 0 && (
              <div className={cx(s.line, s.lineIn)}><span>쿠폰 할인</span><span className={s.minus}>-{couponDiscount.toLocaleString()}원</span></div>
            )}
            {pointsToUse > 0 && (
              <div className={cx(s.line, s.lineIn)}><span>포인트 사용</span><span className={s.minus}>-{pointsToUse.toLocaleString()}원</span></div>
            )}
            <div className={s.total}>
              <span>최종 결제금액</span>
              <b key={totalPrice} className={s.pop}>{totalPrice.toLocaleString()}<small>원</small></b>
            </div>
            {totalSavings > 0 && (
              <div key={totalSavings} className={cx(s.save, s.lineIn)}>
                총 {totalSavings.toLocaleString()}원 할인됐어요
                <span>쿠폰 + 포인트</span>
              </div>
            )}
          </section>

          {/* 약관 동의 */}
          <section ref={agreementRef} className={cx(s.section, s.aItem)} style={stag(4)}>
            <div className={s.sectionHead}><h2>결제 동의</h2></div>
            <button type="button" className={cx(s.agreeAll, allAgreed && s.on)} onClick={toggleAgreeAll} aria-pressed={allAgreed}>
              <span className={cx(s.check, allAgreed && s.on)}>{allAgreed && <CheckIcon size={14} width={3} />}</span>
              <span className={s.t}>전체 약관에 동의</span>
              <span
                role="button"
                tabIndex={0}
                aria-label={showAgreeAccordion ? '약관 접기' : '약관 펼치기'}
                className={cx(s.agreeToggle, showAgreeAccordion && s.open)}
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5.5 9 12 15.5 18.5 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </button>
            <div className={s.agreeList} style={{ maxHeight: showAgreeAccordion ? 200 : 0, opacity: showAgreeAccordion ? 1 : 0 }}>
              {agreementTerms.map((t) => {
                const checked = agreed.has(t.id);
                return (
                  <button key={t.id} type="button" className={s.agreeItem} onClick={() => toggleAgree(t.id)} aria-pressed={checked}>
                    <span className={cx(s.check, s.sm, checked && s.on)}><CheckIcon size={18} width={2.6} /></span>
                    <span className={s.t}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </main>

        {/* 하단 고정 결제 줄 — 동의 전 '약관 동의' → 동의 후 'N원 결제하기' 로 바뀐다 */}
        <div className={s.payBar}>
          <div
            className={s.payBarTop}
            style={{ maxHeight: agreedFlow ? 30 : 0, opacity: agreedFlow ? 1 : 0, marginBottom: agreedFlow ? 10 : 0 }}
          >
            <span>결제할 금액</span>
            <b key={totalPrice} className={s.pop}>{totalPrice.toLocaleString()}원</b>
          </div>
          <button
            type="button"
            onClick={handleCta}
            disabled={submitting}
            className={cx(s.cta, submitting && s.busy)}
            style={{ background: agreedFlow ? undefined : '#191F28', transition: 'background-color 420ms cubic-bezier(0.22, 1, 0.36, 1)' }}
          >
            <span className={s.ctaLabel}>
              <span style={{ transform: agreedFlow ? 'translateY(-120%)' : 'translateY(0)', opacity: agreedFlow ? 0 : 1 }}>
                결제 약관에 동의합니다
              </span>
              <span
                style={{
                  transform: agreedFlow ? 'translateY(0)' : 'translateY(120%)',
                  opacity: agreedFlow ? 1 : 0,
                  transitionDelay: '80ms',
                }}
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
          <h2 className={s.sheetTitle}>쿠폰 선택</h2>
          <div className={s.couponList}>
            <button type="button" className={cx(s.coupon, !selectedId && s.on)} onClick={() => close(() => onSelect(null))}>
              <span className={s.tt}><span className={s.n}>쿠폰 미사용</span></span>
              <span className={cx(s.radio, !selectedId && s.on)}>{!selectedId && <CheckIcon size={14} width={3} />}</span>
            </button>
            {coupons.map((c) => {
              const on = selectedId === c.id;
              return (
                <button key={c.id} type="button" className={cx(s.coupon, on && s.on)} onClick={() => close(() => onSelect(c.id))}>
                  <span className={s.tt}>
                    <span className={s.n}>{c.name}</span>
                    <span className={s.d}>
                      <b>-{c.discountAmount.toLocaleString()}원</b>
                      {c.daysLeft !== undefined && ` · ${c.daysLeft}일 남음`}
                    </span>
                  </span>
                  <span className={cx(s.radio, on && s.on)}>{on && <CheckIcon size={14} width={3} />}</span>
                </button>
              );
            })}
          </div>
          {coupons.length === 0 && <p className={s.couponEmpty}>지금 사용할 수 있는 쿠폰이 없어요.</p>}
      </>
    </FlowSheet>
  );
}
