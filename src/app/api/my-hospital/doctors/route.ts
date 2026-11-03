import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getOwnedHospital } from '@/lib/owned-hospital';
import { sanitizeCareers } from '@/lib/doctor-careers';

export const dynamic = 'force-dynamic';

function isMissingDoctorColumn(error: { message?: string; details?: string | null; hint?: string | null } | null, column: string) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return text.includes(column.toLowerCase()) || text.includes(`doctors.${column.toLowerCase()}`);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { hospital, error: ownedError } = await getOwnedHospital({ ownerOnly: true });
  if (ownedError) return ownedError;

  const admin = await createAdminClient();
  const insertPayload = {
      hospital_id: hospital.id,
      name: body.name ?? '',
      title: body.title ?? '원장',
      specialty: body.specialty ?? '',
      bio: body.bio ?? null,
      profile_image: body.profileImage ?? null,
      careers: sanitizeCareers(body.careers) ?? [],
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
