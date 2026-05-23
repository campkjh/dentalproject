/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function isMissingProductColumn(error: { message?: string; details?: string | null; hint?: string | null } | null, column: string) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return text.includes(column.toLowerCase());
}

function withoutDetailImageColumn(patch: Record<string, any>) {
  if (!Object.hasOwn(patch, 'detail_image_url')) return patch;
  const { detail_image_url: _detailImageUrl, ...rest } = patch;
  return rest;
}

async function requireAdmin() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 }) };

  return { user };
}

export async function GET() {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) return adminCheck.error;

  const admin = await createAdminClient();
  const productsRes = await admin
    .from('products')
    .select(
      `id, title, category, price, original_price, discount, rating, review_count, status,
       approval_status, pending_changes, created_at,
       hospital:hospitals (name)`
    )
    .order('created_at', { ascending: false })
    .limit(500);
  let data: any[] | null = productsRes.data;
  let error = productsRes.error;

  if (error) {
    const fallback = await admin
      .from('products')
      .select(
        `id, title, category, price, original_price, discount, rating, review_count, status, created_at,
         hospital:hospitals (name)`
      )
      .order('created_at', { ascending: false })
      .limit(500);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const products = (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.title,
    hospital: p.hospital?.name ?? '-',
    category: p.category ?? '미분류',
    originalPrice: p.original_price ?? p.price ?? 0,
    discountPrice: p.price ?? 0,
    rating: Number(p.rating ?? 0),
    reviews: p.review_count ?? 0,
    status: p.status,
    approvalStatus: p.approval_status ?? 'approved',
    pendingChanges: p.pending_changes ?? null,
    createdAt: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : '',
  }));

  return NextResponse.json({ products });
}

export async function PATCH(req: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) return adminCheck.error;

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  const action = body.action === 'approve' || body.action === 'reject' ? body.action : null;
  if (!id || !action) {
    return NextResponse.json({ error: '상품 ID와 처리 액션이 필요합니다.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data: product, error: findError } = await admin
    .from('products')
    .select('id, status, approval_status, pending_changes')
    .eq('id', id)
    .maybeSingle();

  if (findError) return NextResponse.json({ error: findError.message }, { status: 400 });
  if (!product) return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });

  const approvalStatus = product.approval_status ?? 'approved';
  if (!approvalStatus.startsWith('pending_')) {
    return NextResponse.json({ error: '승인 대기 중인 상품이 아닙니다.' }, { status: 400 });
  }

  if (action === 'reject') {
    const { error } = await admin
      .from('products')
      .update({
        approval_status: 'rejected',
        pending_changes: null,
        ...(approvalStatus === 'pending_create' ? { status: 'paused' } : {}),
      })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const patch: Record<string, any> = { approval_status: 'approved', pending_changes: null };
  if (approvalStatus === 'pending_create') {
    patch.status = 'active';
  }
  if (approvalStatus === 'pending_update') {
    Object.assign(patch, product.pending_changes ?? {});
  }
  if (approvalStatus === 'pending_delete') {
    patch.status = 'removed';
  }

  let { error } = await admin.from('products').update(patch).eq('id', id);
  if (error && isMissingProductColumn(error, 'detail_image_url')) {
    const retry = await admin.from('products').update(withoutDetailImageColumn(patch)).eq('id', id);
    error = retry.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
