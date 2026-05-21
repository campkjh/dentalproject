import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { postId } = await req.json();
    if (!postId) return NextResponse.json({ count: 0 });

    // admin client로 원자적 증가 시도
    try {
      const admin = await createAdminClient();
      const { data: cur } = await admin.from('posts').select('view_count').eq('id', postId).maybeSingle();
      const newCount = (cur?.view_count ?? 0) + 1;
      await admin.from('posts').update({ view_count: newCount }).eq('id', postId);
      return NextResponse.json({ count: newCount });
    } catch {
      // admin client 실패 시 SECURITY DEFINER RPC fallback
      const sb = await createClient();
      await sb.rpc('increment_view_count', { p_post_id: postId });
      const { data } = await sb.from('posts').select('view_count').eq('id', postId).maybeSingle();
      return NextResponse.json({ count: data?.view_count ?? 0 });
    }
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
