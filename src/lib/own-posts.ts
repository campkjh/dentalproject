import type { SupabaseClient } from '@supabase/supabase-js';
import { isMissingSecretColumn } from '@/lib/community-viewer';
import type { Post } from '@/types';

export function ownPosts<T extends Partial<Pick<Post, 'authorId'>>>(posts: T[], userId?: string | null): T[] {
  return userId ? posts.filter(post => post.authorId === userId) : [];
}

export async function loadOwnPostRows(client: SupabaseClient, userId: string, doctor: boolean) {
  if (!userId) throw new Error('로그인이 필요합니다.');
  const run = (secret: boolean) => {
    let query = client.from('posts').select(`id, board_type, title, content, author_id, view_count,
      like_count, comment_count, comments(count), tags, has_answer, answer_count,
      is_anonymous, anonymous_id, image_url, thumbnail_url, created_at,${secret ? ' is_secret,' : ''}
      author:profiles!posts_author_id_fkey(name, is_doctor, profile_image)`)
      .eq('author_id', userId).order('created_at', { ascending: false });
    if (!doctor) query = query.eq('board_type', 'question');
    return query;
  };
  let result = await run(true);
  if (isMissingSecretColumn(result.error)) result = await run(false);
  return result;
}
