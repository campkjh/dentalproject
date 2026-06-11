import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  readSearchPromoFromBlob,
  writeSearchPromoToBlob,
} from '@/lib/search-promo-blob-store';

export const dynamic = 'force-dynamic';

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

  const { promo } = await readSearchPromoFromBlob();

  let title: string | null = null;
  if (promo.productId && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const sb = await createClient();
    const { data } = await sb
      .from('products')
      .select('title')
      .eq('id', promo.productId)
      .maybeSingle();
    title = data?.title ?? null;
  }

  return NextResponse.json({ promo: { productId: promo.productId, title } });
}

export async function PUT(req: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) return adminCheck.error;

  let body: { productId?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  const productId =
    typeof body.productId === 'string' && body.productId.trim() ? body.productId.trim() : null;

  await writeSearchPromoToBlob({ productId });
  return NextResponse.json({ promo: { productId } });
}
