/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/hospital-applications
 * Body: {
 *   registerType: 'hospital' | 'doctor',
 *   specialty: string,
 *   treatments: string[],
 *   hospitalInfo: { name, ownerName, phone, businessNumber },
 *   operatingHours: [{ day, start, end, closed }],
 *   doctorInfo?: { name, specialty, licenseNumber },
 * }
 * Creates a hospital row with status='pending', operating_hours, optional doctor.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const hospitalInfo = body.hospitalInfo ?? {};
  const doctorInfo = body.doctorInfo ?? {};
  const ohList: Array<{ day: string; start?: string; end?: string; closed?: boolean }> =
    Array.isArray(body.operatingHours) ? body.operatingHours : [];

  if (!hospitalInfo.name?.trim()) {
    return NextResponse.json({ error: '병원명을 입력해 주세요.' }, { status: 400 });
  }

  // Validate categoy id exists; fallback to 'dental'
  const specialty: string = body.specialty || 'dental';
  const { data: catRow } = await sb.from('categories').select('id').eq('id', specialty).maybeSingle();
  const category = catRow?.id ?? 'dental';

  // 1. Insert hospital (pending status, owner_id = current user)
  const { data: hospital, error: hospitalError } = await sb
    .from('hospitals')
    .insert({
      name: hospitalInfo.name.trim(),
      category,
      phone: hospitalInfo.phone ?? null,
      tags: Array.isArray(body.treatments) ? body.treatments : [],
      cover_images: [],
      address: '',
      owner_id: user.id,
      status: 'pending',
    })
    .select('id')
    .single();

  if (hospitalError) {
    return NextResponse.json({ error: hospitalError.message }, { status: 400 });
  }

  // 2. Operating hours
  if (ohList.length) {
    const ohRows = ohList.map((o) => ({
      hospital_id: hospital.id,
      day: o.day,
      start_time: o.closed ? null : o.start ?? null,
      end_time: o.closed ? null : o.end ?? null,
      is_closed: !!o.closed,
    }));
    await sb.from('operating_hours').upsert(ohRows, { onConflict: 'hospital_id,day' });
  }

  // 3. Doctor (if registered as doctor)
  let doctorId: string | null = null;
  if (body.registerType === 'doctor' && (doctorInfo.name || hospitalInfo.ownerName)) {
    const { data: doctor } = await sb
      .from('doctors')
      .insert({
        hospital_id: hospital.id,
        user_id: user.id,
        name: doctorInfo.name || hospitalInfo.ownerName,
        title: '대표원장',
        specialty: doctorInfo.specialty ?? '',
        is_owner: true,
      })
      .select('id')
      .single();
    doctorId = doctor?.id ?? null;
  }

  // 4. Mark profile as doctor + link doctor_id
  await sb
    .from('profiles')
    .update({ is_doctor: true, ...(doctorId ? { doctor_id: doctorId } : {}) })
    .eq('id', user.id);

  return NextResponse.json({ id: hospital.id, status: 'pending' });
}
