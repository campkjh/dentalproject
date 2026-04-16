import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { keyword } = await req.json();
  if (!keyword?.trim()) return NextResponse.json({ error: 'keyword required' }, { status: 400 });

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false });

  // Remove duplicates by keyword first (manual upsert by deleting old)
  await sb.from('recent_searches').delete().eq('user_id', user.id).eq('keyword', keyword.trim());

  const { error } = await sb
    .from('recent_searches')
    .insert({ user_id: user.id, keyword: keyword.trim() });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Trim to 10 most recent
  const { data: all } = await sb
    .from('recent_searches')
    .select('id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  const overflow = (all ?? []).slice(10).map((r) => r.id);
  if (overflow.length) {
    await sb.from('recent_searches').delete().in('id', overflow);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { keyword } = await req.json();
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false });

  if (keyword) {
    await sb.from('recent_searches').delete().eq('user_id', user.id).eq('keyword', keyword);
  } else {
    await sb.from('recent_searches').delete().eq('user_id', user.id);
  }
  return NextResponse.json({ ok: true });
}
