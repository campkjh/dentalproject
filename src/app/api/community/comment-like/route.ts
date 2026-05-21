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

async function ensureProfile(admin: Awaited<ReturnType<typeof createAdminClient>>, userId: string) {
  const { data } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (!data) {
    await admin.from('profiles').upsert({
      id: userId, name: '', login_type: 'email', country: '대한민국',
    }, { onConflict: 'id', ignoreDuplicates: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { commentId } = await req.json();
    if (!commentId) return NextResponse.json({ error: 'commentId required' }, { status: 400 });

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const admin = await createAdminClient();
    await ensureProfile(admin, user.id);

    const { data: existing } = await admin
      .from('comment_likes')
      .select('user_id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();

    let liked: boolean;
    if (existing) {
      const { error } = await admin.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      liked = false;
    } else {
      const { error } = await admin.from('comment_likes').insert({ comment_id: commentId, user_id: user.id });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      liked = true;
    }

    const { count } = await admin
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    await admin.from('comments').update({ like_count: count ?? 0 }).eq('id', commentId);

    return NextResponse.json({ liked, count: count ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '서버 오류' }, { status: 500 });
  }
}
