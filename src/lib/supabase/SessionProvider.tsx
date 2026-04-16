'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient, hasSupabaseEnv } from './client';
import { useStore } from '@/store';

type Ctx = {
  session: Session | null;
  authUser: User | null;
  loading: boolean;
  signInWithOAuth: (provider: 'kakao' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const storeLogin = useStore((s) => s.login);
  const storeLogout = useStore((s) => s.logout);
  const updateUser = useStore((s) => s.updateUser);

  const supabase = useMemo(() => (hasSupabaseEnv() ? createClient() : null), []);

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
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user) {
        await hydrateProfile(s.user.id);
      } else {
        storeLogout();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };

    async function hydrateProfile(userId: string) {
      if (!supabase) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (!profile) return;
      const p = profile as Record<string, unknown>;
      storeLogin((p.login_type as 'kakao' | 'apple') ?? 'kakao');
      updateUser({
        id: userId,
        name: (p.name as string) ?? '',
        phone: (p.phone as string) ?? '',
        gender: (p.gender as string) ?? undefined,
        birthYear: (p.birth_year as string) ?? undefined,
        country: (p.country as string) ?? '대한민국',
        profileImage: (p.profile_image as string) ?? undefined,
        points: (p.points as number) ?? 0,
        isDoctor: (p.is_doctor as boolean) ?? false,
      });
    }
  }, [supabase, storeLogin, storeLogout, updateUser]);

  const value: Ctx = {
    session,
    authUser: session?.user ?? null,
    loading,
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
