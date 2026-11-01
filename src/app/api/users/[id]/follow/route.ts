import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isMissingTable, reviewerHref, reviewerName } from '@/lib/reviewer';

// 리뷰어 팔로우(261101) — POST 팔로우 · DELETE 끊기. 처음 팔로우할 때만 상대에게 알림 한 줄.
// 응답 = 지금 팔로우 여부 + 상대 팔로워 수(버튼 옆 숫자를 바로 맞춘다).
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

async function followerCount(id: string) {
  const admin = await createAdminClient();
  const { count } = await admin.from('user_follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', id);
  return count ?? 0;
}

async function requireUser() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  return { sb, user };
}

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { sb, user } = await requireUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (user.id === id) return NextResponse.json({ error: '나는 팔로우할 수 없어요.' }, { status: 400 });

  const admin = await createAdminClient();
  const { data: target } = await admin.from('profiles').select('id').eq('id', id).maybeSingle();
  if (!target) return NextResponse.json({ error: '사용자를 찾을 수 없어요.' }, { status: 404 });

  const { error } = await sb.from('user_follows').insert({ follower_id: user.id, following_id: id });
  if (error && error.code !== '23505') {
    const missing = isMissingTable(error.code);
    return NextResponse.json({ error: missing ? '팔로우를 준비 중이에요. 잠시 후 다시 시도해 주세요.' : error.message }, { status: missing ? 503 : 400 });
  }

  // 새로 팔로우했을 때만 알림(이미 팔로우 중이던 다시 누름은 조용히)
  if (!error) {
    const { data: me } = await admin.from('profiles').select('name').eq('id', user.id).maybeSingle();
    await admin.from('notifications').insert({
      user_id: id,
      type: 'info',
      title: '새 팔로워',
      content: `${reviewerName(me?.name)}님이 회원님을 팔로우했어요.`,
      link: reviewerHref(user.id),
    });
  }
  return NextResponse.json({ following: true, followerCount: await followerCount(id) });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { sb, user } = await requireUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { error } = await sb.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: isMissingTable(error.code) ? 503 : 400 });
  return NextResponse.json({ following: false, followerCount: await followerCount(id) });
}
