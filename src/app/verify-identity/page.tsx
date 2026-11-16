'use client';

/**
 * 휴대폰 본인인증(포트원 V2 + NHN KCP, PASS·통신 3사·알뜰폰) — 마이닥은 만 19세 이상만 이용할 수 있다.
 * 앱 웹뷰에서도 끊기지 않게 리디렉트 방식으로 연다. 인증을 마치면 이 페이지로 돌아와
 * (?identityVerificationId=…) 서버에서 포트원 결과를 다시 조회해 확인한다.
 * KCP는 인증 창에서 나이를 거르지 않으므로(다날 AGELIMIT 같은 옵션 없음) 만 19세 확인은 서버가 한다.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import PortOne from '@portone/browser-sdk/v2';
import { useSession } from '@/lib/supabase/SessionProvider';
import { createClient as createSupabaseClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { haptic } from '@/lib/haptics';
import { safeNextPath } from '@/lib/identity-shared';
import { useStore } from '@/store';

const STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? '';
const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_IDV_CHANNEL_KEY ?? '';
const NEXT_KEY = 'identity-verify-next';

type Phase = 'idle' | 'opening' | 'checking' | 'done' | 'error' | 'under_age';

export default function VerifyIdentityPageWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">로딩중...</div>}>
      <VerifyIdentityPage />
    </Suspense>
  );
}

function VerifyIdentityPage() {
  const router = useRouter();
  const { signOut } = useSession();
  const searchParams = useSearchParams();
  const showModal = useStore((s) => s.showModal);
  const hideModal = useStore((s) => s.hideModal);
  const showToast = useStore((s) => s.showToast);
  const storeLogout = useStore((s) => s.logout);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [doneNext, setDoneNext] = useState('/');
  const checkedRef = useRef(false);

  const nextPath = useCallback(() => {
    try {
      return safeNextPath(searchParams.get('next') ?? sessionStorage.getItem(NEXT_KEY));
    } catch {
      return safeNextPath(searchParams.get('next'));
    }
  }, [searchParams]);

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
      // 돌아갈 곳을 먼저 잡아 두고 임시 저장값을 지운다(지운 뒤 다시 계산하면 항상 홈으로 간다)
      const dest = nextPath();
      setDoneNext(dest);
      setPhase('done');
      try { sessionStorage.removeItem(NEXT_KEY); } catch {}
      // 주소에 남은 인증 결과 파라미터를 지운다(새로고침해도 다시 확인하지 않게)
      try {
        const clean = new URL('/verify-identity', window.location.origin);
        if (dest !== '/') clean.searchParams.set('next', dest);
        window.history.replaceState(window.history.state, '', clean.toString());
      } catch {}
      return;
    }
    haptic('error');
    setMessage(data?.error ?? '본인인증을 확인하지 못했어요. 다시 시도해 주세요.');
    setPhase(data?.code === 'UNDER_AGE' ? 'under_age' : 'error');
  }, [nextPath]);

  // 리디렉트로 돌아왔을 때(앱·모바일·PC 공통 — forceRedirect)
  useEffect(() => {
    if (checkedRef.current) return;
    const id = searchParams.get('identityVerificationId');
    if (!id) {
      // 이미 인증을 마친 계정이 이 화면을 다시 열거나 완료 화면을 새로고침한 경우 — 다시 인증하라고 하지 않는다
      checkedRef.current = true;
      fetch('/api/identity/status', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((s: { verified?: boolean } | null) => {
          if (!s?.verified) return;
          setDoneNext(nextPath());
          setPhase((p) => (p === 'idle' ? 'done' : p));
        })
        .catch(() => undefined);
      return;
    }
    checkedRef.current = true;
    const code = searchParams.get('code');
    if (code) {
      // KCP 설정 문제(예: CS24 = 신규 연동방식(V2) 미설정)를 진단할 수 있게 PG 코드를 남긴다
      console.warn('[identity] 인증 실패', code, searchParams.get('pgCode') ?? '', searchParams.get('pgMessage') ?? '');
      // 주소의 message 는 누구나 바꿔 넣을 수 있으므로 화면에는 고정 문구만 보인다
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage('본인인증이 취소되었거나 완료되지 않았어요. 다시 시도해 주세요.');
      setPhase('error');
      return;
    }
    void confirm(id);
  }, [searchParams, confirm, nextPath]);

  // 인증 창에서 뒤로가기로 돌아오면(bfcache) '여는 중…'에 멈추지 않게 되돌린다
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPhase((p) => (p === 'opening' ? 'idle' : p));
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const start = async () => {
    if (!STORE_ID || !CHANNEL_KEY) {
      setMessage('본인인증 설정이 아직 완료되지 않았어요. 고객센터로 문의해 주세요.');
      setPhase('error');
      return;
    }
    haptic('medium');
    setPhase('opening');
    const next = nextPath();
    try { sessionStorage.setItem(NEXT_KEY, next); } catch {}

    // 인증 ID는 서버가 발급하고 이 계정·브라우저에 묶는다
    const started = await fetch('/api/identity/start', { method: 'POST' }).catch(() => null);
    const startData = started ? await started.json().catch(() => ({})) : {};
    const identityVerificationId: string | undefined = started?.ok ? startData?.identityVerificationId : undefined;
    if (!identityVerificationId) {
      setMessage(startData?.error ?? '본인인증을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setPhase('error');
      return;
    }

    const redirectUrl = new URL('/verify-identity', window.location.origin);
    if (next !== '/') redirectUrl.searchParams.set('next', next);

    const response = await PortOne.requestIdentityVerification({
      storeId: STORE_ID,
      identityVerificationId,
      channelKey: CHANNEL_KEY,
      redirectUrl: redirectUrl.toString(),
      // 앱 웹뷰에서는 팝업이 막히므로 항상 이 페이지로 돌아오게 한다
      forceRedirect: true,
    }).catch((e: unknown) => ({ code: 'ERROR', message: (e as Error)?.message, pgCode: undefined }));
    // 리디렉트 없이 끝난 경우
    if (!response) { setPhase('idle'); return; }
    if ('code' in response && response.code) {
      console.warn('[identity] 인증 실패', response.code, (response as { pgCode?: string }).pgCode ?? '');
      setMessage(response.message ?? '본인인증이 취소되었어요.');
      setPhase('error');
      return;
    }
    await confirm(identityVerificationId);
  };

  const logout = async () => {
    try { await signOut(); router.replace('/'); }
    catch { setMessage('로그아웃하지 못했어요. 인터넷 연결을 확인해주세요.'); setPhase('error'); }
  };

  // 인증하지 않은(또는 만 19세 미만) 계정도 앱 안에서 바로 탈퇴할 수 있어야 한다
  const withdraw = () => {
    showModal('회원탈퇴', '정말 탈퇴하시겠습니까? 모든 데이터가 영구 삭제됩니다.', async () => {
      hideModal();
      // 앱 푸시 기기 연결은 세션이 살아 있을 때 먼저 끊는다(계정을 지운 뒤에는 서버가 401을 돌려줘 로그아웃이 막힌다)
      const { unregisterNativePush, requestNativePushRegistration } = await import('@/lib/push/native-client');
      try { await unregisterNativePush(); }
      catch { showToast('탈퇴하지 못했어요. 인터넷 연결을 확인해주세요.'); return; }
      try {
        const res = await fetch('/api/auth/withdraw', { method: 'DELETE' });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({}));
          requestNativePushRegistration();
          showToast(error || '탈퇴 처리 중 오류가 발생했습니다.');
          return;
        }
        try { await signOut(); }
        catch {
          // 탈퇴 직후 푸시 재등록이 끼어들어 signOut 이 실패해도 지워진 계정의 세션은 반드시 정리한다
          try { if (hasSupabaseEnv()) await createSupabaseClient().auth.signOut(); } catch {}
        }
        storeLogout();
        router.replace('/');
      } catch {
        requestNativePushRegistration();
        showToast('네트워크 오류가 발생했습니다.');
      }
    });
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
          onClick={() => router.replace(doneNext)}
          className="h-14 w-full rounded-2xl bg-[#3182F6] text-[17px] font-bold text-white"
        >
          계속하기
        </button>
      ) : phase === 'under_age' ? (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={logout} className="h-14 w-full rounded-2xl bg-[#F2F4F6] text-[17px] font-bold text-[#4E5968]">
            로그아웃
          </button>
          <button type="button" onClick={withdraw} className="h-12 w-full text-[14px] text-[#8B95A1] underline">
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
          <button type="button" onClick={withdraw} className="h-10 w-full text-[13px] text-[#B0B8C1] underline">
            회원탈퇴
          </button>
        </div>
      )}
    </div>
  );
}
