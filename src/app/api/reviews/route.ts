/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function resolveHospitalId(sb: any, hospitalIdOrSlug: string | null) {
  if (!hospitalIdOrSlug) return null;
  if (/^[0-9a-f]{8}-/.test(hospitalIdOrSlug)) return hospitalIdOrSlug;
  const { data } = await sb.from('hospitals').select('id').eq('slug', hospitalIdOrSlug).maybeSingle();
  return data?.id ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const hospitalId = await resolveHospitalId(sb, body.hospitalId ?? null);
  const productId = body.productId && /^[0-9a-f]{8}-/.test(body.productId) ? body.productId : null;
  const doctorId = body.doctorId && /^[0-9a-f]{8}-/.test(body.doctorId) ? body.doctorId : null;

  const { data, error } = await sb
    .from('reviews')
    .insert({
      author_id: user.id,
      hospital_id: hospitalId,
      product_id: productId,
      doctor_id: doctorId,
      rating: Number(body.rating ?? 5),
      content: body.content ?? '',
      treatment_name: body.treatmentName ?? null,
      treatment_date: body.treatmentDate ?? null,
      total_cost: body.totalCost ?? 0,
      before_image: body.beforeImage ?? null,
      after_image: body.afterImage ?? null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Award 500P (idempotent: only on first review per reservation/product/day)
  await sb.from('point_history').insert({
    user_id: user.id,
    type: 'earn',
    description: '후기작성',
    amount: 500,
  });
  // Bump cached profile.points
  const { data: profile } = await sb.from('profiles').select('points').eq('id', user.id).maybeSingle();
  if (profile) {
    await sb.from('profiles').update({ points: (profile.points ?? 0) + 500 }).eq('id', user.id);
  }

  return NextResponse.json({ id: data.id });
}
