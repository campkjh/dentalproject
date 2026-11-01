import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { communityPostFromRow, isDoctorOnlyBoard, type CommunityPostRow } from '@/lib/community';
import { canSeeSecretPost, getCommunityViewer, isMissingSecretColumn } from '@/lib/community-viewer';

// 커뮤니티 글 포켓(261101) — 상품 포켓(/api/wishlist)과 같은 결. 표 = post_pockets(0021).
//  · GET = 내가 담은 글(최근 담은 순). 지금 볼 수 없는 글(의사 라운지·남의 비밀글)은 /api/posts 와 같은 판정으로 뺀다.
//  · 0021 적용 전엔 GET 은 빈 목록, 담기·빼기는 '준비 중' 안내.
export const dynamic = 'force-dynamic';

const NOT_READY = '글 포켓을 준비하고 있어요. 잠시 뒤 다시 시도해 주세요.';

/** post_pockets 표가 아직 없을 때 나는 오류인지 */
function isMissingTable(error: { code?: string; message?: string } | null | undefined) {
  return Boolean(error && (error.code === '42P01' || error.code === 'PGRST205' || /post_pockets/.test(error.message ?? '')));
}

async function requireUser() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return { sb, user };
}

export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const { sb, user } = await requireUser();
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401, headers });

    const { data: pockets, error } = await sb
      .from('post_pockets')
      .select('post_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      if (isMissingTable(error)) return NextResponse.json({ posts: [] }, { headers });
      return NextResponse.json({ error: error.message }, { status: 500, headers });
    }
    const ids = (pockets ?? []).map((p) => p.post_id as string);
    if (ids.length === 0) return NextResponse.json({ posts: [] }, { headers });

    const viewer = await getCommunityViewer(sb);
    const run = (secretColumn: boolean) => sb
      .from('posts')
      .select(
        `id, board_type, title, content, author_id, view_count, like_count, comment_count,
         tags, has_answer, answer_count, is_anonymous, anonymous_id, image_url,${secretColumn ? ' is_secret,' : ''}
         thumbnail_url, created_at, author:profiles!posts_author_id_fkey(name, is_doctor, profile_image)`
      )
      .in('id', ids);
    let { data, error: postsError } = await run(true);
    if (isMissingSecretColumn(postsError)) ({ data, error: postsError } = await run(false)); // 0019 적용 전
    if (postsError) return NextResponse.json({ error: postsError.message }, { status: 500, headers });

    const rows = new Map(((data as unknown as CommunityPostRow[]) ?? []).map((row) => [row.id, row]));
    const posts = ids
      .map((id) => rows.get(id))
      .filter((row): row is CommunityPostRow => Boolean(row))
      .filter((row) => (viewer.doctor || !isDoctorOnlyBoard(row.board_type)) && canSeeSecretPost(row, viewer))
      .map(communityPostFromRow);
    return NextResponse.json({ posts }, { headers });
  } catch {
    return NextResponse.json({ error: '포켓에 담은 글을 불러오지 못했습니다.' }, { status: 500, headers });
  }
}

export async function POST(req: NextRequest) {
  const { postId } = await req.json().catch(() => ({}));
  if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

  const { sb, user } = await requireUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { error } = await sb.from('post_pockets').insert({ user_id: user.id, post_id: postId });
  if (error && error.code !== '23505') {
    if (isMissingTable(error)) return NextResponse.json({ error: NOT_READY }, { status: 503 });
    if (error.code === '23503') return NextResponse.json({ error: '글을 찾을 수 없어요.' }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { postId } = await req.json().catch(() => ({}));
  if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

  const { sb, user } = await requireUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { error } = await sb.from('post_pockets').delete().eq('user_id', user.id).eq('post_id', postId);
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: NOT_READY }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
