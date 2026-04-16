import { createClient } from '@/lib/supabase/server';

export async function listHospitals() {
  const sb = await createClient();
  const { data, error } = await sb
    .from('hospitals')
    .select(
      `id, slug, name, category, location, phone, tags, cover_images, rating, review_count, address,
       doctors (id, name, title, specialty, is_owner, profile_image),
       operating_hours (day, start_time, end_time, is_closed)`
    )
    .eq('status', 'approved')
    .order('review_count', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getHospital(idOrSlug: string) {
  const sb = await createClient();
  const isUuid = /^[0-9a-f]{8}-/.test(idOrSlug);
  const { data, error } = await sb
    .from('hospitals')
    .select(
      `*, doctors (*), operating_hours (*),
       products!products_hospital_id_fkey (id, title, price, original_price, discount, image_url, rating, review_count, like_count, tags, category, sub_category)`
    )
    .eq(isUuid ? 'id' : 'slug', idOrSlug)
    .maybeSingle();

  if (error) throw error;
  return data;
}
