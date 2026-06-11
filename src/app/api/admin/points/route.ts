/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 }) };
  return { sb, user };
}

export async function GET() {
  const check = await requireAdmin();
  if (check.error) return check.error;

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('point_history')
    .select(`id, user_id, type, description, amount, created_at,
             user:profiles!point_history_user_id_fkey (name)`)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const history = (data ?? []).map((h: any) => ({
    id: h.id,
    user_id: h.user_id,
    user_name: h.user?.name ?? '(탈퇴회원)',
    type: h.type,
    description: h.description,
    amount: h.amount,
    created_at: h.created_at,
  }));

  const totalEarned = history.filter((h) => h.type === 'earn').reduce((s, h) => s + h.amount, 0);
  const totalUsed = history.filter((h) => h.type === 'use').reduce((s, h) => s + h.amount, 0);

  return NextResponse.json({
    history,
    stats: {
      total_earned: totalEarned,
      total_used: totalUsed,
      outstanding: totalEarned - totalUsed,
    },
  });
}
