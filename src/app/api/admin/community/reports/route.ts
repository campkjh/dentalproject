/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function isMissingReportsTable(error: { message?: string; details?: string | null; hint?: string | null } | null) {
  if (!error) return false;
  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return text.includes('post_reports') && (text.includes('does not exist') || text.includes('not found') || text.includes('relation'));
}

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
    .from('post_reports')
    .select(
      `id, post_id, reporter_id, reason, status, resolution, resolved_at, created_at,
       post:posts (title, board_type),
       reporter:profiles!post_reports_reporter_id_fkey (name)`
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    if (isMissingReportsTable(error)) {
      return NextResponse.json({ reports: [], migration_required: true });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const reports = (data ?? []).map((r: any) => ({
    id: r.id,
    post_id: r.post_id,
    post_title: r.post?.title ?? '(삭제된 게시글)',
    post_board: r.post?.board_type ?? null,
    reporter: r.reporter?.name ?? '익명',
    reason: r.reason,
    status: r.status,
    resolution: r.resolution,
    resolved_at: r.resolved_at,
    created_at: r.created_at,
  }));

  return NextResponse.json({ reports });
}

export async function PATCH(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const id = typeof body.id === 'string' ? body.id : '';
  const action = body.action;
  const resolution = typeof body.resolution === 'string' ? body.resolution : null;

  if (!id || (action !== 'resolve' && action !== 'reject')) {
    return NextResponse.json({ error: '신고 ID와 처리 액션이 필요합니다.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const userId = check.user?.id ?? null;
  const { error } = await admin
    .from('post_reports')
    .update({
      status: action === 'resolve' ? 'resolved' : 'rejected',
      resolution,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    if (isMissingReportsTable(error)) {
      return NextResponse.json({ error: 'post_reports 테이블이 없습니다. 마이그레이션 0012를 먼저 적용해주세요.' }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
