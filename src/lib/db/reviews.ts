import { createClient } from '@/lib/supabase/server';

export async function listReviews(filters?: {
  hospitalId?: string;
  productId?: string;
  doctorId?: string;
  authorId?: string;
}) {
  const sb = await createClient();
  let q = sb
    .from('reviews')
    .select(
      `*,
       author:profiles!reviews_author_id_fkey (id, name, profile_image),
       hospital:hospitals (id, name),
       doctor:doctors (id, name, title),
       product:products (id, title, image_url)`
    )
    .order('created_at', { ascending: false });

  if (filters?.hospitalId) q = q.eq('hospital_id', filters.hospitalId);
  if (filters?.productId) q = q.eq('product_id', filters.productId);
  if (filters?.doctorId) q = q.eq('doctor_id', filters.doctorId);
  if (filters?.authorId) q = q.eq('author_id', filters.authorId);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
