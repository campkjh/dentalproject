import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type { Review } from '@/types';

export function ownReviews<T extends Partial<Pick<Review, 'authorId'>>>(reviews: T[], userId?: string | null): T[] {
  return userId ? reviews.filter(review => review.authorId === userId) : [];
}

export async function loadOwnReviewRows(client: SupabaseClient<Database>, userId: string) {
  if (!userId) throw new Error('로그인이 필요합니다.');
  return client.from('reviews')
    .select(`id, author_id, rating, content, treatment_name, treatment_date, total_cost,
      before_image, after_image, created_at, hospital_id, product_id, doctor_id,
      author:profiles!reviews_author_id_fkey(name), hospital:hospitals(name), product:products(image_url)`)
    .eq('author_id', userId)
    .order('created_at', { ascending: false });
}
