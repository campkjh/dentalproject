import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

// GET: 좋아요 상태 + 카운트 조회
export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get('postId');
  if (!postId) return NextResponse.json({ liked: false, count: 0 });

  try {
    const sb = await createAuthClient();
    const { data: { user } } = await sb.auth.getUser();

    const [{ count }, { data: userLike }] = await Promise.all([
      sb.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', postId),
      user
        ? sb.from('post_likes').select('user_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
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
    const { postId } = await req.json();
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

    const sb = await createAuthClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    // profiles 행 없으면 자동 생성 (FK 위반 방지)
    const { data: profile } = await sb.from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (!profile) {
      await sb.from('profiles').upsert({
        id: user.id,
        name: user.user_metadata?.name ?? '',
        login_type: 'email',
        country: '대한민국',
      }, { onConflict: 'id', ignoreDuplicates: true });
    }

    // 기존 좋아요 확인
    const { data: existing } = await sb
      .from('post_likes').select('user_id')
      .eq('post_id', postId).eq('user_id', user.id).maybeSingle();

    let liked: boolean;
    if (existing) {
      const { error } = await sb.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      if (error) return NextResponse.json({ error: '취소 실패: ' + error.message }, { status: 500 });
      liked = false;
    } else {
      const { error } = await sb.from('post_likes').insert({ post_id: postId, user_id: user.id });
      if (error) return NextResponse.json({ error: '좋아요 실패: ' + error.message }, { status: 500 });
      liked = true;
    }

    const { count } = await sb.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', postId);

    return NextResponse.json({ liked, count: count ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '서버 오류' }, { status: 500 });
  }
}
