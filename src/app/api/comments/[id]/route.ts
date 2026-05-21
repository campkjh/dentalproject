import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  // 본인 댓글인지 확인
  const { data: comment } = await sb.from('comments').select('author_id').eq('id', id).single();
  if (!comment) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });
  if (comment.author_id !== user.id) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  const { error } = await sb.from('comments').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
