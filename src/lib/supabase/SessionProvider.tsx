'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient, hasSupabaseEnv } from './client';
import { useStore } from '@/store';

type Ctx = {
  session: Session | null;
  authUser: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
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
      setLoading(false);
      if (data.session?.user) {
        await hydrateProfile(data.session.user.id);
        await hydrateMe();
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user) {
        await hydrateProfile(s.user.id);
        await hydrateMe();
      } else {
        storeLogout();
        resetMe();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };

    async function hydrateProfile(userId: string) {
      if (!supabase) return;
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      let p = existing as Record<string, unknown> | null;

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
          isDoctor: (p.is_doctor as boolean) ?? false,
        },
        isDoctor: (p.is_doctor as boolean) ?? false,
      });
    }
  }, [supabase, storeLogout, hydrateMe, resetMe]);

  const value: Ctx = {
    session,
    authUser: session?.user ?? null,
    loading,
    async signInWithEmail(email, password) {
      if (!supabase) return { error: 'Supabase not configured' };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    async signUpWithEmail(email, password, name) {
      if (!supabase) return { error: 'Supabase not configured', needsConfirm: false };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name ?? '' },
          emailRedirectTo: `${
            process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
          }/auth/callback`,
        },
      });
      // session === null when email confirmation is required
      const needsConfirm = !error && !data.session;
      return { error: error?.message ?? null, needsConfirm };
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
