/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { attachScheduleHistory } from '@/lib/db/reservation-history';
import { completePastConfirmedReservations } from '@/lib/db/reservation-status';
import { extractProductDetailImageUrl, getVisibleProductTags, normalizeProductImageUrl } from '@/lib/images';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function normalizeProductRow(product: any) {
  if (!product) return null;
  const visibleTags = getVisibleProductTags(product.tags);
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
    pending_changes: pendingChanges,
  };
}

function isMissingProductColumn(error: { message?: string; details?: string | null; hint?: string | null } | null, column: string) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return text.includes(column.toLowerCase());
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function fetchHospitalProducts(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  hospital: any,
  selectColumns: string
) {
  const hospitalId = typeof hospital?.id === 'string' ? hospital.id.trim() : '';
  const hospitalSlug = typeof hospital?.slug === 'string' ? hospital.slug.trim() : '';

  const byId = await admin
    .from('products')
    .select(selectColumns)
    .eq('hospital_id', hospitalId)
    .order('created_at', { ascending: false });

  if (byId.error || !hospitalSlug || hospitalSlug === hospitalId) {
    return byId;
  }

  const bySlug = await admin
    .from('products')
    .select(selectColumns)
    .eq('hospital_id', hospitalSlug)
    .order('created_at', { ascending: false });

  if (bySlug.error) return byId;

  const merged = new Map<string, any>();
  for (const product of (byId.data ?? []) as any[]) {
    if (product?.id) merged.set(product.id, product);
  }
  for (const product of (bySlug.data ?? []) as any[]) {
    if (product?.id) merged.set(product.id, product);
  }

  return {
    ...byId,
    data: Array.from(merged.values()).sort((a, b) => (
      new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    )),
    error: null,
  };
}

export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ hospital: null });

  let { data: hospital } = await sb
    .from('hospitals')
    .select(
      `*,
       doctors (*),
       operating_hours (*)`
    )
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!hospital) {
    const { data: doctor } = await sb
      .from('doctors')
      .select('hospital_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (doctor?.hospital_id) {
      const { data } = await sb
        .from('hospitals')
        .select(
          `*,
           doctors (*),
           operating_hours (*)`
        )
        .eq('id', doctor.hospital_id)
        .maybeSingle();
      hospital = data;
    }
  }

  if (!hospital) return NextResponse.json({ hospital: null });

  // Reviews + recent reservations
  const admin = await createAdminClient();
  await completePastConfirmedReservations(admin, { hospitalId: hospital.id });

  const productColumns = `id, title, location, price, original_price, discount, rating, review_count, image_url, tags,
       detail_image_url, category, sub_category, status, approval_status, pending_changes, created_at`;

  const [productsRes, reviewsRes, reservationsRes, productReservationsRes] = await Promise.all([
    fetchHospitalProducts(admin, hospital, productColumns),
    sb
      .from('reviews')
      .select('*, author:profiles!reviews_author_id_fkey (name)')
      .eq('hospital_id', hospital.id)
      .order('created_at', { ascending: false })
      .limit(50),
    sb
      .from('reservations')
      .select(
        `*, user:profiles!reservations_user_id_fkey (name, phone),
            product:products (id, title, image_url, price)`
      )
      .eq('hospital_id', hospital.id)
      .order('reservation_at', { ascending: false })
      .limit(100),
    admin
      .from('reservations')
      .select('product_id')
      .eq('hospital_id', hospital.id)
      .not('product_id', 'is', null),
  ]);

  let products: any[] = (productsRes.data ?? []).map(normalizeProductRow).filter(Boolean);
  if (productsRes.error) {
    const fallback = await fetchHospitalProducts(
      admin,
      hospital,
      isMissingProductColumn(productsRes.error, 'detail_image_url')
        ? 'id, title, location, price, original_price, discount, rating, review_count, image_url, tags, category, sub_category, status, approval_status, pending_changes, created_at'
        : 'id, title, location, price, original_price, discount, rating, review_count, image_url, tags, category, sub_category, status, created_at'
    );
    products = (fallback.data ?? []).map(normalizeProductRow).filter(Boolean);
  }

  const reservationCountByProduct = new Map<string, number>();
  for (const row of productReservationsRes.data ?? []) {
    if (!row.product_id) continue;
    reservationCountByProduct.set(row.product_id, (reservationCountByProduct.get(row.product_id) ?? 0) + 1);
  }
  products = products.map((product) => ({
    ...product,
    reservation_count: reservationCountByProduct.get(product.id) ?? 0,
  }));

  const productById = new Map(products.map((product) => [product.id, product]));
  const fallbackProduct = products.find((product) => product.image_url) ?? products[0] ?? null;
  const reservationRows = (reservationsRes.data ?? []).map((reservation: any) => {
    const relationProduct = normalizeProductRow(firstRelation(reservation.product));
    const linkedProduct = relationProduct
      ?? productById.get(reservation.product_id)
      ?? fallbackProduct;

    return {
      ...reservation,
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

  // 1) 유저 인증
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  // 2) 소유 병원 확인 (anon client: SELECT 가능)
  const { data: hospital } = await sb
    .from('hospitals').select('id').eq('owner_id', user.id).maybeSingle();
  if (!hospital) return NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 });

  // 3) admin client로 업데이트 (RLS 우회 — 소유 확인은 위에서 완료)
  const patch: Record<string, any> = {};
  if (typeof body.name === 'string') patch.name = body.name;
  if (typeof body.phone === 'string') patch.phone = body.phone;
  if (typeof body.address === 'string') patch.address = body.address;
  if (typeof body.addressDetail === 'string') patch.address_detail = body.addressDetail;
  if (typeof body.introduction === 'string') patch.introduction = body.introduction;
  if (typeof body.holidayNotice === 'string') patch.holiday_notice = body.holidayNotice;
  if (typeof body.imageUrl === 'string') patch.image_url = body.imageUrl;
  if (Array.isArray(body.tags)) patch.tags = body.tags;
  if (Array.isArray(body.coverImages)) patch.cover_images = body.coverImages;

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

  const admin = await createAdminClient();
  const { error } = await admin.from('hospitals').update(patch).eq('id', hospital.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
