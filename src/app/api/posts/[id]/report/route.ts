/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const VALID_REASONS = new Set([
  '부적절한 의료 정보',
  '불법 광고/스팸',
  '욕설/비방',
  '허위/사기 정보',
  '저작권 침해',
  '기타',
]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason || (!VALID_REASONS.has(reason) && reason.length > 100)) {
    return NextResponse.json({ error: '신고 사유가 올바르지 않습니다.' }, { status: 400 });
  }

  const { error } = await sb
    .from('post_reports')
    .insert({ post_id: id, reporter_id: user.id, reason });

  if (error) {
    const text = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
    if (text.includes('post_reports') && (text.includes('does not exist') || text.includes('relation'))) {
      return NextResponse.json({ error: '신고 기능이 아직 활성화되지 않았습니다.' }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
