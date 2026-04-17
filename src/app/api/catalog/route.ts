/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  normalizeHospital,
  normalizeProduct,
  normalizeReview,
  normalizeCategory,
} from '@/lib/api/normalize';

export const revalidate = 300; // ISR: 5분 캐시

export async function GET() {
  const sb = await createClient();

  // Essential data only — posts/comments/announcements load on their own pages
  const [hospitalsRes, productsRes, categoriesRes, reviewsRes, postsRes, announcementsRes] = await Promise.all([
    sb
      .from('hospitals')
      .select(
        `id, slug, name, category, location, phone, tags, cover_images,
         introduction, holiday_notice, address, address_detail, rating, review_count,
         doctors (id, name, title, specialty, profile_image, is_owner),
         operating_hours (day, start_time, end_time, is_closed)`
      )
      .eq('status', 'approved'),
    sb
      .from('products')
      .select(
        `id, title, location, price, original_price, discount, rating, review_count, like_count,
         image_url, tags, category, sub_category, hospital_id,
         hospitals (id, name, location)`
      )
      .eq('status', 'active'),
    sb.from('categories').select('*').order('sort_order'),
    sb
      .from('reviews')
      .select(
        `id, author_id, hospital_id, doctor_id, product_id, rating, content, treatment_name, total_cost, treatment_date, created_at,
         author:profiles!reviews_author_id_fkey (name),
         doctor:doctors (name, title)`
      )
      .order('created_at', { ascending: false })
      .limit(50),
    sb
      .from('posts')
      .select(`id, board_type, title, content, author_id, view_count, like_count, comment_count, tags, has_answer, answer_count, is_anonymous, anonymous_id, created_at,
         author:profiles!posts_author_id_fkey (name, is_doctor)`)
      .order('created_at', { ascending: false })
      .limit(50),
    sb.from('announcements').select('id, title, content, published_at').order('published_at', { ascending: false }).limit(10),
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

  const posts = (postsRes.data as any[] | null ?? []).map((p) => ({
    id: p.id,
    boardType: p.board_type,
    title: p.title,
    content: p.content,
    authorName: p.author?.name ?? '익명',
    authorTitle: p.author?.is_doctor ? '의사' : undefined,
    authorHospital: undefined,
    authorId: p.author_id,
    isAnonymous: p.is_anonymous,
    anonymousId: p.anonymous_id ?? undefined,
    date: p.created_at ? new Date(p.created_at).toLocaleDateString('ko-KR') : '',
    viewCount: p.view_count ?? 0,
    likeCount: p.like_count ?? 0,
    commentCount: p.comment_count ?? 0,
    imageUrl: p.image_url ?? undefined,
    thumbnailUrl: p.thumbnail_url ?? undefined,
    tags: p.tags ?? [],
    hasAnswer: p.has_answer ?? false,
    answerCount: p.answer_count ?? 0,
  }));

  const announcements = (announcementsRes.data as any[] | null ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    date: a.published_at ? new Date(a.published_at).toLocaleDateString('ko-KR').replaceAll('. ', '.') : '',
    content: a.content ?? '',
  }));

  return NextResponse.json(
    { hospitals, products, reviews, categories, posts, comments: [], announcements },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    }
  );
}
