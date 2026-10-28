'use client';

import { Suspense, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';
import { safeNextPath, startNativeKakaoLogin } from '@/components/auth/kakao-login';
import styles from './login.module.css';

/* ─────────────────────────────────────────────────────────────
 * 이메일 로그인·가입 — 프리티풀 이메일 로그인(퀵매칭 어법) 모양.
 *  · 한 화면 = 한 질문(큰 제목 · 밑줄 입력 · 아래 큰 파란 버튼), 머리 = 뒤로 + 진행 막대 'N / 전체'.
 *  · 로그인 = 이메일 → 비밀번호 / 가입 = 이름 → 이메일 → 비밀번호.
 *  · 첫 화면 아래 = 카카오·Apple 간편 로그인.
 *  · ?mode=signup 이면 가입부터, ?next=경로 면 로그인 뒤 그리로(관리자·파트너는 각자 화면 우선).
 *  · 로그인·가입·간편 로그인 호출은 예전 그대로(SessionProvider).
 * ──────────────────────────────────────────────────────────── */

type Mode = 'login' | 'signup';
type Step = 'name' | 'email' | 'password';

const FLOW: Record<Mode, Step[]> = { login: ['email', 'password'], signup: ['name', 'email', 'password'] };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const stag = (i: number): CSSProperties => ({ animationDelay: `${0.24 + i * 0.07}s` });

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode: Mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const nextPath = safeNextPath(searchParams.get('next'));
  const { signInWithEmail, signUpWithEmail, signInWithOAuth } = useSession();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>(FLOW[initialMode][0]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState(0);
  const [socialPending, setSocialPending] = useState<'kakao' | 'apple' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const isDoctor = useStore((s) => s.isDoctor);
  const isAdmin = useStore((s) => s.isAdmin);
  useEffect(() => {
    if (isLoggedIn) router.replace(isAdmin ? '/admin' : isDoctor ? '/partner' : nextPath ?? '/');
  }, [isLoggedIn, isDoctor, isAdmin, router, nextPath]);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const id = window.setInterval(() => {
      setRetryAfter((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [retryAfter]);

  // 단계마다 입력칸에 바로 커서 — 버튼 누른 그 순간 안에서 잡아야 iOS 가 키보드를 올려 준다
  useLayoutEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, [step, mode]);

  const isLogin = mode === 'login';
  const flow = FLOW[mode];
  const at = flow.indexOf(step) + 1;

  const resetMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const switchMode = (to: Mode, toStep: Step = FLOW[to][0]) => {
    setMode(to);
    setStep(toStep);
    setPassword('');
    setRetryAfter(0);
    resetMessages();
  };

  const back = () => {
    if (pending) return;
    resetMessages();
    const i = flow.indexOf(step);
    if (i > 0) { setStep(flow[i - 1]); return; }
    // 첫 화면 — 로그인↔가입을 오갔으면 처음 화면으로, 아니면 나간다
    if (mode !== initialMode) { switchMode(initialMode); return; }
    if (window.history.length > 1) router.back();
    else router.replace(nextPath ?? '/');
  };

  const canNext =
    step === 'name' ? name.trim().length >= 2
      : step === 'email' ? email.trim().length > 3
        : password.length >= 6 && retryAfter === 0;

  const submit = async () => {
    setPending(true);
    resetMessages();
    try {
      if (isLogin) {
        const { error, isDoctor, isAdmin } = await signInWithEmail(email.trim(), password);
        if (error) {
          setError(translate(error));
          if (isRateLimitError(error)) setRetryAfter(60);
          return;
        }
        router.replace(isAdmin ? '/admin' : isDoctor ? '/partner' : nextPath ?? '/');
      } else {
        const { error, needsConfirm } = await signUpWithEmail(
          email.trim(),
          password,
          name.trim()
        );
        if (error) {
          setError(translate(error));
          if (isRateLimitError(error)) setRetryAfter(60);
          // 이미 가입된 이메일 → 이메일 칸으로 돌려 '이 이메일로 로그인하기'를 보여 준다
          if (translate(error) === DUPLICATE_MSG) setStep('email');
          return;
        }
        if (needsConfirm) {
          setSuccessMsg('인증 메일을 발송했습니다. 이메일을 확인해 주세요.');
        } else {
          router.replace(nextPath ?? '/');
        }
      }
    } finally {
      setPending(false);
    }
  };

  const next = async () => {
    if (pending) return;
    resetMessages();
    if (step === 'name') {
      if (name.trim().length < 2) { setError('이름을 2자 이상 입력해 주세요.'); return; }
      setStep('email');
      return;
    }
    if (step === 'email') {
      const v = email.trim();
      if (!EMAIL_RE.test(v)) { setError('이메일 형식이 올바르지 않습니다.'); return; }
      setEmail(v);
      setStep('password');
      return;
    }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (retryAfter > 0) return;
    await submit();
  };

  const onSocial = async (provider: 'kakao' | 'apple') => {
    if (socialPending || pending) return;
    setSocialPending(provider);
    resetMessages();

    // 네이티브 앱(WebView) 카카오 = 카카오톡 앱-투-앱 로그인(kakao-login.ts 참고)
    if (provider === 'kakao') {
      const native = startNativeKakaoLogin((message) => {
        setError(message);
        setSocialPending(null);
      });
      if (native) return;
    }

    // iOS 앱: Apple은 네이티브 Sign in with Apple 사용.
    // window.webkit.messageHandlers.appleLogin.postMessage({}) → 네이티브가
    // onAppleNativeLogin(identityToken, nonce, name?)을 호출 → Supabase 세션.
    if (provider === 'apple' && typeof window !== 'undefined') {
      const w = window as Window & {
        webkit?: {
          messageHandlers?: { appleLogin?: { postMessage: (msg: unknown) => void } };
        };
        onAppleNativeLoginError?: (message: string) => void;
      };
      const iosApple = w.webkit?.messageHandlers?.appleLogin;
      if (iosApple) {
        w.onAppleNativeLoginError = (message: string) => {
          if (message) setError(message); // 빈 문자열 = 사용자 취소 → 조용히 리셋
          setSocialPending(null);
        };
        try {
          iosApple.postMessage({});
        } catch {
          setError('Apple 로그인을 시작하지 못했습니다.');
          setSocialPending(null);
        }
        return;
      }
    }

    try {
      await signInWithOAuth(provider);
      // OAuth 인증 페이지로 리다이렉트됩니다. 돌아올 때만 상태 복구.
    } catch {
      setError(
        `${provider === 'kakao' ? '카카오' : 'Apple'} 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.`
      );
      setSocialPending(null);
    }
  };

  let title: ReactNode = null;
  let sub: ReactNode = null;
  let field: ReactNode = null;
  let cta = '다음';

  if (step === 'name') {
    title = <>이름을<br />알려주세요</>;
    sub = '병원 예약과 후기에 보이는 이름이에요.';
    field = (
      <input
        ref={inputRef}
        className={`${styles.input} ${styles.item}`}
        data-error={error ? true : undefined}
        style={stag(0)}
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value.slice(0, 12)); if (error) setError(null); }}
        placeholder="이름"
        autoComplete="name"
        enterKeyHint="next"
        aria-label="이름"
      />
    );
  } else if (step === 'email') {
    title = <>이메일을<br />입력해주세요</>;
    sub = isLogin ? '가입할 때 쓴 이메일을 입력해 주세요.' : '로그인할 때 아이디로 써요.';
    field = (
      <input
        ref={inputRef}
        className={`${styles.input} ${styles.item}`}
        data-error={error ? true : undefined}
        style={stag(0)}
        type="email"
        inputMode="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
        placeholder="example@email.com"
        autoComplete={isLogin ? 'username' : 'email'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="next"
        aria-label="이메일"
      />
    );
  } else {
    title = isLogin ? <>비밀번호를<br />입력해주세요</> : <>비밀번호를<br />만들어주세요</>;
    sub = isLogin ? email.trim() : '6자 이상으로 만들어 주세요.';
    cta = pending
      ? isLogin ? '로그인 중…' : '가입 처리 중…'
      : retryAfter > 0
        ? `잠시 후 재시도 (${retryAfter}s)`
        : isLogin ? '로그인' : '가입하기';
    field = (
      <>
        {/* 비밀번호 관리 앱이 이메일과 짝지어 저장하도록(화면엔 안 보임) */}
        <input className={styles.sr} type="email" name="username" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden="true" />
        <div className={`${styles.pwField} ${styles.item}`} style={stag(0)}>
          <input
            ref={inputRef}
            className={styles.input}
            data-error={error ? true : undefined}
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
            placeholder={isLogin ? '비밀번호' : '비밀번호 (6자 이상)'}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint={isLogin ? 'go' : 'done'}
            aria-label="비밀번호"
          />
          <button
            type="button"
            className={styles.eye}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowPwd((s) => !s)}
            aria-label={showPwd ? '비밀번호 숨기기' : '비밀번호 표시'}
            aria-pressed={showPwd}
          >
            {showPwd ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className={styles.root}>
      <form
        className={styles.page}
        key={`${mode}-${step}`}
        noValidate
        onSubmit={(e) => { e.preventDefault(); void next(); }}
      >
        <header className={styles.header}>
          <button type="button" className={styles.back} onClick={back} aria-label="뒤로">
            <ChevronLeft size={28} strokeWidth={2} />
          </button>
          <div
            className={styles.progress}
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={flow.length}
            aria-valuenow={at}
            aria-label={`전체 ${flow.length}단계 중 ${at}단계`}
          >
            <span className={styles.progressTrack}>
              <span
                className={styles.progressFill}
                style={{ '--from': `${((at - 1) / flow.length) * 100}%`, '--to': `${(at / flow.length) * 100}%` } as CSSProperties}
              />
            </span>
            <span className={styles.progressText}><b>{at}</b> / {flow.length}</span>
          </div>
        </header>

        <main className={styles.main}>
          <p className={`${styles.eyebrow} ${styles.titleIn}`}>{isLogin ? '이메일로 로그인' : '이메일로 회원가입'}</p>
          <h1 className={`${styles.h1} ${styles.titleIn}`}>{title}</h1>
          <p className={`${styles.sub} ${styles.subIn}`}>{sub}</p>
          {field}

          {error && <p className={styles.error} role="alert">{error}</p>}
          {successMsg && <div className={styles.success} role="status">{successMsg}</div>}

          {step === 'email' && !isLogin && error === DUPLICATE_MSG && (
            <button type="button" className={`${styles.link} ${styles.item}`} style={stag(0)} onClick={() => switchMode('login', 'password')}>
              이 이메일로 로그인하기
            </button>
          )}
          {step === 'email' && isLogin && (
            <p className={`${styles.alt} ${styles.item}`} style={stag(1)}>
              아직 회원이 아니신가요?{' '}
              <button type="button" className={styles.inlineLink} onClick={() => switchMode('signup')}>회원가입</button>
            </p>
          )}
          {step === 'name' && (
            <p className={`${styles.alt} ${styles.item}`} style={stag(1)}>
              이미 계정이 있나요?{' '}
              <button type="button" className={styles.inlineLink} onClick={() => switchMode('login')}>로그인</button>
            </p>
          )}

          {/* 간편 로그인 — 로그인·가입 첫 화면에만 */}
          {at === 1 && (
            <div className={`${styles.social} ${styles.item}`} style={stag(2)}>
              <div className={styles.divider}><span>간편 로그인</span></div>
              <button
                type="button"
                onClick={() => onSocial('kakao')}
                disabled={socialPending !== null || pending}
                className={`${styles.socialBtn} ${styles.kakao}`}
              >
                <KakaoIcon />
                {socialPending === 'kakao' ? '카카오로 이동 중…' : `카카오로 ${isLogin ? '로그인' : '시작하기'}`}
              </button>
              <button
                type="button"
                onClick={() => onSocial('apple')}
                disabled={socialPending !== null || pending}
                className={`${styles.socialBtn} ${styles.apple}`}
              >
                <AppleIcon />
                {socialPending === 'apple' ? 'Apple로 이동 중…' : `Apple로 ${isLogin ? '로그인' : '시작하기'}`}
              </button>
            </div>
          )}
        </main>

        <div className={styles.ctaWrap}>
          {step === 'password' && (
            <p className={styles.terms}>
              {isLogin ? '로그인 시' : '회원가입 시'} <span>이용약관</span> 및 <span>개인정보처리방침</span>에 동의합니다.
            </p>
          )}
          <button type="submit" className={styles.cta} disabled={!canNext || pending}>{cta}</button>
        </div>
      </form>
    </div>
  );
}

const DUPLICATE_MSG = '이미 가입된 이메일입니다. 로그인해 주세요.';

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 256 256" aria-hidden="true">
      <path
        fill="#191600"
        d="M128 36C70.562 36 24 72.713 24 118c0 29.279 19.466 54.97 48.748 69.477-1.593 5.494-10.237 35.34-10.583 37.685 0 0-.207 1.762.934 2.434s2.483.15 2.483.15c3.272-.457 37.876-24.755 43.863-28.964 6.064.856 12.297 1.302 18.652 1.302 57.438 0 104-36.713 104-82S185.438 36 128 36z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#ffffff"
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </svg>
  );
}

function translate(msg: string): string {
  if (isRateLimitError(msg)) {
    return '요청이 잠시 많았습니다. 1분 후 다시 시도해 주세요.';
  }

  const map: Record<string, string> = {
    'Invalid login credentials': '이메일 또는 비밀번호가 일치하지 않습니다.',
    'Email not confirmed': '이메일 인증이 완료되지 않았습니다. 메일함을 확인해 주세요.',
    'User already registered': '이미 가입된 이메일입니다. 로그인해 주세요.',
    'Password should be at least 6 characters': '비밀번호는 6자 이상이어야 합니다.',
    'Unable to validate email address: invalid format': '이메일 형식이 올바르지 않습니다.',
    'Supabase not configured': '서버 설정이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.',
    'Signups not allowed for this instance': '회원가입이 비활성화 되어있습니다.',
  };
  return map[msg] ?? msg;
}

function isRateLimitError(msg: string): boolean {
  const normalized = msg.toLowerCase();
  return normalized.includes('rate limit') || normalized.includes('too many');
}
