import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const patch: Record<string, unknown> = {};
  if (typeof body.name === 'string') patch.name = body.name;
  if (typeof body.phone === 'string') patch.phone = body.phone;
  if (typeof body.gender === 'string') patch.gender = body.gender;
  if (typeof body.birthYear === 'string') patch.birth_year = body.birthYear;
  if (typeof body.country === 'string') patch.country = body.country;
  if (typeof body.profileImage === 'string') patch.profile_image = body.profileImage;

  const { error } = await sb.from('profiles').update(patch).eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
