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
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const hospitalId = await ownerHospital(sb, user.id);
  if (!hospitalId) return NextResponse.json({ events: [] });

  const { data, error } = await sb
    .from('events')
    .select('*')
    .eq('hospital_id', hospitalId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ events: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const hospitalId = await ownerHospital(sb, user.id);
  if (!hospitalId) return NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 });

  const { data, error } = await sb
    .from('events')
    .insert({
      hospital_id: hospitalId,
      title: body.title ?? '',
      description: body.description ?? null,
      image_url: body.imageUrl ?? null,
      original_price: body.originalPrice ?? null,
      sale_price: body.salePrice ?? null,
      discount_percent: body.discountPercent ?? null,
      start_at: body.startAt ?? null,
      end_at: body.endAt ?? null,
      status: body.status ?? 'pending',
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
