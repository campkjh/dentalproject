/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isMissingTable, reviewerName, type FollowUser } from '@/lib/reviewer';

// 팔로워·팔로잉 목록(261101) — ?type=followers(나를 팔로우) | following(내가 팔로우). 최근 순 200명.
// 한 줄 = 이름 · 리뷰 수 · 내가 그 사람을 팔로우 중인지(목록에서 바로 팔로우 버튼).
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const type = req.nextUrl.searchParams.get('type') === 'following' ? 'following' : 'followers';
  const sb = await createClient();
  const { data: { user: viewer } } = await sb.auth.getUser();
  const admin = await createAdminClient();

  const [mine, other] = type === 'followers' ? ['following_id', 'follower_id'] : ['follower_id', 'following_id'];
  const { data: rows, error } = await admin
    .from('user_follows')
    .select(`${other}, created_at`)
    .eq(mine, id)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    if (isMissingTable(error.code)) return NextResponse.json({ users: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = ((rows ?? []) as any[]).map((r) => r[other] as string);
  if (ids.length === 0) return NextResponse.json({ users: [] });

  const [profiles, reviews, viewerFollows] = await Promise.all([
    admin.from('profiles').select('id, name').in('id', ids),
    admin.from('reviews').select('author_id').in('author_id', ids),
    viewer
      ? admin.from('user_follows').select('following_id').eq('follower_id', viewer.id).in('following_id', ids)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const nameOf = new Map(((profiles.data ?? []) as any[]).map((p) => [p.id, p.name]));
  const reviewCount = new Map<string, number>();
  for (const r of (reviews.data ?? []) as any[]) reviewCount.set(r.author_id, (reviewCount.get(r.author_id) ?? 0) + 1);
  const followed = new Set(((viewerFollows.data ?? []) as any[]).map((r) => r.following_id));

  const users: FollowUser[] = ids
    .filter((uid) => nameOf.has(uid))
    .map((uid) => ({
      id: uid,
      name: reviewerName(nameOf.get(uid)),
      reviewCount: reviewCount.get(uid) ?? 0,
      isFollowing: followed.has(uid),
      isMe: viewer?.id === uid,
    }));
  return NextResponse.json({ users });
}
