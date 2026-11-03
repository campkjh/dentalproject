'use client';

/**
 * 휴대폰 본인인증(포트원 + 다날, PASS·통신 3사·알뜰폰) — 마이닥은 만 19세 이상만 이용할 수 있다.
 * 앱 웹뷰에서도 끊기지 않게 리디렉트 방식으로 연다. 인증을 마치면 이 페이지로 돌아와
 * (?identityVerificationId=…) 서버에서 포트원 결과를 다시 조회해 확인한다.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import PortOne from '@portone/browser-sdk/v2';
import { createClient } from '@/lib/supabase/client';
import { haptic } from '@/lib/haptics';

const STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? '';
const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_IDV_CHANNEL_KEY ?? '';
const NEXT_KEY = 'identity-verify-next';

type Phase = 'idle' | 'opening' | 'checking' | 'done' | 'error' | 'under_age';

function safeNext(path: string | null) {
  return path && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/verify-identity') ? path : '/';
}

export default function VerifyIdentityPageWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">로딩중...</div>}>
      <VerifyIdentityPage />
    </Suspense>
  );
}

function VerifyIdentityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const checkedRef = useRef(false);

  const nextPath = () => {
    try {
      return safeNext(searchParams.get('next') ?? sessionStorage.getItem(NEXT_KEY));
    } catch {
      return safeNext(searchParams.get('next'));
    }
  };

  const confirm = useCallback(async (identityVerificationId: string) => {
    setPhase('checking');
    const res = await fetch('/api/identity/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityVerificationId }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      haptic('success');
      setPhase('done');
      try { sessionStorage.removeItem(NEXT_KEY); } catch {}
      return;
    }
    haptic('error');
    setMessage(data?.error ?? '본인인증을 확인하지 못했어요. 다시 시도해 주세요.');
    setPhase(data?.code === 'UNDER_AGE' ? 'under_age' : 'error');
  }, []);

  // 리디렉트로 돌아왔을 때(앱·모바일)
  useEffect(() => {
    if (checkedRef.current) return;
    const id = searchParams.get('identityVerificationId');
    if (!id) return;
    checkedRef.current = true;
    const code = searchParams.get('code');
    if (code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage(searchParams.get('message') ?? '본인인증이 취소되었어요.');
      setPhase('error');
      return;
    }
    void confirm(id);
  }, [searchParams, confirm]);

  const start = async () => {
    if (!STORE_ID || !CHANNEL_KEY) {
      setMessage('본인인증 설정이 아직 완료되지 않았어요. 고객센터로 문의해 주세요.');
      setPhase('error');
      return;
    }
    haptic('medium');
    setPhase('opening');
    try { sessionStorage.setItem(NEXT_KEY, nextPath()); } catch {}
    const identityVerificationId = `idv_${crypto.randomUUID().replace(/-/g, '')}`;
    const response = await PortOne.requestIdentityVerification({
      storeId: STORE_ID,
      identityVerificationId,
      channelKey: CHANNEL_KEY,
      redirectUrl: `${window.location.origin}/verify-identity`,
      // 앱 웹뷰에서는 팝업이 막히므로 항상 이 페이지로 돌아오게 한다
      forceRedirect: true,
      bypass: {
        danal: {
          // 인증 창·다날 심사에 표시되는 서비스 URL(넘기지 않으면 '포트원'으로 나온다)
          CPTITLE: 'my-doc.co.kr',
          // 다날 인증 창에서부터 만 19세 미만을 막는다(서버에서도 다시 확인)
          AGELIMIT: 19,
        },
      },
    }).catch((e: unknown) => ({ code: 'ERROR', message: (e as Error)?.message }));
    // PC 등 리디렉트 없이 끝난 경우
    if (!response) { setPhase('idle'); return; }
    if ('code' in response && response.code) {
      setMessage(response.message ?? '본인인증이 취소되었어요.');
      setPhase('error');
      return;
    }
    await confirm(identityVerificationId);
  };

  const logout = async () => {
    await createClient().auth.signOut().catch(() => undefined);
    router.replace('/');
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-[500px] flex-col bg-white px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(56px+env(safe-area-inset-top))]">
      <div className="flex-1">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF2FE]">
          <ShieldCheck size={30} className="text-[#3182F6]" />
        </div>

        {phase === 'done' ? (
          <>
            <h1 className="text-[24px] font-bold leading-[32px] text-[#191F28]">본인인증을 마쳤어요</h1>
            <p className="mt-3 text-[15px] leading-[22px] text-[#6B7684]">이제 마이닥의 모든 서비스를 이용할 수 있어요.</p>
          </>
        ) : phase === 'under_age' ? (
          <>
            <h1 className="text-[24px] font-bold leading-[32px] text-[#191F28]">만 19세 이상만 이용할 수 있어요</h1>
            <p className="mt-3 text-[15px] leading-[22px] text-[#6B7684]">
              마이닥은 피부·미용 시술 정보를 다루는 서비스라 성인만 가입할 수 있어요.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[24px] font-bold leading-[32px] text-[#191F28]">
              시술 예약을 위해
              <br />
              본인인증이 필요해요
            </h1>
            <p className="mt-3 text-[15px] leading-[22px] text-[#6B7684]">
              마이닥은 만 19세 이상만 이용할 수 있어요.
              <br />
              PASS 또는 휴대폰 문자로 한 번만 인증하면 돼요.
            </p>
            {phase === 'error' && message && (
              <p className="mt-5 rounded-xl bg-[#FFF0F0] px-4 py-3 text-[14px] leading-[20px] text-[#E5484D]">{message}</p>
            )}
          </>
        )}
      </div>

      {phase === 'done' ? (
        <button
          type="button"
          onClick={() => router.replace(nextPath())}
          className="h-14 w-full rounded-2xl bg-[#3182F6] text-[17px] font-bold text-white"
        >
          계속하기
        </button>
      ) : phase === 'under_age' ? (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={logout} className="h-14 w-full rounded-2xl bg-[#F2F4F6] text-[17px] font-bold text-[#4E5968]">
            로그아웃
          </button>
          <button type="button" onClick={() => router.push('/withdraw')} className="h-12 w-full text-[14px] text-[#8B95A1] underline">
            회원탈퇴
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={start}
            disabled={phase === 'opening' || phase === 'checking'}
            className="h-14 w-full rounded-2xl bg-[#3182F6] text-[17px] font-bold text-white disabled:opacity-60"
          >
            {phase === 'checking' ? '인증 결과 확인 중…' : phase === 'opening' ? '본인인증 여는 중…' : '휴대폰 본인인증'}
          </button>
          <button type="button" onClick={logout} className="h-12 w-full text-[14px] text-[#8B95A1]">
            다음에 할게요 (로그아웃)
          </button>
        </div>
      )}
    </div>
  );
}
