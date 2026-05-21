import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { postId } = await req.json();
    if (!postId) return NextResponse.json({ count: 0 });

    const admin = await createAdminClient();

    // 현재 카운트 읽기 → +1 업데이트 (admin: RLS 우회)
    const { data: cur } = await admin.from('posts').select('view_count').eq('id', postId).single();
    const newCount = (cur?.view_count ?? 0) + 1;
    await admin.from('posts').update({ view_count: newCount }).eq('id', postId);

    return NextResponse.json({ count: newCount });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
