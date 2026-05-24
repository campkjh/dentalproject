import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { pickCustomerProfileAvatarBySeed } from '@/lib/customer-profile-avatars';

export const dynamic = 'force-dynamic';

async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { commentId } = await req.json();
    if (!commentId) return NextResponse.json({ error: 'commentId required' }, { status: 400 });

    const sb = await createAuthClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    // profiles 행 없으면 자동 생성
    const { data: profile } = await sb.from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (!profile) {
      await sb.from('profiles').upsert({
        id: user.id,
        name: user.user_metadata?.name ?? '',
        login_type: 'email',
        country: '대한민국',
        profile_image: pickCustomerProfileAvatarBySeed(user.id),
      }, { onConflict: 'id', ignoreDuplicates: true });
    }

    const { data: existing } = await sb
      .from('comment_likes').select('user_id')
      .eq('comment_id', commentId).eq('user_id', user.id).maybeSingle();

    let liked: boolean;
    if (existing) {
      const { error } = await sb.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      liked = false;
    } else {
      const { error } = await sb.from('comment_likes').insert({ comment_id: commentId, user_id: user.id });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      liked = true;
    }

    const { count } = await sb.from('comment_likes').select('*', { count: 'exact', head: true }).eq('comment_id', commentId);

    return NextResponse.json({ liked, count: count ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '서버 오류' }, { status: 500 });
  }
}
