/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 30;

export async function GET() {
  const sb = await createClient();

  const [postsRes, commentsRes] = await Promise.all([
    sb
      .from('posts')
      .select('id, title, content, tags, author_id, created_at, author:profiles!posts_author_id_fkey (name)')
      .eq('board_type', 'question')
      .order('created_at', { ascending: true })
      .limit(50),
    sb
      .from('comments')
      .select('id, post_id, content, created_at, author:profiles!comments_author_id_fkey (name, is_doctor)')
      .order('created_at', { ascending: true })
      .limit(200),
  ]);

  const posts = (postsRes.data ?? []) as any[];
  const allComments = (commentsRes.data ?? []) as any[];

  // Only keep doctor replies for question posts
  const questionIds = new Set(posts.map((p) => p.id));
  const doctorReplies = allComments.filter(
    (c) => questionIds.has(c.post_id) && c.author?.is_doctor
  );

  const questions = posts.map((p) => ({
    id: p.id,
    content: p.content,
    category: (p.tags?.[0]) || '기타',
    authorName: p.author?.name ?? '익명',
    authorId: p.author_id,
    createdAt: p.created_at,
    replies: doctorReplies
      .filter((c) => c.post_id === p.id)
      .map((c) => ({
        id: c.id,
        doctorName: c.author?.name ?? '의사',
        content: c.content,
        createdAt: c.created_at,
      })),
  }));

  return NextResponse.json(
    { questions },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } }
  );
}
