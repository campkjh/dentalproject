'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { resolveProductImageUrl } from '@/lib/images';
import { useStore } from '@/store';
import { clearPendingPayment } from '@/lib/pending-payment';

type VirtualAccountInfo = {
  bankCode: string | null;
  accountNumber: string | null;
  customerName: string | null;
  dueDate: string | null;
};

/** 토스 가상계좌 은행 코드 → 은행명 */
const BANK_NAMES: Record<string, string> = {
  '02': 'KDB산업은행', '03': 'IBK기업은행', '04': 'KB국민은행', '06': 'KB국민은행', '07': '수협은행',
  '11': 'NH농협은행', '20': '우리은행', '23': 'SC제일은행', '27': '씨티은행', '31': '대구은행',
  '32': '부산은행', '34': '광주은행', '35': '제주은행', '37': '전북은행', '39': '경남은행',
  '45': '새마을금고', '48': '신협', '71': '우체국', '81': '하나은행', '88': '신한은행',
  '89': '케이뱅크', '90': '카카오뱅크', '92': '토스뱅크',
};

function formatDueDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PaymentSuccessPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩중...</div>}>
      <PaymentSuccessPage />
    </Suspense>
  );
}

function PaymentSuccessPage() {
  const router = useRouter();
  // 결제창에서 정상적으로 돌아왔으므로 '결제 미완료 예약' 기록을 지운다
  useEffect(() => {
    clearPendingPayment();
  }, []);
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const reservationId = searchParams.get('reservationId');
  // 토스 결제창에서 리다이렉트되면 아래 쿼리 파라미터가 붙는다.
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amountParam = searchParams.get('amount');
  const needsConfirm = Boolean(paymentKey && orderId && amountParam && reservationId);

  const products = useStore((s) => s.products);
  const reservations = useStore((s) => s.reservations);
  const product = products.find((p) => p.id === productId);
  const reservation = reservations.find((item) => item.id === reservationId);
  const title = product?.title ?? reservation?.productTitle;
  const hospitalName = product?.hospitalName ?? reservation?.hospitalName;
  const location = product?.location ?? reservation?.location;
  const imageUrl = resolveProductImageUrl(
    product?.imageUrl ?? reservation?.productImage,
    product?.id ?? reservation?.productId ?? reservationId
  );

  // 결제 승인 상태: 토스 리다이렉트면 'confirming'에서 시작, 아니면 바로 'done'.
  const [status, setStatus] = useState<'confirming' | 'done' | 'error'>(
    needsConfirm ? 'confirming' : 'done'
  );
  const [errorMsg, setErrorMsg] = useState('');
  // 무통장입금이면 confirm 응답에 발급된 가상계좌 정보가 담겨 온다.
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccountInfo | null>(null);
  const confirmStartedRef = useRef(false);

  useEffect(() => {
    if (!needsConfirm || confirmStartedRef.current) return;
    confirmStartedRef.current = true;
    (async () => {
      try {
        const res = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amountParam),
            reservationId,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMsg(data?.error ?? '결제 승인에 실패했습니다.');
          setStatus('error');
          return;
        }
        if (data?.status === 'WAITING_FOR_DEPOSIT' && data?.virtualAccount) {
          setVirtualAccount(data.virtualAccount as VirtualAccountInfo);
        }
        setStatus('done');
      } catch {
        setErrorMsg('네트워크 오류로 결제 승인에 실패했습니다.');
        setStatus('error');
      }
    })();
  }, [needsConfirm, paymentKey, orderId, amountParam, reservationId]);

  // 결제 승인 중
  if (status === 'confirming') {
    return (
      <div className="mx-auto flex min-h-screen max-w-[640px] flex-col items-center justify-center bg-white px-6 text-center">
        <Loader2 size={40} className="mb-5 animate-spin text-[#4A82EE]" />
        <h1 className="text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">결제를 승인하고 있어요</h1>
        <p className="mt-2 text-[15px] text-[#8B95A1]">잠시만 기다려 주세요. 창을 닫지 마세요.</p>
      </div>
    );
  }

  // 결제 승인 실패
  if (status === 'error') {
    return (
      <ResultShell
        icon="/icons/color/warning-red.svg"
        title="결제 승인에 실패했어요"
        sub={<>{errorMsg && <span className="block whitespace-pre-line">{errorMsg}</span>}<span className="block">결제가 취소됐어요. 다시 시도해 주세요.</span></>}
        buttons={
          <>
            <button type="button" onClick={() => router.push('/mypage/payments')} className={BTN_SUB}>결제 내역 확인</button>
            <button type="button" onClick={() => router.push('/')} className={BTN_MAIN}>홈으로</button>
          </>
        }
      />
    );
  }

  if (!title || !reservationId) {
    return (
      <ResultShell
        icon="/icons/color/exclamation-yellow.svg"
        title="예약 정보를 확인할 수 없어요"
        sub="마이페이지의 예약 내역에서 상태를 확인해 주세요."
        buttons={<button type="button" onClick={() => router.push('/mypage')} className={BTN_MAIN}>마이페이지로 이동</button>}
      />
    );
  }

  return (
    <ResultShell
      icon="/icons/color/check-circle.svg"
      title={virtualAccount ? '입금 계좌가 발급됐어요' : '결제가 완료됐어요'}
      sub={virtualAccount ? <>아래 계좌로 입금하면 결제가 끝나요.<br />기한 안에 입금하지 않으면 예약이 자동 취소돼요.</> : '예약이 완료됐어요.'}
      buttons={
        <>
          <button type="button" onClick={() => router.push('/reservations')} className={BTN_SUB}>예약 내역</button>
          <button type="button" onClick={() => router.push('/')} className={BTN_MAIN}>홈으로</button>
        </>
      }
    >
      {virtualAccount && (
        <div className="qd-a-item mt-7 rounded-[14px] bg-[#EFF5FE] px-5 pb-4 pt-4" style={{ animationDelay: '.3s' }}>
          <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">무통장입금</span>
          <div className="mt-3">
            <VaRow label="은행" value={BANK_NAMES[virtualAccount.bankCode ?? ''] ?? virtualAccount.bankCode ?? '-'} />
            <VaRow label="계좌번호" value={virtualAccount.accountNumber ?? '-'} copyable />
            <VaRow label="입금자명" value={virtualAccount.customerName ?? '-'} />
            <VaRow label="입금 기한" value={formatDueDate(virtualAccount.dueDate)} />
          </div>
        </div>
      )}

      {/* 예약 상품 요약 */}
      <div className="qd-a-item mt-7" style={{ animationDelay: '.37s' }}>
        <div className="flex items-center gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="h-[56px] w-[56px] shrink-0 rounded-[14px] bg-[#F2F4F6] object-cover" />
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-[17px] font-bold text-[#191F28]">{title}</span>
          </span>
        </div>
        <div className="mt-3">
          {hospitalName && <InfoRow label="병원" value={hospitalName} />}
          {location && <InfoRow label="위치" value={location} />}
        </div>
      </div>
    </ResultShell>
  );
}

const BTN_MAIN = 'flex h-14 min-w-0 flex-1 items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98]';
const BTN_SUB = 'flex h-14 min-w-0 flex-1 items-center justify-center rounded-[18px] bg-[#F2F4F6] text-[17px] font-bold text-[#4E5968] transition-all active:scale-[0.98]';

/** 결과 화면 껍데기 — 가운데 큰 컬러 아이콘(통 튀며 등장) · 20 굵은 제목 · 회색 부제 · 바닥 떠 있는 버튼(같은 폭) */
function ResultShell({ icon, title, sub, buttons, children }: { icon: string; title: string; sub: React.ReactNode; buttons: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-[640px] bg-white" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 112px), 128px)' }}>
      <div className="px-5 pt-[min(22vh,160px)]">
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={icon} alt="" width={56} height={56} className="bounce-in h-14 w-14" />
          <h1 className="qd-a-item mt-5 text-[22px] font-bold tracking-[-0.5px] text-[#191F28]" style={{ animationDelay: '.16s' }}>{title}</h1>
          <p className="qd-a-item mt-2 break-keep text-[15px] leading-[1.55] text-[#6B7684]" style={{ animationDelay: '.23s' }}>{sub}</p>
        </div>
        {children}
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40" style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)' }}>
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, white 30%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.5) 70%, rgba(255,255,255,0) 100%)',
            maskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
          }}
        />
        <div className="pointer-events-auto relative mx-auto flex max-w-[608px] gap-2 pt-10">{buttons}</div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p className="flex min-h-11 items-center py-1.5">
      <span className="w-[86px] shrink-0 text-[17px] text-[#8B95A1]">{label}</span>
      <span className="min-w-0 flex-1 break-keep text-[17px] text-[#333D4B]">{value}</span>
    </p>
  );
}

function VaRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex min-h-10 items-center gap-3 py-1">
      <span className="w-[76px] shrink-0 text-[16px] text-[#5B6B8C]">{label}</span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-[#1E3A78]">{value}</span>
        {copyable && value !== '-' && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(value.replace(/-/g, '')).then(() => setCopied(true)).catch(() => {});
            }}
            className="h-8 shrink-0 rounded-[8px] bg-white px-3 text-[13.5px] font-semibold text-[#2F6FE4] transition-all active:scale-[0.97]"
          >
            {copied ? '복사됨' : '복사'}
          </button>
        )}
      </span>
    </div>
  );
}
