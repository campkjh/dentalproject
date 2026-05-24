import { NextResponse, type NextRequest } from 'next/server';
import { pickCustomerProfileAvatarBySeed } from '@/lib/customer-profile-avatars';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET: 좋아요 상태 + 카운트 (posts.like_count 읽기)
export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get('postId');
  if (!postId) return NextResponse.json({ liked: false, count: 0 });

  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();

    const admin = await createAdminClient();
    const { data: postData } = await admin
      .from('posts').select('like_count').eq('id', postId).maybeSingle();
    const count = postData?.like_count ?? 0;

    let liked = false;
    if (user) {
      const { data } = await admin
        .from('post_likes').select('user_id')
        .eq('post_id', postId).eq('user_id', user.id).maybeSingle();
      liked = !!data;
    }

    return NextResponse.json({ liked, count });
  } catch {
    return NextResponse.json({ liked: false, count: 0 });
  }
}

// POST: 좋아요 토글
export async function POST(req: NextRequest) {
  try {
    const { postId } = await req.json();
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

    // 유저 인증
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const admin = await createAdminClient();

    // profiles 없으면 자동 생성 (FK 위반 방지)
    const { data: profile } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (!profile) {
      await admin.from('profiles').upsert({
        id: user.id,
        name: user.user_metadata?.name ?? '',
        login_type: 'email',
        country: '대한민국',
        profile_image: pickCustomerProfileAvatarBySeed(user.id),
      }, { onConflict: 'id', ignoreDuplicates: true });
    }

    // 기존 좋아요 확인
    const { data: existing } = await admin
      .from('post_likes').select('user_id')
      .eq('post_id', postId).eq('user_id', user.id).maybeSingle();

    if (existing) {
      const { error } = await admin.from('post_likes').delete()
        .eq('post_id', postId).eq('user_id', user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await admin.from('post_likes').insert({ post_id: postId, user_id: user.id });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 트리거가 posts.like_count 갱신 → 정확한 카운트 읽기
    const { data: postData } = await admin.from('posts').select('like_count').eq('id', postId).maybeSingle();
    const liked = !existing;
    const count = postData?.like_count ?? 0;

    return NextResponse.json({ liked, count });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '서버 오류' }, { status: 500 });
  }
}
