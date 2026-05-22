import { createClient } from '@/lib/supabase/server';

function isMissingProductColumn(error: { message?: string; details?: string | null; hint?: string | null } | null, column: string) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return text.includes(column.toLowerCase());
}

export async function listProducts(filters?: {
  category?: string;
  subCategory?: string;
  hospitalId?: string;
  limit?: number;
}) {
  const sb = await createClient();
  const buildQuery = (select: string) => {
    let q = sb
      .from('products')
      .select(select)
      .eq('status', 'active');

    if (filters?.category) q = q.eq('category', filters.category);
    if (filters?.subCategory) q = q.eq('sub_category', filters.subCategory);
    if (filters?.hospitalId) q = q.eq('hospital_id', filters.hospitalId);
    if (filters?.limit) q = q.limit(filters.limit);

    return q.order('review_count', { ascending: false });
  };

  const withDetail = `id, title, price, original_price, discount, rating, review_count, like_count, image_url, detail_image_url, tags,
       category, sub_category,
       hospitals (id, name, location)`;
  const withoutDetail = `id, title, price, original_price, discount, rating, review_count, like_count, image_url, tags,
       category, sub_category,
       hospitals (id, name, location)`;

  let { data, error } = await buildQuery(withDetail);
  if (error && isMissingProductColumn(error, 'detail_image_url')) {
    const fallback = await buildQuery(withoutDetail);
    data = fallback.data;
    error = fallback.error;
  }
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
