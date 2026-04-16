import { createClient } from '@/lib/supabase/server';

export async function listPosts(boardType?: 'question' | 'free' | 'dental', limit = 50) {
  const sb = await createClient();
  let q = sb
    .from('posts')
    .select(
      `*, author:profiles!posts_author_id_fkey (id, name, profile_image, is_doctor)`
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (boardType) q = q.eq('board_type', boardType);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getPost(id: string) {
  const sb = await createClient();
  const { data, error } = await sb
    .from('posts')
    .select(
      `*, author:profiles!posts_author_id_fkey (id, name, profile_image, is_doctor)`
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listComments(postId: string) {
  const sb = await createClient();
  const { data, error } = await sb
    .from('comments')
    .select(
      `*, author:profiles!comments_author_id_fkey (id, name, profile_image, is_doctor)`
    )
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
