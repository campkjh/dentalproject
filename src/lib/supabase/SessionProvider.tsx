'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { usePathname } from 'next/navigation';
import { createClient, hasSupabaseEnv } from './client';
import { useStore } from '@/store';
import { clearMyHospitalCache } from '@/lib/partner/my-hospital-cache';
import { pickCustomerProfileAvatarBySeed } from '@/lib/customer-profile-avatars';

type Ctx = {
  session: Session | null;
  authUser: SupabaseUser | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null; isDoctor?: boolean; isAdmin?: boolean }>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signInWithOAuth: (provider: 'kakao' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionCtx = createContext<Ctx | null>(null);
const AUTH_SYNC_TIMEOUT_MS = 12_000;
const AUTH_RECHECK_INTERVAL_MS = 4 * 60 * 1000;
const HOSPITAL_ROLE_CACHE_PREFIX = 'kidoctor:hospital-role:';

function readCachedHospitalAccess(userId: string) {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(`${HOSPITAL_ROLE_CACHE_PREFIX}${userId}`);
    if (value === 'true') return true;
    if (value === 'false') return false;
  } catch {
    // Storage can be unavailable in private modes.
  }
  return null;
}

function writeCachedHospitalAccess(userId: string, hasAccess: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${HOSPITAL_ROLE_CACHE_PREFIX}${userId}`, String(hasAccess));
  } catch {
    // Non-critical cache only.
  }
}

function clearCachedHospitalAccess(userId?: string) {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${HOSPITAL_ROLE_CACHE_PREFIX}${userId}`);
  } catch {
    // Non-critical cache only.
  }
}

function withTimeout<T>(promise: Promise<T>, fallback: T, ms = AUTH_SYNC_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function shouldClearSession(error: unknown) {
  const status = (error as { status?: number } | null)?.status;
  const message = String((error as { message?: string } | null)?.message ?? '').toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    message.includes('auth session missing') ||
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found') ||
    message.includes('jwt expired')
  );
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => hasSupabaseEnv());
  const mountedRef = useRef(false);
  const sessionRef = useRef<Session | null>(null);
  const syncSeqRef = useRef(0);
  const recoveryPromiseRef = useRef<Promise<{ isDoctor: boolean; isAdmin: boolean }> | null>(null);
  const storeLogin = useStore((s) => s.login);
  const storeLogout = useStore((s) => s.logout);
  const hydrateCatalog = useStore((s) => s.hydrateCatalog);
  const hydrateMe = useStore((s) => s.hydrateMe);
  const resetMe = useStore((s) => s.resetMe);

  const supabase = useMemo(() => (hasSupabaseEnv() ? createClient() : null), []);

  const hydrateProfile = useCallback(async (authUser: SupabaseUser): Promise<{ hasHospitalAccess: boolean; isAdmin: boolean }> => {
    if (!supabase) return { hasHospitalAccess: false, isAdmin: false };
    const userId = authUser.id;
    const [profileRes, hospitalRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('hospitals').select('id').eq('owner_id', userId).limit(1).maybeSingle(),
    ]);

    let p = profileRes.error ? null : profileRes.data as Record<string, unknown> | null;
    const hospitalQuerySucceeded = !hospitalRes.error;

    // Auto-create profile if missing (trigger may not have fired for old accounts)
    if (!p && !profileRes.error) {
      await supabase.from('profiles').upsert({
        id: userId,
        name: authUser.user_metadata?.name ?? '',
        login_type: 'email',
        country: '대한민국',
        profile_image: pickCustomerProfileAvatarBySeed(userId),
      });
      const { data: created } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      p = (created as Record<string, unknown> | null) ?? { id: userId };
    }

    const loginType = (p?.login_type as 'kakao' | 'apple' | undefined) ?? 'kakao';
    const profileIsDoctor = p ? Boolean(p.is_doctor) : null;
    const isAdmin = p ? Boolean(p.is_admin) : false;
    const hasHospital = hospitalQuerySucceeded ? Boolean(hospitalRes.data) : null;
    const cachedHospitalAccess = readCachedHospitalAccess(userId);
    const hasHospitalAccess =
      profileIsDoctor === true || hasHospital === true
        ? true
        : profileIsDoctor === false && hasHospital === false
          ? false
          : cachedHospitalAccess ?? false;

    if (p && !p.profile_image && !hasHospitalAccess) {
      const profileImage = pickCustomerProfileAvatarBySeed(userId);
      await supabase.from('profiles').update({ profile_image: profileImage }).eq('id', userId);
      p = { ...p, profile_image: profileImage };
    }

    if (profileIsDoctor !== null && hasHospital !== null) {
      writeCachedHospitalAccess(userId, hasHospitalAccess);
    }

    // Always set isLoggedIn=true if we have a session, regardless of profile completeness
    useStore.setState({
      isLoggedIn: true,
      user: {
        id: userId,
        name: (p?.name as string | undefined) ?? authUser.user_metadata?.name ?? authUser.email ?? '',
        phone: (p?.phone as string | undefined) ?? '',
        loginType,
        gender: (p?.gender as string | undefined) ?? undefined,
        birthYear: (p?.birth_year as string | undefined) ?? undefined,
        country: (p?.country as string | undefined) ?? '대한민국',
        profileImage: (p?.profile_image as string | undefined) ?? undefined,
        points: (p?.points as number | undefined) ?? 0,
        coupons: [],
        isDoctor: hasHospitalAccess,
      },
      isDoctor: hasHospitalAccess,
      isAdmin,
    });
    return { hasHospitalAccess, isAdmin };
  }, [supabase]);

  const syncSession = useCallback(async (
    nextSession: Session | null,
    options: { showLoading?: boolean; hydrateUserData?: boolean } = {}
  ) => {
    const { showLoading = true, hydrateUserData = true } = options;
    const syncId = ++syncSeqRef.current;

    sessionRef.current = nextSession;
    setSession(nextSession);

    if (!nextSession?.user) {
      clearMyHospitalCache();
      storeLogout();
      resetMe();
      if (mountedRef.current && syncId === syncSeqRef.current) setLoading(false);
      return { isDoctor: false, isAdmin: false };
    }

    if (showLoading) setLoading(true);

    const fallbackHospitalAccess = readCachedHospitalAccess(nextSession.user.id) ?? false;
    const result = await withTimeout(
      hydrateProfile(nextSession.user).catch(() => ({ hasHospitalAccess: fallbackHospitalAccess, isAdmin: false })),
      { hasHospitalAccess: fallbackHospitalAccess, isAdmin: false }
    );

    if (hydrateUserData) {
      await withTimeout(
        hydrateMe().catch(() => undefined),
        undefined
      );
    }

    if (mountedRef.current && syncId === syncSeqRef.current) setLoading(false);
    return { isDoctor: result.hasHospitalAccess, isAdmin: result.isAdmin };
  }, [hydrateMe, hydrateProfile, resetMe, storeLogout]);

  const recoverSession = useCallback(async (options: { showLoading?: boolean; hydrateUserData?: boolean } = {}) => {
    if (recoveryPromiseRef.current) return recoveryPromiseRef.current;
    if (!supabase) {
      setLoading(false);
      return { isDoctor: false, isAdmin: false };
    }

    const recoveryPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        return syncSession(null, options);
      }

      const verifiedUser = await withTimeout(
        supabase.auth.getUser().catch(() => null),
        null
      );

      if (verifiedUser?.data.user) {
        return syncSession(
          { ...data.session, user: verifiedUser.data.user },
          { showLoading: options.showLoading, hydrateUserData: options.hydrateUserData }
        );
      }

      if (
        verifiedUser?.error &&
        shouldClearSession(verifiedUser.error) &&
        typeof navigator !== 'undefined' &&
        navigator.onLine !== false
      ) {
        return syncSession(null, options);
      }

      return syncSession(data.session, { showLoading: options.showLoading, hydrateUserData: options.hydrateUserData });
    })();

    recoveryPromiseRef.current = recoveryPromise;
    try {
      return await recoveryPromise;
    } catch {
      setLoading(false);
      return { isDoctor: false, isAdmin: false };
    } finally {
      if (recoveryPromiseRef.current === recoveryPromise) {
        recoveryPromiseRef.current = null;
      }
    }
  }, [supabase, syncSession]);

  // Load customer catalog only where it is actually used.
  useEffect(() => {
    if (pathname?.startsWith('/partner') || pathname?.startsWith('/admin')) return;
    hydrateCatalog();
  }, [hydrateCatalog, pathname]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      syncSeqRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    const initialRecoverTimer = window.setTimeout(() => {
      if (mounted) void recoverSession({ showLoading: true, hydrateUserData: true });
    }, 0);

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return;
      window.setTimeout(() => {
        const hasExistingSession = Boolean(sessionRef.current?.user);
        if (mounted) void syncSession(s, { showLoading: !hasExistingSession });
      }, 0);
    });

    const recheckSession = () => {
      if (!mounted) return;
      void recoverSession({ showLoading: false, hydrateUserData: false });
    };

    const recheckVisibleSession = () => {
      if (document.visibilityState === 'visible') recheckSession();
    };

    window.addEventListener('focus', recheckSession);
    window.addEventListener('online', recheckSession);
    document.addEventListener('visibilitychange', recheckVisibleSession);
    const recheckTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') recheckSession();
    }, AUTH_RECHECK_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearTimeout(initialRecoverTimer);
      sub.subscription.unsubscribe();
      window.removeEventListener('focus', recheckSession);
      window.removeEventListener('online', recheckSession);
      document.removeEventListener('visibilitychange', recheckVisibleSession);
      window.clearInterval(recheckTimer);
    };

  }, [supabase, recoverSession, syncSession]);

  // 네이티브 카카오 SDK 로그인 브리지 — 안드로이드 WebView 앱이 카카오톡 앱-투-앱
  // 로그인으로 받은 OIDC id_token을 window.onKakaoNativeLogin(idToken)으로 넘기면,
  // 그 토큰으로 Supabase 세션을 만든다. (일반 브라우저에선 호출되지 않음.)
  // 성공하면 onAuthStateChange(SIGNED_IN)가 세션을 동기화하고 로그인 페이지가 리다이렉트한다.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as Window & {
      onKakaoNativeLogin?: (idToken: string) => void;
      onKakaoNativeLoginError?: (message: string) => void;
    };
    w.onKakaoNativeLogin = (idToken: string) => {
      void (async () => {
        if (!supabase) {
          w.onKakaoNativeLoginError?.('로그인을 사용할 수 없습니다.');
          return;
        }
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'kakao',
          token: idToken,
        });
        if (error) w.onKakaoNativeLoginError?.(error.message);
      })();
    };
    return () => {
      delete w.onKakaoNativeLogin;
    };
  }, [supabase]);

  // 네이티브 애플 로그인 브리지 — iOS WebView 앱이 Sign in with Apple로 받은
  // identity token(+nonce)을 window.onAppleNativeLogin(idToken, nonce, name?)으로 넘기면,
  // 그 토큰으로 Supabase 세션을 만든다. 애플은 이름을 최초 1회만 주므로 있으면 저장.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as Window & {
      onAppleNativeLogin?: (idToken: string, nonce?: string, name?: string) => void;
      onAppleNativeLoginError?: (message: string) => void;
    };
    w.onAppleNativeLogin = (idToken: string, nonce?: string, name?: string) => {
      void (async () => {
        if (!supabase) {
          w.onAppleNativeLoginError?.('로그인을 사용할 수 없습니다.');
          return;
        }
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: idToken,
          ...(nonce ? { nonce } : {}),
        });
        if (error) {
          w.onAppleNativeLoginError?.(error.message);
          return;
        }
        // 애플 이름은 최초 인증 시에만 제공됨. id_token엔 이름이 없어 프로필 트리거가
        // 빈 이름으로 행을 만든다 → 이름이 오면 auth 메타 + profiles.name 둘 다 채운다(best-effort).
        const trimmed = name?.trim();
        const userId = data.user?.id;
        if (trimmed && userId) {
          try {
            await supabase.auth.updateUser({ data: { name: trimmed, full_name: trimmed } });
            await supabase.from('profiles').update({ name: trimmed }).eq('id', userId);
          } catch {
            /* 이름 저장 실패가 로그인 자체를 막지는 않는다 */
          }
        }
      })();
    };
    return () => {
      delete w.onAppleNativeLogin;
    };
  }, [supabase]);

  const value: Ctx = {
    session,
    authUser: session?.user ?? null,
    loading,
    async signInWithEmail(email, password) {
      if (!supabase) return { error: 'Supabase not configured' };
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setLoading(false);
          return { error: error.message };
        }
        const { isDoctor, isAdmin } = await syncSession(data.session, { showLoading: true });
        return {
          error: null,
          isDoctor,
          isAdmin,
        };
      } catch (error) {
        setLoading(false);
        return { error: error instanceof Error ? error.message : '로그인에 실패했습니다.' };
      }
    },
    async signUpWithEmail(email, password, name) {
      if (!supabase) return { error: 'Supabase not configured', needsConfirm: false };
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return { error: payload.error ?? '회원가입에 실패했습니다.', needsConfirm: false };

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.session) {
        await syncSession(data.session, { showLoading: true });
      }
      return { error: error?.message ?? null, needsConfirm: false };
    },
    async signInWithOAuth(provider) {
      if (!supabase) {
        storeLogin(provider);
        return;
      }
      const redirectTo = `${
        process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
      }/auth/callback`;
      await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    },
    async signOut() {
      const currentUserId = session?.user.id;
      if (supabase) await supabase.auth.signOut();
      clearCachedHospitalAccess(currentUserId);
      clearMyHospitalCache(currentUserId);
      setSession(null);
      sessionRef.current = null;
      storeLogout();
      resetMe();
      setLoading(false);
    },
  };

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
