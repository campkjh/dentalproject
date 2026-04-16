import { createClient } from '@/lib/supabase/server';

export async function getCurrentUser() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return { auth: user, profile };
}

export async function getMyCoupons(userId: string) {
  const sb = await createClient();
  const { data } = await sb
    .from('coupons')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getMyPointHistory(userId: string) {
  const sb = await createClient();
  const { data } = await sb
    .from('point_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getMyNotifications(userId: string) {
  const sb = await createClient();
  const { data } = await sb
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
}
