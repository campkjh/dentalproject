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
    .from('announcements')
    .select('id, title, content, published_at, created_at')
    .order('published_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ announcements: data ?? [] });
}

export async function POST(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const publishedAt = typeof body.published_at === 'string' && body.published_at ? body.published_at : null;
  if (!title) return NextResponse.json({ error: '제목은 필수입니다.' }, { status: 400 });

  const admin = await createAdminClient();
  const payload: Record<string, any> = { title, content: content || null };
  if (publishedAt) payload.published_at = publishedAt;
  const { data, error } = await admin
    .from('announcements')
    .insert(payload)
    .select('id, title, content, published_at, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ announcement: data });
}

export async function PATCH(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });

  const patch: Record<string, any> = {};
  if (typeof body.title === 'string') patch.title = body.title.trim();
  if (typeof body.content === 'string') patch.content = body.content;
  if (typeof body.published_at === 'string') patch.published_at = body.published_at;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '변경할 내용이 없습니다.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('announcements')
    .update(patch)
    .eq('id', id)
    .select('id, title, content, published_at, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ announcement: data });
}

export async function DELETE(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });

  const admin = await createAdminClient();
  const { error } = await admin.from('announcements').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
