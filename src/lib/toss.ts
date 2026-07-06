'use client';

import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';

/** 브라우저에 노출되는 공개값(클라이언트 키). 시크릿키는 서버(confirm 라우트)에서만 사용. */
export const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? '';

/** 토스 결제 키가 설정돼 있는지 여부. 미설정이면 앱결제를 목업 흐름으로 폴백한다. */
export function isTossConfigured(): boolean {
  return /^(test|live)_ck_/.test(TOSS_CLIENT_KEY);
}

/** 토스 주문번호 규칙: 영문 대소문자/숫자/`-`/`_`/`=` 6~64자. */
export function generateOrderId(prefix = 'dental'): string {
  const rand = Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now()}_${rand}`;
}

/** `-` 없이 숫자 8~15자만 허용되는 휴대폰번호 형식으로 정규화. 유효하지 않으면 undefined. */
function normalizeMobile(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : undefined;
}

/**
 * 토스 결제창(카드/간편결제 통합창)을 연다.
 * 성공하면 successUrl로 리다이렉트되므로 이 함수 이후 코드는 실행되지 않는다.
 * 사용자가 결제창을 닫거나 실패하면 예외를 throw 한다.
 */
export async function requestTossPayment(params: {
  amount: number;
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
  customerName?: string | null;
  customerMobilePhone?: string | null;
}): Promise<void> {
  const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
  const payment = tossPayments.payment({ customerKey: ANONYMOUS });

  await payment.requestPayment({
    method: 'CARD',
    amount: { currency: 'KRW', value: params.amount },
    orderId: params.orderId,
    orderName: params.orderName.slice(0, 100),
    successUrl: params.successUrl,
    failUrl: params.failUrl,
    customerName: params.customerName || undefined,
    customerMobilePhone: normalizeMobile(params.customerMobilePhone),
    card: {
      useEscrow: false,
      flowMode: 'DEFAULT',
      useCardPoint: false,
      useAppCardOnly: false,
    },
  });
}
