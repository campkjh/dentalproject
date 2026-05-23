import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */
function postFromRow(p: any) {
  return {
    id: p.id,
    boardType: p.board_type,
    title: p.title,
    content: p.content,
    authorName: p.author?.name ?? '익명',
    authorTitle: p.author?.is_doctor ? '의사' : undefined,
    authorId: p.author_id,
    isAnonymous: p.is_anonymous,
    anonymousId: p.anonymous_id ?? undefined,
    date: p.created_at ? new Date(p.created_at).toLocaleDateString('ko-KR') : '',
    viewCount: p.view_count ?? 0,
    likeCount: p.like_count ?? 0,
    commentCount: p.comment_count ?? 0,
    imageUrl: p.image_url && !p.image_url.startsWith('data:') ? p.image_url : undefined,
    thumbnailUrl: p.thumbnail_url && !p.thumbnail_url.startsWith('data:') ? p.thumbnail_url : undefined,
    tags: p.tags ?? [],
    hasAnswer: p.has_answer ?? false,
    answerCount: p.answer_count ?? 0,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get('limit') ?? 80);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 80;
  const board = searchParams.get('board');
  const sb = await createClient();

  let query = sb
    .from('posts')
    .select(
      `id, board_type, title, content, author_id, view_count, like_count, comment_count,
       tags, has_answer, answer_count, is_anonymous, anonymous_id, image_url,
       thumbnail_url, created_at, author:profiles!posts_author_id_fkey(name, is_doctor)`
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (board && ['question', 'free', 'dental'].includes(board)) {
    query = query.eq('board_type', board);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { posts: (data ?? []).map(postFromRow) },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const requestedBoard = body.boardType ?? 'free';
  if (!['question', 'free', 'dental'].includes(requestedBoard)) {
    return NextResponse.json({ error: '게시판 유형이 올바르지 않습니다.' }, { status: 400 });
  }
  const { data: profile } = await sb
    .from('profiles')
    .select('is_doctor')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_doctor && requestedBoard !== 'question') {
    return NextResponse.json({ error: '일반 회원은 질문게시판에만 글을 작성할 수 있습니다.' }, { status: 403 });
  }

  const { data, error } = await sb
    .from('posts')
    .insert({
      author_id: user.id,
      board_type: requestedBoard,
      title: body.title ?? '',
      content: body.content ?? '',
      is_anonymous: body.isAnonymous ?? false,
      anonymous_id: body.anonymousId ?? null,
      image_url: body.imageUrl ?? null,
      thumbnail_url: body.thumbnailUrl ?? null,
      tags: body.tags ?? [],
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
