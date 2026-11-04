import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityViewer } from '@/lib/community-viewer';
import { communityPostFromRow, type CommunityPostRow } from '@/lib/community';
import { loadOwnPostRows } from '@/lib/own-posts';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await createClient();
  const viewer = await getCommunityViewer(client);
  if (!viewer.id) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { data, error } = await loadOwnPostRows(client, viewer.id, viewer.doctor);
  if (error) return NextResponse.json({ error: '내가 쓴 글을 불러오지 못했어요.' }, { status: 500 });
  return NextResponse.json({ userId: viewer.id, posts: ((data ?? []) as unknown as CommunityPostRow[]).map(communityPostFromRow) },
    { headers: { 'Cache-Control': 'private, no-store' } });
}
