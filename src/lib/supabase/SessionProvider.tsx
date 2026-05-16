'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient, hasSupabaseEnv } from './client';
import { useStore } from '@/store';

type Ctx = {
  session: Session | null;
  authUser: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null; isDoctor?: boolean }>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signInWithOAuth: (provider: 'kakao' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const storeLogin = useStore((s) => s.login);
  const storeLogout = useStore((s) => s.logout);
  const hydrateCatalog = useStore((s) => s.hydrateCatalog);
  const hydrateMe = useStore((s) => s.hydrateMe);
  const resetMe = useStore((s) => s.resetMe);

  const supabase = useMemo(() => (hasSupabaseEnv() ? createClient() : null), []);

  // Load real catalog data once, regardless of auth state
  useEffect(() => {
    hydrateCatalog();
  }, [hydrateCatalog]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        // Profile + me data in parallel (not sequential)
        await Promise.all([
          hydrateProfile(data.session.user.id),
          hydrateMe(),
        ]);
      }
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        setLoading(true);
        await Promise.all([
          hydrateProfile(s.user.id),
          hydrateMe(),
        ]);
        if (mounted) setLoading(false);
      } else {
        storeLogout();
        resetMe();
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };

    async function hydrateProfile(userId: string) {
      if (!supabase) return;
      const [profileRes, hospitalRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('hospitals').select('id').eq('owner_id', userId).limit(1).maybeSingle(),
      ]);

      let p = profileRes.data as Record<string, unknown> | null;

      // Auto-create profile if missing (trigger may not have fired for old accounts)
      if (!p) {
        await supabase.from('profiles').upsert({
          id: userId,
          name: '',
          login_type: 'email',
          country: '대한민국',
        });
        const { data: created } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        p = (created as Record<string, unknown> | null) ?? { id: userId };
      }

      const loginType = (p.login_type as 'kakao' | 'apple') ?? 'kakao';
      const hasHospitalAccess = Boolean(p.is_doctor) || Boolean(hospitalRes.data);
      // Always set isLoggedIn=true if we have a session, regardless of profile completeness
      useStore.setState({
        isLoggedIn: true,
        user: {
          id: userId,
          name: (p.name as string) ?? '',
          phone: (p.phone as string) ?? '',
          loginType,
          gender: (p.gender as string) ?? undefined,
          birthYear: (p.birth_year as string) ?? undefined,
          country: (p.country as string) ?? '대한민국',
          profileImage: (p.profile_image as string) ?? undefined,
          points: (p.points as number) ?? 0,
          coupons: [],
          isDoctor: hasHospitalAccess,
        },
        isDoctor: hasHospitalAccess,
      });
    }
  }, [supabase, storeLogout, hydrateMe, resetMe]);

  const value: Ctx = {
    session,
    authUser: session?.user ?? null,
    loading,
    async signInWithEmail(email, password) {
      if (!supabase) return { error: 'Supabase not configured' };
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      const [profileRes, hospitalRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('name, phone, login_type, gender, birth_year, country, profile_image, points, is_doctor')
          .eq('id', data.user.id)
          .maybeSingle(),
        supabase.from('hospitals').select('id').eq('owner_id', data.user.id).limit(1).maybeSingle(),
      ]);
      const profile = profileRes.data;
      const hasHospitalAccess = Boolean(profile?.is_doctor) || Boolean(hospitalRes.data);
      const currentUser = useStore.getState().user;
      useStore.setState({
        isLoggedIn: true,
        isDoctor: hasHospitalAccess,
        user: currentUser
          ? { ...currentUser, isDoctor: hasHospitalAccess }
          : {
              id: data.user.id,
              name: profile?.name ?? data.user.user_metadata?.name ?? '',
              phone: profile?.phone ?? '',
              loginType: ((profile?.login_type as 'kakao' | 'apple') ?? 'kakao'),
              gender: profile?.gender ?? undefined,
              birthYear: profile?.birth_year ?? undefined,
              country: profile?.country ?? '대한민국',
              profileImage: profile?.profile_image ?? undefined,
              points: profile?.points ?? 0,
              coupons: [],
              isDoctor: hasHospitalAccess,
            },
      });
      return {
        error: null,
        isDoctor: hasHospitalAccess,
      };
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

      const { error } = await supabase.auth.signInWithPassword({ email, password });
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
      if (supabase) await supabase.auth.signOut();
      storeLogout();
    },
  };

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
