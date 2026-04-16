/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Seed script — populates Supabase with the mock data from src/lib/mock-data.ts.
 *
 * Usage:
 *   1. Create .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   2. Apply supabase/schema.sql in the SQL Editor
 *   3. npx tsx scripts/seed.ts
 *
 * The script is idempotent: re-runs upsert by deterministic legacy id slugs.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import { createClient } from '@supabase/supabase-js';
import {
  categories,
  hospitals,
  products,
  reviews,
  reservations,
  posts,
  comments,
  notifications,
  coupons,
  pointHistory,
  announcements,
} from '../src/lib/mock-data';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

/**
 * Legacy mock ids are short strings ("h1", "d1", "p1"). We map them to real
 * UUIDs here so seed is re-runnable.
 */
const uuidMap = new Map<string, string>();
function uuidFor(key: string) {
  if (!uuidMap.has(key)) {
    // Deterministic UUID v5-ish derived from namespace + key
    const hash = Array.from(key)
      .reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0x811c9dc5)
      .toString(16)
      .padStart(8, '0');
    const pad = hash.repeat(4).slice(0, 32);
    const uuid = `${pad.slice(0, 8)}-${pad.slice(8, 12)}-${pad.slice(
      12,
      16
    )}-${pad.slice(16, 20)}-${pad.slice(20, 32)}`;
    uuidMap.set(key, uuid);
  }
  return uuidMap.get(key)!;
}

async function seedCategories() {
  const rows = categories.map((c, i) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    popular: c.popular,
    sort_order: i,
  }));
  // mock-data에 '치과'가 없어서 hospitals.category FK가 깨짐 → 보강
  if (!rows.find((r) => r.id === 'dental')) {
    rows.push({
      id: 'dental',
      name: '치과',
      icon: '/icons/categories/dental.svg',
      popular: true,
      sort_order: rows.length,
    });
  }
  const { error } = await admin.from('categories').upsert(rows);
  if (error) throw error;
  console.log(`✓ categories: ${rows.length}`);
}

async function seedHospitals() {
  const rows = hospitals.map((h) => ({
    id: uuidFor(`hospital:${h.id}`),
    slug: h.id,
    name: h.name,
    category: h.category === '치과' ? 'dental' : h.category === '성형외과' ? 'plastic' : null,
    location: h.location,
    phone: h.phone,
    tags: h.tags,
    cover_images: h.coverImages,
    introduction: h.introduction ?? null,
    holiday_notice: h.holidayNotice ?? null,
    address: h.address,
    address_detail: h.addressDetail ?? null,
    rating: h.rating,
    review_count: h.reviewCount,
    status: 'approved',
  }));
  const { error } = await admin.from('hospitals').upsert(rows, { onConflict: 'slug' });
  if (error) throw error;

  // Operating hours
  const ohRows = hospitals.flatMap((h) =>
    h.operatingHours.map((o) => ({
      hospital_id: uuidFor(`hospital:${h.id}`),
      day: o.day,
      start_time: o.startTime ?? null,
      end_time: o.endTime ?? null,
      is_closed: o.isClosed ?? false,
    }))
  );
  if (ohRows.length) {
    const { error: e2 } = await admin
      .from('operating_hours')
      .upsert(ohRows, { onConflict: 'hospital_id,day' });
    if (e2) throw e2;
  }
  console.log(`✓ hospitals: ${rows.length} (+${ohRows.length} operating hours)`);
}

async function seedDoctors() {
  const rows = hospitals.flatMap((h) =>
    h.doctors.map((d) => ({
      id: uuidFor(`doctor:${d.id}`),
      hospital_id: uuidFor(`hospital:${h.id}`),
      name: d.name,
      title: d.title,
      specialty: d.specialty ?? '',
      profile_image: d.profileImage ?? null,
      is_owner: d.isOwner ?? false,
      bio: d.bio ?? null,
      careers: d.careers ?? [],
      certifications: d.certifications ?? [],
    }))
  );
  const { error } = await admin.from('doctors').upsert(rows);
  if (error) throw error;
  console.log(`✓ doctors: ${rows.length}`);
}

async function seedProducts() {
  const rows = products.map((p) => ({
    id: uuidFor(`product:${p.id}`),
    hospital_id: uuidFor(`hospital:${p.hospitalId}`),
    title: p.title,
    location: p.location,
    price: p.price,
    original_price: p.originalPrice ?? null,
    discount: p.discount ?? null,
    rating: p.rating,
    review_count: p.reviewCount,
    like_count: p.likeCount,
    image_url: p.imageUrl,
    tags: p.tags,
    category: p.category,
    sub_category: p.subCategory,
    status: 'active',
  }));
  const { error } = await admin.from('products').upsert(rows);
  if (error) throw error;

  const optRows = products.flatMap((p) =>
    (p.options ?? []).map((o, i) => ({
      id: uuidFor(`option:${p.id}:${o.id}`),
      product_id: uuidFor(`product:${p.id}`),
      name: o.name,
      price: o.price,
      sort_order: i,
    }))
  );
  if (optRows.length) {
    const { error: e2 } = await admin.from('product_options').upsert(optRows);
    if (e2) throw e2;
  }
  console.log(`✓ products: ${rows.length} (+${optRows.length} options)`);
}

async function seedAnnouncements() {
  const rows = (announcements as any[]).map((a) => ({
    id: uuidFor(`announcement:${a.id}`),
    title: a.title,
    content: a.content,
    published_at: a.date ? new Date(a.date.replaceAll('.', '-')).toISOString() : new Date().toISOString(),
  }));
  const { error } = await admin.from('announcements').upsert(rows);
  if (error) throw error;
  console.log(`✓ announcements: ${rows.length}`);
}

/**
 * Reviews, reservations, posts, comments, notifications, coupons, points are
 * user-owned — they require real auth.users rows. We skip them in the initial
 * seed and rely on the app's signup flow to create organic data once Kakao/
 * Apple OAuth is wired up.
 *
 * If you need demo content for development, create seed accounts via
 * `supabase auth signup` then re-run with --with-user-data (not implemented
 * in this initial version).
 */
async function seedUserOwned() {
  console.log(
    '↷ skipping user-owned tables (reviews, reservations, posts, comments, notifications, coupons, points) — ' +
      'sign up test users first, then extend this script.'
  );
  void reviews;
  void reservations;
  void posts;
  void comments;
  void notifications;
  void coupons;
  void pointHistory;
}

async function main() {
  console.log(`→ Seeding ${url}`);
  await seedCategories();
  await seedHospitals();
  await seedDoctors();
  await seedProducts();
  await seedAnnouncements();
  await seedUserOwned();
  console.log('✔ done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
