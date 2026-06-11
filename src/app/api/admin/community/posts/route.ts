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
    .from('posts')
    .select(
      `id, board_type, title, content, view_count, like_count, comment_count, created_at, is_anonymous, anonymous_id,
       author:profiles!posts_author_id_fkey (name)`
    )
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const posts = (data ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    board_type: p.board_type,
    author: p.is_anonymous ? `익명${p.anonymous_id ? `_${p.anonymous_id}` : ''}` : p.author?.name ?? '(탈퇴회원)',
    views: p.view_count ?? 0,
    comments: p.comment_count ?? 0,
    likes: p.like_count ?? 0,
    created_at: p.created_at,
  }));

  return NextResponse.json({ posts });
}

export async function DELETE(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const ids: string[] = Array.isArray(body.ids)
    ? body.ids.filter((v: unknown): v is string => typeof v === 'string')
    : typeof body.id === 'string'
      ? [body.id]
      : [];
  if (!ids.length) return NextResponse.json({ error: '게시글 ID가 필요합니다.' }, { status: 400 });

  const admin = await createAdminClient();
  const { error } = await admin.from('posts').delete().in('id', ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, count: ids.length });
}
