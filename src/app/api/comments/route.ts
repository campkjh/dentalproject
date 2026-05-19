import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get('postId');
  if (!postId || !/^[0-9a-f]{8}-/.test(postId)) {
    return NextResponse.json({ comments: [] });
  }
  const sb = await createClient();
  const { data, error } = await sb
    .from('comments')
    .select(`id, post_id, author_id, parent_comment_id, content, is_anonymous, anonymous_id, like_count, created_at,
             author:profiles!comments_author_id_fkey (name, is_doctor)`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const comments = (data ?? []).map((c: any) => ({
    id: c.id,
    postId: c.post_id,
    authorId: c.author_id,
    authorName: c.author?.name ?? '익명',
    authorTitle: c.author?.is_doctor ? '의사' : undefined,
    parentCommentId: c.parent_comment_id ?? undefined,
    content: c.content,
    isAnonymous: c.is_anonymous,
    anonymousId: c.anonymous_id ?? undefined,
    likeCount: c.like_count ?? 0,
    date: c.created_at ? new Date(c.created_at).toLocaleDateString('ko-KR') : '',
  }));

  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  if (!body.postId || !/^[0-9a-f]{8}-/.test(body.postId)) {
    return NextResponse.json({ error: '댓글은 새로 작성된 글에만 가능합니다.' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('comments')
    .insert({
      post_id: body.postId,
      author_id: user.id,
      parent_comment_id: body.parentCommentId ?? null,
      content: body.content ?? '',
      is_anonymous: body.isAnonymous ?? false,
      anonymous_id: body.anonymousId ?? null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
