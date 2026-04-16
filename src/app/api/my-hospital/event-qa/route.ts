/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ qa: [] });

  const { data: hospitals } = await sb.from('hospitals').select('id').eq('owner_id', user.id);
  const ids = (hospitals ?? []).map((h: { id: string }) => h.id);
  if (!ids.length) return NextResponse.json({ qa: [] });

  const { data: events } = await sb.from('events').select('id, title').in('hospital_id', ids);
  const eventIds = (events ?? []).map((e: { id: string }) => e.id);
  if (!eventIds.length) return NextResponse.json({ qa: [] });

  const { data: qa, error } = await sb
    .from('event_qa')
    .select('*, user:profiles!event_qa_user_id_fkey (name), event:events!event_qa_event_id_fkey (title)')
    .in('event_id', eventIds)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ qa: qa ?? [] });
}
