import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { postId } = await req.json();
    if (!postId) return NextResponse.json({ count: 0 });

    const cookieStore = await cookies();
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    // SECURITY DEFINER RPC로 view_count 증가 (RLS 우회)
    await sb.rpc('increment_view_count', { p_post_id: postId });

    // 최신 view_count 반환
    const { data } = await sb.from('posts').select('view_count').eq('id', postId).single();

    return NextResponse.json({ count: data?.view_count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
