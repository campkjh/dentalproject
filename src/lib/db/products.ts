import { createClient } from '@/lib/supabase/server';

export async function listProducts(filters?: {
  category?: string;
  subCategory?: string;
  hospitalId?: string;
  limit?: number;
}) {
  const sb = await createClient();
  let q = sb
    .from('products')
    .select(
      `id, title, price, original_price, discount, rating, review_count, like_count, image_url, tags,
       category, sub_category,
       hospitals (id, name, location)`
    )
    .eq('status', 'active');

  if (filters?.category) q = q.eq('category', filters.category);
  if (filters?.subCategory) q = q.eq('sub_category', filters.subCategory);
  if (filters?.hospitalId) q = q.eq('hospital_id', filters.hospitalId);
  if (filters?.limit) q = q.limit(filters.limit);

  const { data, error } = await q.order('review_count', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProduct(id: string) {
  const sb = await createClient();
  const { data, error } = await sb
    .from('products')
    .select(
      `*, hospitals (id, name, location, phone, address, rating, review_count),
         product_options (id, name, price, sort_order)`
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
