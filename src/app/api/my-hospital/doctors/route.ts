import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function isMissingDoctorColumn(error: { message?: string; details?: string | null; hint?: string | null } | null, column: string) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return text.includes(column.toLowerCase()) || text.includes(`doctors.${column.toLowerCase()}`);
}

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

  const admin = await createAdminClient();
  const insertPayload = {
      hospital_id: hospital.id,
      name: body.name ?? '',
      title: body.title ?? '원장',
      specialty: body.specialty ?? '',
      bio: body.bio ?? null,
      profile_image: body.profileImage ?? null,
      is_owner: false,
      is_active: true,
      member_status: 'active',
  };

  let { data, error } = await admin
    .from('doctors')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error && (isMissingDoctorColumn(error, 'is_active') || isMissingDoctorColumn(error, 'member_status'))) {
    const fallbackPayload = { ...insertPayload };
    delete (fallbackPayload as Partial<typeof insertPayload>).is_active;
    delete (fallbackPayload as Partial<typeof insertPayload>).member_status;
    const fallback = await admin
      .from('doctors')
      .insert(fallbackPayload)
      .select('id')
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data?.id });
}
