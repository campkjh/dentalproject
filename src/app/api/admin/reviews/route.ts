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
    .from('reviews')
    .select(
      `id, rating, content, treatment_name, total_cost, hidden, created_at,
       author:profiles!reviews_author_id_fkey (name),
       hospital:hospitals (name),
       product:products (title)`
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const reviews = (data ?? []).map((r: any) => ({
    id: r.id,
    rating: Number(r.rating ?? 0),
    content: r.content,
    treatment_name: r.treatment_name ?? '-',
    total_cost: r.total_cost ?? 0,
    hidden: !!r.hidden,
    created_at: r.created_at,
    author: r.author?.name ?? '(탈퇴회원)',
    hospital: r.hospital?.name ?? '-',
    product: r.product?.title ?? '-',
  }));

  return NextResponse.json({ reviews });
}

export async function PATCH(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const ids: string[] = Array.isArray(body.ids)
    ? body.ids.filter((v: unknown): v is string => typeof v === 'string')
    : typeof body.id === 'string'
      ? [body.id]
      : [];
  const action = body.action;
  if (!ids.length || (action !== 'hide' && action !== 'show')) {
    return NextResponse.json({ error: '리뷰 ID와 처리 액션이 필요합니다.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { error } = await admin.from('reviews').update({ hidden: action === 'hide' }).in('id', ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, count: ids.length });
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
  if (!ids.length) return NextResponse.json({ error: '리뷰 ID가 필요합니다.' }, { status: 400 });

  const admin = await createAdminClient();
  const { error } = await admin.from('reviews').delete().in('id', ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, count: ids.length });
}
