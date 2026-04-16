/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  normalizeHospital,
  normalizeProduct,
  normalizeReview,
  normalizeCategory,
} from '@/lib/api/normalize';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();

  const [hospitalsRes, productsRes, categoriesRes, reviewsRes] = await Promise.all([
    sb
      .from('hospitals')
      .select(
        `id, slug, name, category, location, phone, tags, logo_url, cover_images,
         introduction, holiday_notice, address, address_detail, map_url, rating, review_count,
         doctors (id, name, title, specialty, profile_image, is_owner, bio, careers, certifications),
         operating_hours (day, start_time, end_time, is_closed)`
      )
      .eq('status', 'approved'),
    sb
      .from('products')
      .select(
        `id, title, location, price, original_price, discount, rating, review_count, like_count,
         image_url, tags, category, sub_category, hospital_id,
         hospitals (id, name, location),
         product_options (id, name, price, sort_order)`
      )
      .eq('status', 'active'),
    sb.from('categories').select('*').order('sort_order'),
    sb
      .from('reviews')
      .select(
        `*,
         author:profiles!reviews_author_id_fkey (id, name, profile_image),
         doctor:doctors (id, name, title)`
      )
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  if (hospitalsRes.error) return NextResponse.json({ error: hospitalsRes.error.message }, { status: 500 });
  if (productsRes.error) return NextResponse.json({ error: productsRes.error.message }, { status: 500 });
  if (categoriesRes.error) return NextResponse.json({ error: categoriesRes.error.message }, { status: 500 });
  if (reviewsRes.error) return NextResponse.json({ error: reviewsRes.error.message }, { status: 500 });

  const hospitalsRaw = (hospitalsRes.data ?? []) as any[];
  const productsRaw = (productsRes.data ?? []) as any[];
  const reviewsRaw = (reviewsRes.data ?? []) as any[];

  const hospitals = hospitalsRaw.map(normalizeHospital);

  // Patch product hospital_id to use hospital slug (for legacy compat with mock-data id like 'h1')
  const hospitalIdToSlug = new Map<string, string>();
  for (const h of hospitalsRaw) {
    hospitalIdToSlug.set(h.id, h.slug ?? h.id);
  }
  const products = productsRaw.map((p) => {
    const slug = hospitalIdToSlug.get(p.hospital_id) ?? p.hospital_id;
    return normalizeProduct({
      ...p,
      hospital_id: slug,
      hospitals: p.hospitals ? { ...p.hospitals, id: slug } : null,
    });
  });

  const reviews = reviewsRaw.map((r) =>
    normalizeReview({
      ...r,
      hospital_id: r.hospital_id ? hospitalIdToSlug.get(r.hospital_id) ?? r.hospital_id : null,
    })
  );

  const categories = (categoriesRes.data ?? []).map(normalizeCategory);

  return NextResponse.json({ hospitals, products, reviews, categories });
}
