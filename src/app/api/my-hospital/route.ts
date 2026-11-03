/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { attachScheduleHistory } from '@/lib/db/reservation-history';
import { cancelExpiredPendingReservations, completePastConfirmedReservations } from '@/lib/db/reservation-status';
import { extractProductDetailImageUrl, getVisibleProductTags, normalizeProductImageUrl } from '@/lib/images';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { geocodeAddress } from '@/lib/naver-geocode';
import { getOwnedHospital, hospitalKeys } from '@/lib/owned-hospital';

export const dynamic = 'force-dynamic';

function approvalStatusFromLegacyStatus(status?: string | null) {
  if (status === 'paused') return 'pending_create';
  if (status === 'removed') return 'rejected';
  return 'approved';
}

function normalizeProductRow(product: any) {
  if (!product) return null;
  const visibleTags = getVisibleProductTags(product.tags);
  const approvalStatus = product.approval_status ?? approvalStatusFromLegacyStatus(product.status);
  const pendingChanges = product.pending_changes
    ? {
        ...product.pending_changes,
        ...(Array.isArray(product.pending_changes.tags)
          ? { tags: getVisibleProductTags(product.pending_changes.tags) }
          : {}),
        ...(product.pending_changes.image_url
          ? { image_url: normalizeProductImageUrl(product.pending_changes.image_url) ?? product.pending_changes.image_url }
          : {}),
        ...(product.pending_changes.detail_image_url || Array.isArray(product.pending_changes.tags)
          ? {
              detail_image_url:
                normalizeProductImageUrl(product.pending_changes.detail_image_url)
                ?? extractProductDetailImageUrl(product.pending_changes.tags)
                ?? product.pending_changes.detail_image_url,
            }
          : {}),
      }
    : product.pending_changes;
  return {
    ...product,
    image_url: normalizeProductImageUrl(product.image_url) ?? null,
    detail_image_url: normalizeProductImageUrl(product.detail_image_url) ?? extractProductDetailImageUrl(product.tags) ?? null,
    tags: visibleTags,
    approval_status: approvalStatus,
    pending_changes: pendingChanges,
  };
}

const hospitalSelect = `
  *,
  doctors (*),
  operating_hours (*)
`;

// 상품·리뷰·예약은 이 병원의 id(와 옛 슬러그)로만 찾는다 — 이름이 같은 다른 병원 것이 섞이지 않게
async function collectHospitalIdsByName(_admin: Awaited<ReturnType<typeof createAdminClient>>, hospital: any) {
  return hospitalKeys(hospital);
}

async function fetchHospitalProducts(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  hospital: any,
  selectColumns: string
) {
  let baseResult: any = null;
  let firstErrorResult: any = null;
  let hasSuccessfulQuery = false;
  const merged = new Map<string, any>();
  const keys = await collectHospitalIdsByName(admin, hospital);
  for (const key of keys) {
    const result = await admin
      .from('products')
      .select(selectColumns)
      .eq('hospital_id', key)
      .order('created_at', { ascending: false });

    if (result.error) {
      if (!firstErrorResult) firstErrorResult = result;
      continue;
    }

    hasSuccessfulQuery = true;
    if (!baseResult) baseResult = result;
    for (const product of (result.data ?? []) as any[]) {
      if (product?.id) merged.set(product.id, product);
    }
  }

  if (!hasSuccessfulQuery && firstErrorResult) return firstErrorResult;

  return {
    ...(baseResult ?? { error: null }),
    data: Array.from(merged.values()).sort((a, b) => (
      new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    )),
    error: null,
  };
}

async function fetchHospitalProductsWithFallback(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  hospital: any
) {
  const selectors = [
    `id, title, location, price, original_price, discount, rating, review_count, image_url, tags,
       detail_image_url, image_urls, detail_image_urls, description, category, sub_category, status, approval_status, pending_changes, created_at`,
    `id, title, location, price, original_price, discount, rating, review_count, image_url, tags,
       detail_image_url, description, category, sub_category, status, approval_status, pending_changes, created_at`,
    `id, title, location, price, original_price, discount, rating, review_count, image_url, tags,
       detail_image_url, category, sub_category, status, approval_status, pending_changes, created_at`,
    'id, title, location, price, original_price, discount, rating, review_count, image_url, tags, category, sub_category, status, approval_status, pending_changes, created_at',
    'id, title, location, price, original_price, discount, rating, review_count, image_url, tags, detail_image_url, category, sub_category, status, created_at',
    'id, title, location, price, original_price, discount, rating, review_count, image_url, tags, category, sub_category, status, created_at',
  ];

  let lastResult: any = { data: [], error: null };
  for (const selector of selectors) {
    const result = await fetchHospitalProducts(admin, hospital, selector);
    lastResult = result;
    if (!result.error) return result;
  }
  return lastResult;
}

async function attachReservationRelations(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  reservations: any[],
  products: any[]
) {
  const userIds = Array.from(new Set(reservations.map((row) => row.user_id).filter(Boolean)));
  const doctorIds = Array.from(new Set(reservations.map((row) => row.doctor_id).filter(Boolean)));
  const productIds = Array.from(new Set(reservations.map((row) => row.product_id).filter(Boolean)));

  const [usersRes, doctorsRes, linkedProductsRes] = await Promise.all([
    userIds.length
      ? admin.from('profiles').select('id, name, phone, profile_image').in('id', userIds)
      : Promise.resolve({ data: [] }),
    doctorIds.length
      ? admin.from('doctors').select('id, name, title, profile_image').in('id', doctorIds)
      : Promise.resolve({ data: [] }),
    productIds.length
      ? admin.from('products').select('id, title, image_url, price').in('id', productIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userById = new Map(((usersRes.data ?? []) as any[]).map((row) => [row.id, row]));
  const doctorById = new Map(((doctorsRes.data ?? []) as any[]).map((row) => [row.id, row]));
  const productById = new Map([
    ...products.map((product) => [product.id, product] as const),
    ...((linkedProductsRes.data ?? []) as any[]).map((product) => [product.id, product] as const),
  ]);
  const fallbackProduct = products.find((product) => product.image_url) ?? products[0] ?? null;

  return reservations.map((reservation) => {
    const linkedProduct = productById.get(reservation.product_id) ?? fallbackProduct;
    return {
      ...reservation,
      user: userById.get(reservation.user_id) ?? null,
      doctor: doctorById.get(reservation.doctor_id) ?? null,
      product: linkedProduct
        ? {
            id: linkedProduct.id,
            title: linkedProduct.title,
            image_url: normalizeProductImageUrl(linkedProduct.image_url) ?? null,
            price: linkedProduct.price ?? null,
          }
        : null,
    };
  });
}

async function fetchHospitalRows(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  table: string,
  hospital: any,
  selectColumns: string,
  options: {
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
    notNull?: string;
  } = {}
) {
  let baseResult: any = null;
  let firstErrorResult: any = null;
  let hasSuccessfulQuery = false;
  const merged = new Map<string, any>();
  const keys = await collectHospitalIdsByName(admin, hospital);
  for (const key of keys) {
    let query = admin
      .from(table)
      .select(selectColumns)
      .eq('hospital_id', key);

    if (options.notNull) query = query.not(options.notNull, 'is', null);
    if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    if (options.limit) query = query.limit(options.limit);

    const result = await query;
    if (result.error) {
      if (!firstErrorResult) firstErrorResult = result;
      continue;
    }

    hasSuccessfulQuery = true;
    if (!baseResult) baseResult = result;
    for (const row of (result.data ?? []) as any[]) {
      if (row?.id) merged.set(row.id, row);
    }
  }

  if (!hasSuccessfulQuery && firstErrorResult) return firstErrorResult;

  return {
    ...(baseResult ?? { error: null }),
    data: Array.from(merged.values()),
    error: null,
  };
}

export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ hospital: null });

  const admin = await createAdminClient();
  const owned = await getOwnedHospital();
  let hospital: any = null;
  if (owned.hospital) {
    const { data } = await admin.from('hospitals').select(hospitalSelect).eq('id', owned.hospital.id).maybeSingle();
    hospital = data;
  }

  if (!hospital) return NextResponse.json({ hospital: null });

  // Reviews + recent reservations
  await cancelExpiredPendingReservations(admin, { hospitalId: hospital.id });
  await completePastConfirmedReservations(admin, { hospitalId: hospital.id });

  const [productsRes, reviewsRes, reservationsRes] = await Promise.all([
    fetchHospitalProductsWithFallback(admin, hospital),
    fetchHospitalRows(
      admin,
      'reviews',
      hospital,
        `id, rating, content, treatment_name, treatment_date, total_cost,
         before_image, after_image, created_at, hidden,
	         author:profiles!reviews_author_id_fkey (name, profile_image),
	         doctor:doctors (name, profile_image)`,
      { orderBy: 'created_at', ascending: false, limit: 50 }
    ),
    fetchHospitalRows(
      admin,
      'reservations',
      hospital,
        `id, user_id, hospital_id, product_id, doctor_id, status, visit_at, reservation_at,
         cancel_at, cancel_reason, amount, customer_name, customer_phone, payment_type,
         payment_method, memo, created_at, updated_at`,
      { orderBy: 'reservation_at', ascending: false, limit: 100 }
    ),
  ]);

  let products: any[] = (productsRes.data ?? []).map(normalizeProductRow).filter(Boolean);
  if (reservationsRes.error) {
    const fallbackReservations = await fetchHospitalRows(
      admin,
      'reservations',
      hospital,
      `id, user_id, hospital_id, product_id, doctor_id, status, visit_at, reservation_at,
       cancel_at, cancel_reason, amount, customer_name, customer_phone, payment_type,
       payment_method, created_at`,
      { orderBy: 'reservation_at', ascending: false, limit: 100 }
    );
    reservationsRes.data = fallbackReservations.data;
    reservationsRes.error = fallbackReservations.error;
  }

  const reservationCountByProduct = new Map<string, number>();
  for (const row of reservationsRes.data ?? []) {
    if (!row.product_id) continue;
    reservationCountByProduct.set(row.product_id, (reservationCountByProduct.get(row.product_id) ?? 0) + 1);
  }
  products = products.map((product) => ({
    ...product,
    reservation_count: reservationCountByProduct.get(product.id) ?? 0,
  }));

  const reservationRows = await attachReservationRelations(admin, reservationsRes.data ?? [], products);

  const reservationLinks = reservationRows.flatMap((reservation: any) => [
    `/reservations/${reservation.id}`,
    `/partner/reservations/${reservation.id}`,
  ]);
  const { data: scheduleNotifications } = reservationLinks.length
    ? await admin
        .from('notifications')
        .select('id, title, content, link, created_at')
        .in('link', reservationLinks)
        .order('created_at', { ascending: false })
        .limit(300)
    : { data: [] };
  const reservationsWithHistory = attachScheduleHistory(reservationRows, scheduleNotifications ?? []);

  return NextResponse.json({
    hospital: { ...hospital, products },
    reviews: reviewsRes.data ?? [],
    reservations: reservationsWithHistory,
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  // 1) 유저 인증 + 소유 병원 확인 — 심사 중(pending) 병원은 공개 권한으로 안 보이므로 서버 권한으로 찾는다
  const { hospital, error: ownedError } = await getOwnedHospital({ ownerOnly: true });
  if (ownedError) return ownedError;

  // 3) admin client로 업데이트 (RLS 우회 — 소유 확인은 위에서 완료)
  const patch: Record<string, any> = {};
  if (typeof body.name === 'string') patch.name = body.name;
  if (typeof body.phone === 'string') patch.phone = body.phone;
  if (typeof body.address === 'string') patch.address = body.address;
  if (typeof body.addressDetail === 'string') patch.address_detail = body.addressDetail;
  if (typeof body.introduction === 'string') patch.introduction = body.introduction;
  if (typeof body.holidayNotice === 'string') patch.holiday_notice = body.holidayNotice;
  if (typeof body.imageUrl === 'string') patch.logo_url = body.imageUrl;
  if (Array.isArray(body.tags)) patch.tags = body.tags;
  if (Array.isArray(body.coverImages)) patch.cover_images = body.coverImages;

  // 좌표: 수동 입력 우선, 없으면 주소가 들어올 때 자동 geocoding
  if (typeof body.lat === 'number' && typeof body.lng === 'number') {
    patch.lat = body.lat;
    patch.lng = body.lng;
  } else if (typeof patch.address === 'string' && patch.address.trim()) {
    const coords = await geocodeAddress(patch.address);
    if (coords) {
      patch.lat = coords.lat;
      patch.lng = coords.lng;
    }
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

  const admin = await createAdminClient();
  const { error } = await admin.from('hospitals').update(patch).eq('id', hospital.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
