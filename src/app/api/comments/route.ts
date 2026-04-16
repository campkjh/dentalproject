import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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
