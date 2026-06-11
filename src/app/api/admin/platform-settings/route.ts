/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ALLOWED_KEYS = new Set(['fee_policy']);

function isMissingTable(error: { message?: string; details?: string | null; hint?: string | null } | null) {
  if (!error) return false;
  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return text.includes('platform_settings') && (text.includes('does not exist') || text.includes('not found') || text.includes('relation'));
}

async function requireAdmin() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 }) };
  return { sb, user };
}

const DEFAULT_FEE_POLICY = {
  base_fee_percent: 15,
  premium_fee_percent: 12,
  settlement_cycle: 'monthly',
  minimum_payout: 100000,
};

export async function GET() {
  const check = await requireAdmin();
  if (check.error) return check.error;

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('platform_settings')
    .select('key, value, updated_at')
    .in('key', Array.from(ALLOWED_KEYS));

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({
        settings: { fee_policy: DEFAULT_FEE_POLICY },
        migration_required: true,
      });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const map: Record<string, any> = { fee_policy: DEFAULT_FEE_POLICY };
  for (const row of data ?? []) {
    map[row.key] = row.value;
  }
  return NextResponse.json({ settings: map });
}

export async function PUT(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const key = typeof body.key === 'string' ? body.key : '';
  const value = body.value;
  if (!ALLOWED_KEYS.has(key) || typeof value !== 'object' || value === null) {
    return NextResponse.json({ error: '지원하지 않는 설정입니다.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { error } = await admin.from('platform_settings').upsert({
    key,
    value,
    updated_by: check.user?.id ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ error: 'platform_settings 테이블이 없습니다. 마이그레이션 0013을 먼저 적용해주세요.' }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
