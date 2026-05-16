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
  const { signInWithEmail, signUpWithEmail } = useSession();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState(0);

  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const isDoctor = useStore((s) => s.isDoctor);
  useEffect(() => {
    if (isLoggedIn) router.replace(isDoctor ? '/partner' : '/');
  }, [isLoggedIn, isDoctor, router]);

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
        const { error, isDoctor } = await signInWithEmail(email.trim(), password);
        if (error) {
          setError(translate(error));
          if (isRateLimitError(error)) setRetryAfter(60);
          return;
        }
        router.replace(isDoctor ? '/partner' : '/');
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

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto flex flex-col">
      {/* Back button */}
      <div className="px-2 pt-3">
        <button onClick={() => router.back()} className="p-1.5 -ml-0.5 rounded-full hover:bg-gray-100 transition-colors">
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
      </div>

      {/* Logo & Title */}
      <div className="pt-6 pb-8 flex flex-col items-center px-6">
        <div className="w-20 h-20 bg-[#3182F6] rounded-2xl flex items-center justify-center mb-5 bounce-in">
          <span className="text-4xl">🦷</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1.5 fade-in-up">키닥터</h1>
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
                color: mode === m ? '#3182F6' : '#9CA3AF',
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
            backgroundColor: canSubmit ? '#3182F6' : '#E5E7EB',
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
            아직 회원이 아니신가요? <span className="text-[#3182F6] font-bold">회원가입</span>
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
