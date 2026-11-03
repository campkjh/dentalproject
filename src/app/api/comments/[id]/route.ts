import { NextResponse } from 'next/server';
import { DELETE as deleteComment } from '@/app/api/posts/[id]/comments/route';
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
  const { data: comment } = await sb.from('comments').select('author_id, post_id').eq('id', id).single();
  if (!comment) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });
  if (comment.author_id !== user.id) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  return deleteComment(new Request(_req.url, {
    method: 'DELETE', headers: _req.headers, body: JSON.stringify({ commentId: id }),
  }), { params: Promise.resolve({ id: comment.post_id }) });
}
