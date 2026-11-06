/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { normalizeOptionalImage } from '@/lib/api/normalize';
import { isMissingTable, reviewerName, type ReviewerProfile } from '@/lib/reviewer';

// 리뷰어 프로필(261101) — 이름·그 사람이 쓴 리뷰 전부·평균 별점·팔로워/팔로잉 수·내가 팔로우 중인지.
// 리뷰는 공개(카탈로그와 같은 내용)라 관리자 키로 읽되, 밖으로는 카드에 보이던 칸만 싣는다.
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: '사용자를 찾을 수 없어요.' }, { status: 404 });

  const sb = await createClient();
  const { data: { user: viewer } } = await sb.auth.getUser();
  const admin = await createAdminClient();

  const { data: profile } = await admin.from('profiles').select('id, name, is_doctor, created_at').eq('id', id).maybeSingle();
  if (!profile) return NextResponse.json({ error: '사용자를 찾을 수 없어요.' }, { status: 404 });

  const [reviewsRes, followers, following, mine] = await Promise.all([
    sb
      .from('reviews')
      .select(`id, rating, content, treatment_name, total_cost, treatment_date, before_image, after_image, created_at,
         product:products (id, title, image_url),
         hospital:hospitals (name),
         doctor:doctors (name)`)
      .eq('author_id', id)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .limit(200),
    // head:true 는 표가 없어도 에러를 안 돌려줘서(본문 없음) limit(1) 로 센다 — 표 없음(0022 전)을 알아채려고
    admin.from('user_follows').select('follower_id', { count: 'exact' }).eq('following_id', id).limit(1),
    admin.from('user_follows').select('following_id', { count: 'exact' }).eq('follower_id', id).limit(1),
    viewer && viewer.id !== id
      ? admin.from('user_follows').select('follower_id').eq('follower_id', viewer.id).eq('following_id', id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (reviewsRes.error) return NextResponse.json({ error: reviewsRes.error.message }, { status: 500 });
  const followReady = !isMissingTable(followers.error?.code);

  const reviews = ((reviewsRes.data ?? []) as any[]).map((r) => ({
    id: r.id,
    rating: Number(r.rating ?? 0),
    content: r.content ?? '',
    date: r.created_at ? new Date(r.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
    treatmentName: r.treatment_name ?? '',
    treatmentDate: r.treatment_date ?? '',
    totalCost: r.total_cost ?? 0,
    beforeImage: normalizeOptionalImage(r.before_image),
    afterImage: normalizeOptionalImage(r.after_image),
    doctorName: r.doctor?.name ?? undefined,
    product: r.product ? { id: r.product.id, title: r.product.title, imageUrl: r.product.image_url ?? null } : null,
    hospitalName: r.hospital?.name ?? null,
  }));
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const body: ReviewerProfile = {
    user: { id: profile.id, name: reviewerName(profile.name), isDoctor: !!profile.is_doctor, joinedAt: profile.created_at ?? null },
    stats: {
      reviewCount: reviews.length,
      avgRating: Math.round(avgRating * 10) / 10,
      followerCount: followers.count ?? 0,
      followingCount: following.count ?? 0,
    },
    reviews,
    isMe: viewer?.id === id,
    isFollowing: !!mine.data,
    followReady,
  };
  return NextResponse.json(body);
}
