/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
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
    .from('coupons')
    .select(
      `id, user_id, name, description, discount_amount, expiry_date, status, used_at, created_at,
       user:profiles!coupons_user_id_fkey (name)`
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const coupons = (data ?? []).map((c: any) => ({
    id: c.id,
    user_id: c.user_id,
    user_name: c.user?.name ?? '(탈퇴회원)',
    name: c.name,
    description: c.description,
    discount_amount: c.discount_amount,
    expiry_date: c.expiry_date,
    status: c.status,
    used_at: c.used_at,
    created_at: c.created_at,
  }));

  const stats = {
    total: coupons.length,
    available: coupons.filter((c) => c.status === 'available').length,
    used: coupons.filter((c) => c.status === 'used').length,
    expired: coupons.filter((c) => c.status === 'expired').length,
  };

  return NextResponse.json({ coupons, stats });
}

export async function POST(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const discountAmount = Number.isFinite(Number(body.discount_amount)) ? Number(body.discount_amount) : 0;
  const expiryDate = typeof body.expiry_date === 'string' && body.expiry_date ? body.expiry_date : null;
  const target: 'user' | 'all' = body.target === 'all' ? 'all' : 'user';
  const userId = typeof body.user_id === 'string' ? body.user_id : null;

  if (!name || !discountAmount || discountAmount <= 0) {
    return NextResponse.json({ error: '쿠폰명과 0보다 큰 할인 금액이 필요합니다.' }, { status: 400 });
  }

  const admin = await createAdminClient();

  if (target === 'user') {
    if (!userId) return NextResponse.json({ error: '대상 회원 ID가 필요합니다.' }, { status: 400 });
    const { data, error } = await admin
      .from('coupons')
      .insert({ user_id: userId, name, description: description || null, discount_amount: discountAmount, expiry_date: expiryDate })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, count: 1, coupon_id: data?.id });
  }

  // target === 'all'
  const { data: users, error: usersError } = await admin.from('profiles').select('id');
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 400 });
  const rows = (users ?? []).map((u: any) => ({
    user_id: u.id,
    name,
    description: description || null,
    discount_amount: discountAmount,
    expiry_date: expiryDate,
  }));
  if (!rows.length) return NextResponse.json({ ok: true, count: 0 });
  const { error: insertError } = await admin.from('coupons').insert(rows);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
  return NextResponse.json({ ok: true, count: rows.length });
}

export async function DELETE(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: '쿠폰 ID가 필요합니다.' }, { status: 400 });
  const admin = await createAdminClient();
  const { error } = await admin.from('coupons').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
