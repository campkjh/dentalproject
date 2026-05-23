/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isMissingHomeBannersTable, normalizeHomeBanner } from '@/lib/home-banners';

export const dynamic = 'force-dynamic';

const selectColumns =
  'id, title, subtitle, image_url, mobile_image_url, target_url, badge_text, sort_order, is_active, starts_at, ends_at, created_at, updated_at';

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

function tableMissingResponse() {
  return NextResponse.json(
    { error: 'home_banners 테이블이 없습니다. supabase/migrations/0011_home_banners.sql 마이그레이션을 적용해주세요.' },
    { status: 500 }
  );
}

function toNullableString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toNullableDate(value: unknown) {
  const text = toNullableString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildPatch(body: Record<string, any>) {
  const patch: Record<string, any> = {};

  if (Object.hasOwn(body, 'title')) patch.title = String(body.title ?? '').trim();
  if (Object.hasOwn(body, 'subtitle')) patch.subtitle = toNullableString(body.subtitle);
  if (Object.hasOwn(body, 'imageUrl')) patch.image_url = String(body.imageUrl ?? '').trim();
  if (Object.hasOwn(body, 'mobileImageUrl')) patch.mobile_image_url = toNullableString(body.mobileImageUrl);
  if (Object.hasOwn(body, 'targetUrl')) patch.target_url = toNullableString(body.targetUrl);
  if (Object.hasOwn(body, 'badgeText')) patch.badge_text = toNullableString(body.badgeText);
  if (Object.hasOwn(body, 'sortOrder')) patch.sort_order = Number(body.sortOrder) || 0;
  if (Object.hasOwn(body, 'isActive')) patch.is_active = Boolean(body.isActive);
  if (Object.hasOwn(body, 'startsAt')) patch.starts_at = toNullableDate(body.startsAt);
  if (Object.hasOwn(body, 'endsAt')) patch.ends_at = toNullableDate(body.endsAt);

  return patch;
}

export async function GET() {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) return adminCheck.error;

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('home_banners')
    .select(selectColumns)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingHomeBannersTable(error)) return tableMissingResponse();
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ banners: (data ?? []).map(normalizeHomeBanner) });
}

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) return adminCheck.error;

  const body = await req.json().catch(() => ({}));
  const patch = buildPatch(body);
  if (!patch.title) return NextResponse.json({ error: '배너 제목을 입력해주세요.' }, { status: 400 });
  if (!patch.image_url) return NextResponse.json({ error: '배너 이미지를 업로드하거나 URL을 입력해주세요.' }, { status: 400 });

  const admin = await createAdminClient();
  const { data, error } = await admin.from('home_banners').insert(patch).select(selectColumns).single();

  if (error) {
    if (isMissingHomeBannersTable(error)) return tableMissingResponse();
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ banner: normalizeHomeBanner(data) });
}

export async function PATCH(req: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) return adminCheck.error;

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: '배너 ID가 필요합니다.' }, { status: 400 });

  const patch = buildPatch(body);
  if (Object.hasOwn(patch, 'title') && !patch.title) {
    return NextResponse.json({ error: '배너 제목을 입력해주세요.' }, { status: 400 });
  }
  if (Object.hasOwn(patch, 'image_url') && !patch.image_url) {
    return NextResponse.json({ error: '배너 이미지를 업로드하거나 URL을 입력해주세요.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('home_banners')
    .update(patch)
    .eq('id', id)
    .select(selectColumns)
    .single();

  if (error) {
    if (isMissingHomeBannersTable(error)) return tableMissingResponse();
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ banner: normalizeHomeBanner(data) });
}

export async function DELETE(req: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) return adminCheck.error;

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: '배너 ID가 필요합니다.' }, { status: 400 });

  const admin = await createAdminClient();
  const { error } = await admin.from('home_banners').delete().eq('id', id);

  if (error) {
    if (isMissingHomeBannersTable(error)) return tableMissingResponse();
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

