/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Demo seed — creates real auth.users (email + password) and ties hospitals,
 * products, reviews, reservations, posts, comments, coupons, point_history,
 * notifications to those users.
 *
 * After running, you can log in as any seeded user with the printed credentials.
 *
 * Idempotent: re-runs upsert by deterministic ids; existing auth users are
 * looked up by email instead of recreated.
 *
 * Usage:
 *   npm run db:seed
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
  coupons,
  pointHistory,
  announcements,
} from './seed-data';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const DEMO_PASSWORD = 'Demo1234!';

/* ---------------------- Deterministic UUID helper ---------------------- */
const uuidMap = new Map<string, string>();
function uuidFor(key: string) {
  if (!uuidMap.has(key)) {
    const hash = Array.from(key)
      .reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0x811c9dc5)
      .toString(16)
      .padStart(8, '0');
    const pad = hash.repeat(4).slice(0, 32);
    const uuid = `${pad.slice(0, 8)}-${pad.slice(8, 12)}-${pad.slice(12, 16)}-${pad.slice(16, 20)}-${pad.slice(20, 32)}`;
    uuidMap.set(key, uuid);
  }
  return uuidMap.get(key)!;
}

/* ---------------------- Auth user creation ---------------------- */

async function ensureUser(email: string, password: string, profile: {
  name: string;
  phone?: string;
  isDoctor?: boolean;
}): Promise<string> {
  // Try to fetch by email via list users (paginated)
  const { data: existingList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = existingList?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  let userId: string;
  if (existing) {
    userId = existing.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: profile.name },
    });
    if (error) throw new Error(`createUser(${email}) → ${error.message}`);
    userId = data.user.id;
  }
  // Upsert profile (the trigger may have created an empty row)
  await admin.from('profiles').upsert(
    {
      id: userId,
      name: profile.name,
      phone: profile.phone ?? null,
      login_type: 'email',
      is_doctor: profile.isDoctor ?? false,
      country: '대한민국',
    },
    { onConflict: 'id' }
  );
  return userId;
}

/* ---------------------- Section seeders ---------------------- */

async function seedCategories() {
  const rows = categories.map((c, i) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    popular: c.popular,
    sort_order: i,
  }));
  if (!rows.find((r) => r.id === 'dental')) {
    rows.push({ id: 'dental', name: '치과', icon: '/icons/categories/dental.svg', popular: true, sort_order: rows.length });
  }
  const { error } = await admin.from('categories').upsert(rows);
  if (error) throw error;
  console.log(`✓ categories: ${rows.length}`);
}

type OwnerRecord = { hospitalSlug: string; userId: string; email: string };

async function seedHospitalOwnersAndHospitals(): Promise<OwnerRecord[]> {
  const ownerRecords: OwnerRecord[] = [];
  for (const h of hospitals) {
    const owner = h.doctors.find((d) => d.isOwner) ?? h.doctors[0];
    const email = `owner.${h.id}@kidoctor.demo`;
    const userId = await ensureUser(email, DEMO_PASSWORD, {
      name: owner?.name ?? `${h.name} 대표`,
      phone: h.phone,
      isDoctor: true,
    });
    ownerRecords.push({ hospitalSlug: h.id, userId, email });

    await admin.from('hospitals').upsert(
      {
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
        owner_id: userId,
        status: 'approved',
      },
      { onConflict: 'slug' }
    );
  }

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
    await admin.from('operating_hours').upsert(ohRows, { onConflict: 'hospital_id,day' });
  }

  console.log(`✓ hospital owners + hospitals: ${ownerRecords.length} (+${ohRows.length} hours)`);
  return ownerRecords;
}

async function seedDoctors(owners: OwnerRecord[]) {
  const rows = hospitals.flatMap((h) =>
    h.doctors.map((d) => ({
      id: uuidFor(`doctor:${d.id}`),
      hospital_id: uuidFor(`hospital:${h.id}`),
      user_id: d.isOwner ? owners.find((o) => o.hospitalSlug === h.id)?.userId ?? null : null,
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
  await admin.from('doctors').upsert(rows);

  // Link owner profiles to their doctor row
  for (const h of hospitals) {
    const owner = h.doctors.find((d) => d.isOwner);
    if (!owner) continue;
    const ownerRecord = owners.find((o) => o.hospitalSlug === h.id);
    if (!ownerRecord) continue;
    await admin
      .from('profiles')
      .update({ doctor_id: uuidFor(`doctor:${owner.id}`) })
      .eq('id', ownerRecord.userId);
  }
  console.log(`✓ doctors: ${rows.length} (owner profiles linked)`);
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
  await admin.from('products').upsert(rows);

  const optRows = products.flatMap((p) =>
    (p.options ?? []).map((o, i) => ({
      id: uuidFor(`option:${p.id}:${o.id}`),
      product_id: uuidFor(`product:${p.id}`),
      name: o.name,
      price: o.price,
      sort_order: i,
    }))
  );
  if (optRows.length) await admin.from('product_options').upsert(optRows);
  console.log(`✓ products: ${rows.length} (+${optRows.length} options)`);
}

async function seedAnnouncements() {
  const rows = (announcements as any[]).map((a) => ({
    id: uuidFor(`announcement:${a.id}`),
    title: a.title,
    content: a.content,
    published_at: a.date ? new Date(a.date.replaceAll('.', '-')).toISOString() : new Date().toISOString(),
  }));
  await admin.from('announcements').upsert(rows);
  console.log(`✓ announcements: ${rows.length}`);
}

/* ---------------------- Patient users + reviews + reservations + community ---------------------- */

async function seedPatientsAndContent() {
  const patientUserIds: Record<string, string> = {};
  for (const r of reviews) {
    if (patientUserIds[r.authorId]) continue;
    const email = `${r.authorId}@kidoctor.demo`;
    const userId = await ensureUser(email, DEMO_PASSWORD, {
      name: r.authorName,
    });
    patientUserIds[r.authorId] = userId;
  }
  console.log(`✓ patient users: ${Object.keys(patientUserIds).length}`);

  // Reviews
  const reviewRows = reviews
    .filter((r) => r.hospitalId)
    .map((r) => ({
      id: uuidFor(`review:${r.id}`),
      author_id: patientUserIds[r.authorId],
      hospital_id: r.hospitalId ? uuidFor(`hospital:${r.hospitalId}`) : null,
      doctor_id: r.doctorId ? uuidFor(`doctor:${r.doctorId}`) : null,
      product_id: r.productId ? uuidFor(`product:${r.productId}`) : null,
      rating: r.rating,
      content: r.content,
      treatment_name: r.treatmentName,
      treatment_date: r.treatmentDate ? parseDate(r.treatmentDate) : null,
      total_cost: r.totalCost,
    }));
  if (reviewRows.length) {
    await admin.from('reviews').upsert(reviewRows);
  }
  console.log(`✓ reviews: ${reviewRows.length}`);

  // Reservations — assign first patient to each, only those with valid hospitalId+
  const firstPatientId = Object.values(patientUserIds)[0];
  if (firstPatientId) {
    const reservationRows = reservations
      .filter((rsv) => rsv.hospitalId)
      .map((rsv) => ({
        id: uuidFor(`reservation:${rsv.id}`),
        user_id: firstPatientId,
        hospital_id: uuidFor(`hospital:${rsv.hospitalId}`),
        status: rsv.status,
        visit_at: parseKoDateTime(rsv.visitDate),
        reservation_at: parseKoDateTime(rsv.reservationDate) ?? new Date().toISOString(),
        cancel_at: rsv.cancelDate ? parseKoDateTime(rsv.cancelDate) : null,
        cancel_reason: rsv.cancelReason ?? null,
        amount: rsv.amount,
        customer_name: rsv.customerName,
        customer_phone: rsv.customerPhone,
        payment_type: rsv.paymentType ?? null,
        payment_method: rsv.paymentMethod ?? null,
      }));
    if (reservationRows.length) {
      await admin.from('reservations').upsert(reservationRows);
    }
    console.log(`✓ reservations: ${reservationRows.length} (assigned to ${Object.values(patientUserIds)[0] === firstPatientId ? 'u1' : 'first user'})`);
  }

  // Coupons + point history → first patient
  if (firstPatientId) {
    const couponRows = coupons.map((c) => ({
      id: uuidFor(`coupon:${c.id}`),
      user_id: firstPatientId,
      name: c.name,
      description: c.description,
      discount_amount: c.discountAmount,
      expiry_date: c.expiryDate ? parseDate(c.expiryDate) : null,
      status: c.status,
    }));
    if (couponRows.length) await admin.from('coupons').upsert(couponRows);
    console.log(`✓ coupons: ${couponRows.length}`);

    const pointRows = pointHistory.map((p) => ({
      id: uuidFor(`point:${p.id}`),
      user_id: firstPatientId,
      type: p.type,
      description: p.description,
      amount: p.amount,
    }));
    if (pointRows.length) await admin.from('point_history').upsert(pointRows);
    console.log(`✓ point_history: ${pointRows.length}`);
  }

  // Posts + comments → use random patient as author for each (or first patient)
  const allUserIds = Object.values(patientUserIds);
  if (allUserIds.length) {
    const postRows = posts.map((p, i) => ({
      id: uuidFor(`post:${p.id}`),
      author_id: allUserIds[i % allUserIds.length],
      board_type: p.boardType,
      title: p.title,
      content: p.content,
      is_anonymous: p.isAnonymous ?? false,
      anonymous_id: p.anonymousId ?? null,
      view_count: p.viewCount,
      like_count: p.likeCount,
      comment_count: 0, // trigger will increment from comments
      image_url: p.imageUrl ?? null,
      thumbnail_url: p.thumbnailUrl ?? null,
      tags: p.tags,
      has_answer: p.hasAnswer ?? false,
      answer_count: p.answerCount ?? 0,
    }));
    if (postRows.length) await admin.from('posts').upsert(postRows);
    console.log(`✓ posts: ${postRows.length}`);

    const commentRows = comments.map((c, i) => ({
      id: uuidFor(`comment:${c.id}`),
      post_id: uuidFor(`post:${c.postId}`),
      author_id: allUserIds[i % allUserIds.length],
      content: c.content,
      is_anonymous: c.isAnonymous ?? false,
      anonymous_id: c.anonymousId ?? null,
    }));
    if (commentRows.length) await admin.from('comments').upsert(commentRows);
    console.log(`✓ comments: ${commentRows.length}`);
  }
}

/* ---------------------- date parsers ---------------------- */
function parseDate(ko: string): string | null {
  // "2026년12월10일" or "2026.12.10" or "2026년 12월 10일"
  const m = ko.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
}
function parseKoDateTime(ko: string): string | null {
  if (!ko) return null;
  const m = ko.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return null;
  const date = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  const t = ko.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/);
  let hh = 9, mm = 0;
  if (t) {
    hh = parseInt(t[2]);
    if (t[1] === '오후' && hh < 12) hh += 12;
    if (t[1] === '오전' && hh === 12) hh = 0;
    mm = parseInt(t[3]);
  }
  return `${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+09:00`;
}

/* ---------------------- main ---------------------- */
async function main() {
  console.log(`→ Seeding ${url}`);
  await seedCategories();
  const owners = await seedHospitalOwnersAndHospitals();
  await seedDoctors(owners);
  await seedProducts();
  await seedAnnouncements();
  await seedPatientsAndContent();

  console.log('\n--- Demo accounts (password: Demo1234!) ---');
  for (const o of owners) console.log(`  hospital owner: ${o.email}`);
  console.log('  patient (with reservations + coupons): u1@kidoctor.demo');
  console.log('  other patient reviewers: u2~u22@kidoctor.demo');
  console.log('\n✔ done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
