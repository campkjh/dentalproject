/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function ownerHospital(sb: any, userId: string) {
  const { data } = await sb.from('hospitals').select('id').eq('owner_id', userId).maybeSingle();
  return data?.id ?? null;
}

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ads: [] });

  const hospitalId = await ownerHospital(sb, user.id);
  if (!hospitalId) return NextResponse.json({ ads: [] });

  const { data } = await sb
    .from('hospital_ads')
    .select('*, event:events (id, title)')
    .eq('hospital_id', hospitalId)
    .order('created_at', { ascending: false });
  return NextResponse.json({ ads: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const hospitalId = await ownerHospital(sb, user.id);
  if (!hospitalId) return NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 });

  const { data, error } = await sb
    .from('hospital_ads')
    .insert({
      hospital_id: hospitalId,
      event_id: body.eventId ?? null,
      name: body.name ?? '',
      type: body.type ?? 'cpv',
      budget: body.budget ?? 0,
      start_at: body.startAt ?? null,
      end_at: body.endAt ?? null,
      status: 'active',
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
