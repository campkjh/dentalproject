import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPost } from '@/lib/db/posts';
import { communityPostFromRow, isDoctorOnlyBoard } from '@/lib/community';
import { viewerCanSeeDoctorBoards } from '@/lib/community-viewer';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const post = await getPost(id);
    if (!post) return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
    if (isDoctorOnlyBoard(post.board_type) && !(await viewerCanSeeDoctorBoards(await createClient()))) {
      return NextResponse.json({ error: '의사 회원만 볼 수 있는 글이에요.' }, { status: 403 });
    }
    return NextResponse.json({ post: communityPostFromRow(post) });
  } catch {
    return NextResponse.json({ error: '게시글을 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { data: post } = await sb.from('posts').select('author_id').eq('id', id).single();
  if (!post) return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
  if (post.author_id !== user.id) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  const { error } = await sb.from('posts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { data: post } = await sb.from('posts').select('author_id').eq('id', id).single();
  if (!post) return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
  if (post.author_id !== user.id) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string') patch.title = body.title;
  if (typeof body.content === 'string') patch.content = body.content;
  if (Array.isArray(body.tags)) patch.tags = body.tags;
  if (typeof body.imageUrl === 'string' || body.imageUrl === null) {
    patch.image_url = body.imageUrl;
    patch.thumbnail_url = body.imageUrl;
  }

  const { error } = await sb.from('posts').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
