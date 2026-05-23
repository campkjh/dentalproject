/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { mergeProductDetailImageTag } from '@/lib/images';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ProductApprovalStatus = 'approved' | 'pending_create' | 'pending_update' | 'pending_delete' | 'rejected';
type OwnedProductResult = {
  product: {
    id: string;
    hospital_id: string;
    status: string | null;
    approval_status?: ProductApprovalStatus | null;
  };
  approvalColumnsAvailable: boolean;
};

const LEGACY_HOSPITAL_SLUG_BY_NAME: Record<string, string> = {
  '레브치과의원': 'h1',
  '아이디치과': 'h2',
  '화이트드림치과': 'h3',
  '서울스마일치과': 'h4',
};

function hospitalKeys(hospital: any) {
  return Array.from(new Set([
    typeof hospital?.id === 'string' ? hospital.id.trim() : '',
    typeof hospital?.slug === 'string' ? hospital.slug.trim() : '',
    typeof hospital?.name === 'string' ? LEGACY_HOSPITAL_SLUG_BY_NAME[hospital.name.trim()] : '',
  ].filter(Boolean)));
}

function isMissingApprovalColumn(error: { message?: string; details?: string | null; hint?: string | null } | null) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return text.includes('approval_status') || text.includes('pending_changes');
}

function isMissingProductColumn(error: { message?: string; details?: string | null; hint?: string | null } | null, column: string) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return text.includes(column.toLowerCase());
}

function cleanText(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function cleanNullableText(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || null;
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const next = Number(value);
  return Number.isFinite(next) ? Math.max(0, Math.round(next)) : undefined;
}

function cleanNullableNumber(value: unknown, present: boolean) {
  if (!present) return undefined;
  if (value === null || value === undefined || value === '') return null;
  const next = Number(value);
  return Number.isFinite(next) ? Math.max(0, Math.round(next)) : undefined;
}

function cleanTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return undefined;
}

function withoutDetailImageColumn(patch: Record<string, any>) {
  if (!Object.hasOwn(patch, 'detail_image_url')) return patch;
  const { detail_image_url: _detailImageUrl, ...rest } = patch;
  return rest;
}

function buildProductPatch(body: any, required: boolean) {
  const patch: Record<string, any> = {};
  const title = cleanText(body.title);
  const category = cleanNullableText(body.category);
  const subCategory = cleanNullableText(body.subCategory);
  const location = cleanNullableText(body.location);
  const imageUrl = cleanNullableText(body.imageUrl);
  const detailImageUrl = cleanNullableText(body.detailImageUrl);
  const price = cleanNumber(body.price);
  const originalPrice = cleanNullableNumber(body.originalPrice, Object.hasOwn(body, 'originalPrice'));
  const discount = cleanNullableNumber(body.discount, Object.hasOwn(body, 'discount'));
  const tags = cleanTags(body.tags);

  if (title !== undefined) patch.title = title;
  if (category !== undefined) patch.category = category;
  if (subCategory !== undefined) patch.sub_category = subCategory;
  if (location !== undefined) patch.location = location;
  if (imageUrl !== undefined) patch.image_url = imageUrl;
  if (detailImageUrl !== undefined) patch.detail_image_url = detailImageUrl;
  if (price !== undefined) patch.price = price;
  if (originalPrice !== undefined) patch.original_price = originalPrice;
  if (discount !== undefined) patch.discount = discount;
  if (tags !== undefined) {
    patch.tags = detailImageUrl !== undefined
      ? mergeProductDetailImageTag(tags, detailImageUrl)
      : tags;
  }

  if (required && !patch.title) return { error: '상품명을 입력해주세요.' };
  if (required && patch.price === undefined) return { error: '가격을 입력해주세요.' };
  if (required && patch.category === undefined) patch.category = 'dental';
  if (Object.keys(patch).length === 0) return { error: '변경할 상품 정보가 없습니다.' };

  return { patch };
}

async function getOwnedHospital() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };

  const admin = await createAdminClient();
  const { data: hospital } = await admin
    .from('hospitals')
    .select('id, slug, name')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (hospital) return { hospital };

  const { data: doctor } = await admin
    .from('doctors')
    .select('hospital_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (doctor?.hospital_id) {
    const { data: doctorHospital } = await admin
      .from('hospitals')
      .select('id, slug, name')
      .eq('id', doctor.hospital_id)
      .maybeSingle();
    if (doctorHospital) return { hospital: doctorHospital };
  }

  return { error: NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 }) };
}

async function getOwnedProduct(admin: Awaited<ReturnType<typeof createAdminClient>>, hospital: any, id: unknown): Promise<OwnedProductResult | { error: NextResponse }> {
  const productId = cleanText(id);
  if (!productId) return { error: NextResponse.json({ error: '상품 ID가 필요합니다.' }, { status: 400 }) };

  const withApproval = await admin
    .from('products')
    .select('id, hospital_id, status, approval_status')
    .eq('id', productId)
    .maybeSingle();

  if (withApproval.error && !isMissingApprovalColumn(withApproval.error)) {
    return { error: NextResponse.json({ error: withApproval.error.message }, { status: 400 }) };
  }

  let product = withApproval.data as OwnedProductResult['product'] | null;
  let approvalColumnsAvailable = !withApproval.error;

  if (withApproval.error && isMissingApprovalColumn(withApproval.error)) {
    const fallback = await admin
      .from('products')
      .select('id, hospital_id, status')
      .eq('id', productId)
      .maybeSingle();

    if (fallback.error) return { error: NextResponse.json({ error: fallback.error.message }, { status: 400 }) };
    product = fallback.data as OwnedProductResult['product'] | null;
    approvalColumnsAvailable = false;
  }

  if (!product || !hospitalKeys(hospital).includes(product.hospital_id)) {
    return { error: NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 }) };
  }

  return {
    product: product as OwnedProductResult['product'],
    approvalColumnsAvailable,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { hospital, error } = await getOwnedHospital();
  if (error) return error;

  const built = buildProductPatch(body, true);
  if (built.error) return NextResponse.json({ error: built.error }, { status: 400 });
  const productPatch = built.patch as Record<string, any>;

  const admin = await createAdminClient();
  let { data, error: insertError } = await admin
    .from('products')
    .insert({
      ...productPatch,
      hospital_id: hospital.id,
      status: 'paused',
      approval_status: 'pending_create',
      pending_changes: null,
    })
    .select('id, title, location, price, original_price, discount, rating, review_count, image_url, detail_image_url, tags, category, sub_category, status, approval_status, pending_changes, created_at')
    .single();

  if (insertError && isMissingProductColumn(insertError, 'detail_image_url')) {
    const retry = await admin
      .from('products')
      .insert({
        ...withoutDetailImageColumn(productPatch),
        hospital_id: hospital.id,
        status: 'paused',
        approval_status: 'pending_create',
        pending_changes: null,
      })
      .select('id, title, location, price, original_price, discount, rating, review_count, image_url, detail_image_url, tags, category, sub_category, status, approval_status, pending_changes, created_at')
      .single();
    data = retry.data;
    insertError = retry.error;
  }

  if (!insertError) return NextResponse.json({ ok: true, productId: data?.id, product: data, approvalRequired: true });
  if (!isMissingApprovalColumn(insertError)) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  let fallback = await admin
    .from('products')
    .insert({
      ...productPatch,
      hospital_id: hospital.id,
      status: 'active',
    })
    .select('id, title, location, price, original_price, discount, rating, review_count, image_url, detail_image_url, tags, category, sub_category, status, created_at')
    .single();

  if (fallback.error && isMissingProductColumn(fallback.error, 'detail_image_url')) {
    fallback = await admin
      .from('products')
      .insert({
        ...withoutDetailImageColumn(productPatch),
        hospital_id: hospital.id,
        status: 'active',
      })
      .select('id, title, location, price, original_price, discount, rating, review_count, image_url, tags, category, sub_category, status, created_at')
      .single();
  }

  if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
  return NextResponse.json({ ok: true, productId: fallback.data.id, product: fallback.data, approvalRequired: false });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { hospital, error } = await getOwnedHospital();
  if (error) return error;

  const built = buildProductPatch(body, false);
  if (built.error) return NextResponse.json({ error: built.error }, { status: 400 });
  const productPatch = built.patch as Record<string, any>;

  const admin = await createAdminClient();
  const owned = await getOwnedProduct(admin, hospital, body.id);
  if ('error' in owned) return owned.error;

  if (!owned.approvalColumnsAvailable) {
    let { error: updateError } = await admin
      .from('products')
      .update(productPatch)
      .eq('id', owned.product.id);

    if (updateError && isMissingProductColumn(updateError, 'detail_image_url')) {
      const retry = await admin
        .from('products')
        .update(withoutDetailImageColumn(productPatch))
        .eq('id', owned.product.id);
      updateError = retry.error;
    }

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
    return NextResponse.json({ ok: true, approvalRequired: false });
  }

  const approvalStatus = owned.product.approval_status ?? 'approved';
  const shouldKeepAsCreateRequest = approvalStatus === 'pending_create'
    || (approvalStatus === 'rejected' && owned.product.status !== 'active');
  const patch = shouldKeepAsCreateRequest
    ? { ...productPatch, approval_status: 'pending_create', pending_changes: null }
    : { approval_status: 'pending_update', pending_changes: productPatch };

  let { error: updateError } = await admin
    .from('products')
    .update(patch)
    .eq('id', owned.product.id);

  if (updateError && shouldKeepAsCreateRequest && isMissingProductColumn(updateError, 'detail_image_url')) {
    const retryPatch = { ...withoutDetailImageColumn(productPatch), approval_status: 'pending_create', pending_changes: null };
    const retry = await admin
      .from('products')
      .update(retryPatch)
      .eq('id', owned.product.id);
    updateError = retry.error;
  }

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  return NextResponse.json({ ok: true, approvalRequired: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { hospital, error } = await getOwnedHospital();
  if (error) return error;

  const admin = await createAdminClient();
  const owned = await getOwnedProduct(admin, hospital, body.id);
  if ('error' in owned) return owned.error;

  if (!owned.approvalColumnsAvailable) {
    const { error: updateError } = await admin
      .from('products')
      .update({ status: 'removed' })
      .eq('id', owned.product.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
    return NextResponse.json({ ok: true, approvalRequired: false });
  }

  if (
    owned.product.approval_status === 'pending_create'
    || (owned.product.approval_status === 'rejected' && owned.product.status !== 'active')
  ) {
    const { error: deleteError } = await admin.from('products').delete().eq('id', owned.product.id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
    return NextResponse.json({ ok: true, removedDraft: true });
  }

  const { error: updateError } = await admin
    .from('products')
    .update({ approval_status: 'pending_delete', pending_changes: null })
    .eq('id', owned.product.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  return NextResponse.json({ ok: true, approvalRequired: true });
}
