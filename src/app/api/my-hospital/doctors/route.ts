import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { data: hospital } = await sb
    .from('hospitals')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!hospital) return NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 });

  const { data, error } = await sb
    .from('doctors')
    .insert({
      hospital_id: hospital.id,
      name: body.name ?? '',
      title: body.title ?? '원장',
      specialty: body.specialty ?? '',
      bio: body.bio ?? null,
      profile_image: body.profileImage ?? null,
      is_owner: false,
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
