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
    .from('categories')
    .select('id, name, icon, popular, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const icon = typeof body.icon === 'string' ? body.icon.trim() : null;
  const popular = !!body.popular;
  const sortOrder = Number.isFinite(body.sort_order) ? Number(body.sort_order) : 0;

  if (!id || !name) {
    return NextResponse.json({ error: 'ID와 이름은 필수입니다.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('categories')
    .insert({ id, name, icon: icon || null, popular, sort_order: sortOrder })
    .select('id, name, icon, popular, sort_order')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ category: data });
}

export async function PATCH(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return NextResponse.json({ error: '카테고리 ID가 필요합니다.' }, { status: 400 });

  const patch: Record<string, any> = {};
  if (typeof body.name === 'string') patch.name = body.name.trim();
  if (typeof body.icon === 'string') patch.icon = body.icon.trim() || null;
  if (typeof body.popular === 'boolean') patch.popular = body.popular;
  if (Number.isFinite(body.sort_order)) patch.sort_order = Number(body.sort_order);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '변경할 내용이 없습니다.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('categories')
    .update(patch)
    .eq('id', id)
    .select('id, name, icon, popular, sort_order')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ category: data });
}

export async function DELETE(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return NextResponse.json({ error: '카테고리 ID가 필요합니다.' }, { status: 400 });

  const admin = await createAdminClient();
  const { error } = await admin.from('categories').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
