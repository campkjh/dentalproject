import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

async function getAuthUser() {
  const cookieStore = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

// profiles 행이 없으면 자동 생성 (FK 위반 방지)
async function ensureProfile(admin: Awaited<ReturnType<typeof createAdminClient>>, userId: string) {
  const { data } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (!data) {
    await admin.from('profiles').upsert({
      id: userId,
      name: '',
      login_type: 'email',
      country: '대한민국',
    }, { onConflict: 'id', ignoreDuplicates: true });
  }
}

// GET: 좋아요 상태 + 카운트 조회
export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get('postId');
  if (!postId) return NextResponse.json({ liked: false, count: 0 });

  try {
    const admin = await createAdminClient();
    const user = await getAuthUser();

    const [{ count }, { data: userLike }] = await Promise.all([
      admin.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', postId),
      user
        ? admin.from('post_likes').select('user_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return NextResponse.json({ liked: !!userLike, count: count ?? 0 });
  } catch {
    return NextResponse.json({ liked: false, count: 0 });
  }
}

// POST: 좋아요 토글
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId } = body;
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const admin = await createAdminClient();

    // profiles 행 보장 (FK 위반 방지)
    await ensureProfile(admin, user.id);

    const { data: existing } = await admin
      .from('post_likes')
      .select('user_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    let liked: boolean;
    if (existing) {
      const { error } = await admin.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      liked = false;
    } else {
      const { error } = await admin.from('post_likes').insert({ post_id: postId, user_id: user.id });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      liked = true;
    }

    const { count } = await admin
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    await admin.from('posts').update({ like_count: count ?? 0 }).eq('id', postId);

    return NextResponse.json({ liked, count: count ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '서버 오류' }, { status: 500 });
  }
}
