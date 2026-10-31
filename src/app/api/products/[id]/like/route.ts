import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

// 상품 좋아요(261031) — product_likes(0018). 표가 아직 없으면 missing:true 로 알려 주고, 화면은 기기에만 기억한다.
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const isMissingTable = (code?: string) => code === '42P01' || code === 'PGRST205';

async function requireUser() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  return { sb, user };
}

// 받은 하트·포켓 수 — 상세 '평점·리뷰' 줄에 같이 보인다(누가 눌렀는지는 안 내보낸다, 수만)
async function counts(id: string) {
  try {
    const admin = await createAdminClient();
    const [likes, pockets] = await Promise.all([
      admin.from('product_likes').select('product_id', { count: 'exact', head: true }).eq('product_id', id),
      admin.from('wishlists').select('product_id', { count: 'exact', head: true }).eq('product_id', id),
    ]);
    return { likeCount: likes.count ?? 0, pocketCount: pockets.count ?? 0 };
  } catch {
    return {};
  }
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { sb, user } = await requireUser();
  const total = await counts(id);
  if (!user) return NextResponse.json({ liked: false, ...total });
  const { data, error } = await sb.from('product_likes').select('product_id').eq('user_id', user.id).eq('product_id', id).maybeSingle();
  if (error) return NextResponse.json({ liked: false, missing: isMissingTable(error.code), ...total }, { status: isMissingTable(error.code) ? 200 : 400 });
  return NextResponse.json({ liked: !!data, ...total });
}

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { sb, user } = await requireUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { error } = await sb.from('product_likes').insert({ user_id: user.id, product_id: id });
  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message, missing: isMissingTable(error.code) }, { status: isMissingTable(error.code) ? 200 : 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { sb, user } = await requireUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { error } = await sb.from('product_likes').delete().eq('user_id', user.id).eq('product_id', id);
  if (error) return NextResponse.json({ error: error.message, missing: isMissingTable(error.code) }, { status: isMissingTable(error.code) ? 200 : 400 });
  return NextResponse.json({ ok: true });
}
