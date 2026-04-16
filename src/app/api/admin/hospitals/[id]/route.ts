import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { sb, isAdmin: false };
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  return { sb, isAdmin: !!profile?.is_admin };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { sb, isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const status = body.status;
  if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
    return NextResponse.json({ error: '잘못된 상태값' }, { status: 400 });
  }
  const { error } = await sb.from('hospitals').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
