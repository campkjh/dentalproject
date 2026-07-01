'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';

type Mode = 'login' | 'signup';

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
  const { signInWithEmail, signUpWithEmail, signInWithOAuth } = useSession();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState(0);
  const [socialPending, setSocialPending] = useState<'kakao' | 'apple' | null>(null);

  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const isDoctor = useStore((s) => s.isDoctor);
  const isAdmin = useStore((s) => s.isAdmin);
  useEffect(() => {
    if (isLoggedIn) router.replace(isAdmin ? '/admin' : isDoctor ? '/partner' : '/');
  }, [isLoggedIn, isDoctor, isAdmin, router]);

  const isLogin = mode === 'login';
  const canSubmit =
    email.trim().length > 3 &&
    password.length >= 6 &&
    (isLogin || name.trim().length >= 2) &&
    !pending &&
    retryAfter === 0;

  useEffect(() => {
    if (retryAfter <= 0) return;
    const id = window.setInterval(() => {
      setRetryAfter((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [retryAfter]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (isLogin) {
        const { error, isDoctor, isAdmin } = await signInWithEmail(email.trim(), password);
        if (error) {
          setError(translate(error));
          if (isRateLimitError(error)) setRetryAfter(60);
          return;
        }
        router.replace(isAdmin ? '/admin' : isDoctor ? '/partner' : '/');
      } else {
        const { error, needsConfirm } = await signUpWithEmail(
          email.trim(),
          password,
          name.trim()
        );
        if (error) {
          setError(translate(error));
          if (isRateLimitError(error)) setRetryAfter(60);
          return;
        }
        if (needsConfirm) {
          setSuccessMsg('인증 메일을 발송했습니다. 이메일을 확인해 주세요.');
        } else {
          router.replace('/');
        }
      }
    } finally {
      setPending(false);
    }
  };

  const onSocial = async (provider: 'kakao' | 'apple') => {
    if (socialPending || pending) return;
    setSocialPending(provider);
    setError(null);
    setSuccessMsg(null);

    // 네이티브 앱(WebView)에선 카카오톡 앱-투-앱 네이티브 로그인을 사용한다.
    // - Android: window.AndroidKakao.login()
    // - iOS:     window.webkit.messageHandlers.kakaoLogin.postMessage({})
    // 네이티브가 로그인 후 onKakaoNativeLogin(id_token)을 호출 →
    // SessionProvider가 Supabase 세션 생성 → isLoggedIn 효과가 자동 리다이렉트.
    if (provider === 'kakao' && typeof window !== 'undefined') {
      const w = window as Window & {
        AndroidKakao?: { login?: () => void };
        webkit?: {
          messageHandlers?: { kakaoLogin?: { postMessage: (msg: unknown) => void } };
        };
        onKakaoNativeLoginError?: (message: string) => void;
      };
      const androidKakao = w.AndroidKakao;
      const iosKakao = w.webkit?.messageHandlers?.kakaoLogin;
      if (androidKakao?.login || iosKakao) {
        w.onKakaoNativeLoginError = (message: string) => {
          setError(message || '카카오 로그인에 실패했습니다.');
          setSocialPending(null);
        };
        try {
          if (androidKakao?.login) androidKakao.login();
          else iosKakao!.postMessage({});
        } catch {
          setError('카카오 로그인을 시작하지 못했습니다.');
          setSocialPending(null);
        }
        return;
      }
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

  return (
    <div className="min-h-screen bg-white max-w-[500px] mx-auto flex flex-col">
      {/* Back button */}
      <div className="px-2 pt-3">
        <button onClick={() => router.back()} className="p-1.5 -ml-0.5 rounded-full hover:bg-gray-100 transition-colors">
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
      </div>

      {/* Logo & Title */}
      <div className="pt-6 pb-8 flex flex-col items-center px-6">
        <div className="w-20 h-20 bg-[#8037FF] rounded-2xl flex items-center justify-center mb-5 bounce-in">
          <span className="text-4xl">🦷</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1.5 fade-in-up">마이닥</h1>
        <p className="text-[13px] text-gray-500 text-center fade-in-up-delay-1">
          쉽고 빠르게 나에게 맞는 병원을 찾아보세요
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="px-6 mb-5">
        <div className="relative flex bg-gray-100 rounded-xl p-1">
          <span
            aria-hidden
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm pointer-events-none"
            style={{
              left: isLogin ? 4 : 'calc(50% + 0px)',
              transition: 'left 320ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
          {(['login', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
                setSuccessMsg(null);
                setRetryAfter(0);
              }}
              className="relative z-10 flex-1 py-2 text-[13px] font-bold"
              style={{
                color: mode === m ? '#8037FF' : '#9CA3AF',
                transition: 'color 320ms ease',
              }}
            >
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="px-6 flex flex-col gap-3 fade-in-up-delay-2">
        {!isLogin && (
          <Field
            icon={<UserIcon size={16} className="text-gray-400" />}
            type="text"
            placeholder="이름"
            value={name}
            onChange={(v) => setName(v.slice(0, 12))}
          />
        )}
        <Field
          icon={<Mail size={16} className="text-gray-400" />}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="이메일"
          value={email}
          onChange={setEmail}
        />
        <Field
          icon={<Lock size={16} className="text-gray-400" />}
          type={showPwd ? 'text' : 'password'}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          placeholder={isLogin ? '비밀번호' : '비밀번호 (6자 이상)'}
          value={password}
          onChange={setPassword}
          right={
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="text-gray-400 p-1"
              aria-label={showPwd ? '비밀번호 숨기기' : '비밀번호 표시'}
            >
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />

        {error && (
          <p className="text-[12px] text-red-500 -mt-1 fade-in-up">{error}</p>
        )}
        {successMsg && (
          <div className="rounded-xl bg-[#F4EFFF] border border-[#E0D4FF] px-3.5 py-3 fade-in-up">
            <p className="text-[12.5px] text-[#5B2BB5] font-medium leading-relaxed">
              {successMsg}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-2 w-full py-3.5 rounded-xl font-bold text-[14px] btn-press"
          style={{
            backgroundColor: canSubmit ? '#8037FF' : '#E5E7EB',
            color: canSubmit ? '#fff' : '#A4ABBA',
            boxShadow: canSubmit ? '0 6px 16px rgba(49,130,246,0.25)' : 'none',
            transition: 'background-color 200ms ease',
          }}
        >
          {pending
            ? isLogin ? '로그인 중…' : '가입 처리 중…'
            : retryAfter > 0
              ? `잠시 후 재시도 (${retryAfter}s)`
              : isLogin ? '로그인' : '회원가입'}
        </button>

        {isLogin && (
          <button
            type="button"
            onClick={() => setMode('signup')}
            className="text-[12px] text-gray-500 mt-1 mx-auto"
          >
            아직 회원이 아니신가요? <span className="text-[#8037FF] font-bold">회원가입</span>
          </button>
        )}

        <p className="text-[11px] text-center text-gray-400 mt-2 leading-relaxed">
          {isLogin
            ? '로그인 시'
            : '회원가입 시'}{' '}
          <span className="underline">이용약관</span> 및{' '}
          <span className="underline">개인정보처리방침</span>에 동의합니다.
        </p>
      </form>

      {/* 간편 로그인 */}
      <div className="px-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex-1 h-px bg-gray-100" />
          <span className="text-[11px] text-gray-400">간편 로그인</span>
          <span className="flex-1 h-px bg-gray-100" />
        </div>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => onSocial('kakao')}
            disabled={socialPending !== null || pending}
            className="w-full py-3.5 rounded-xl font-bold text-[14px] btn-press flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: '#FEE500', color: '#191600' }}
          >
            <KakaoIcon />
            {socialPending === 'kakao' ? '카카오로 이동 중…' : `카카오로 ${isLogin ? '로그인' : '시작하기'}`}
          </button>
          <button
            type="button"
            onClick={() => onSocial('apple')}
            disabled={socialPending !== null || pending}
            className="w-full py-3.5 rounded-xl font-bold text-[14px] btn-press flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: '#000000', color: '#ffffff' }}
          >
            <AppleIcon />
            {socialPending === 'apple' ? 'Apple로 이동 중…' : `Apple로 ${isLogin ? '로그인' : '시작하기'}`}
          </button>
        </div>
      </div>

      <div className="flex-1" />
    </div>
  );
}

function Field({
  icon,
  right,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  icon?: React.ReactNode;
  right?: React.ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative flex items-center bg-gray-50 rounded-xl px-3.5 h-12 focus-within:bg-[#F4EFFF] focus-within:ring-1 focus-within:ring-[#D1C2FF] transition-colors">
      {icon && <span className="mr-2.5 flex-shrink-0">{icon}</span>}
      <input
        {...props}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-gray-400"
      />
      {right}
    </label>
  );
}

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
