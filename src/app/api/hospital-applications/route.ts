/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type RegisterType = 'hospital' | 'doctor';

function isMissingDoctorColumn(error: { message?: string; details?: string | null; hint?: string | null } | null, column: string) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return text.includes(column.toLowerCase()) || text.includes(`doctors.${column.toLowerCase()}`);
}

async function insertDoctor(admin: any, payload: Record<string, any>) {
  const insertPayload = {
    ...payload,
    is_active: payload.is_active ?? true,
    member_status: payload.member_status ?? 'active',
  };

  let result = await admin.from('doctors').insert(insertPayload).select('id').single();
  if (
    result.error &&
    (isMissingDoctorColumn(result.error, 'is_active') || isMissingDoctorColumn(result.error, 'member_status'))
  ) {
    const fallbackPayload = { ...insertPayload };
    delete fallbackPayload.is_active;
    delete fallbackPayload.member_status;
    result = await admin.from('doctors').insert(fallbackPayload).select('id').single();
  }
  return result;
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const admin = await createAdminClient();
  const registerType = body.registerType as RegisterType | undefined;
  const hospitalInfo = body.hospitalInfo ?? {};
  const doctorInfo = body.doctorInfo ?? {};
  const specialty: string = body.specialty || 'dental';
  const { data: catRow } = await admin.from('categories').select('id').eq('id', specialty).maybeSingle();
  const category = catRow?.id ?? 'dental';

  const doctorName = cleanString(doctorInfo.name);
  const doctorSpecialty = cleanString(doctorInfo.specialty);
  const profileImage = cleanString(doctorInfo.profileImage);
  const licenseImage = cleanString(doctorInfo.licenseImage);
  const certificationImage = cleanString(doctorInfo.certificationImage);
  const certifications = [licenseImage, certificationImage].filter(Boolean);

  if (registerType === 'doctor') {
    const hospitalId = cleanString(doctorInfo.hospitalId);
    if (!hospitalId) return NextResponse.json({ error: '신청할 병원을 선택해 주세요.' }, { status: 400 });
    if (!doctorName) return NextResponse.json({ error: '원장 이름을 입력해 주세요.' }, { status: 400 });
    if (!profileImage) return NextResponse.json({ error: '프로필 사진을 첨부해 주세요.' }, { status: 400 });
    if (!licenseImage) return NextResponse.json({ error: '의사면허 이미지를 첨부해 주세요.' }, { status: 400 });

    const { data: hospital } = await admin
      .from('hospitals')
      .select('id, name, owner_id, status')
      .eq('id', hospitalId)
      .maybeSingle();

    if (!hospital || hospital.status !== 'approved') {
      return NextResponse.json({ error: '가입 신청 가능한 병원을 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data: existing } = await admin
      .from('doctors')
      .select('id, hospital_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing?.hospital_id) {
      return NextResponse.json({ error: '이미 병원 소속 또는 신청 내역이 있습니다.' }, { status: 400 });
    }

    const { data: doctor, error } = await insertDoctor(admin, {
      hospital_id: hospital.id,
      user_id: user.id,
      name: doctorName,
      title: '원장',
      specialty: doctorSpecialty,
      profile_image: profileImage,
      is_owner: false,
      is_active: false,
      member_status: 'pending',
      certifications,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (hospital.owner_id) {
      await admin.from('notifications').insert({
        user_id: hospital.owner_id,
        type: 'important',
        title: '새로운 멤버 신청이 도착했습니다',
        content: `${doctorName} 원장이 ${hospital.name} 멤버 가입을 신청했습니다.`,
        link: '/partner/doctors',
      });
    }

    await admin
      .from('profiles')
      .update({ is_doctor: false, doctor_id: doctor?.id ?? null })
      .eq('id', user.id);

    return NextResponse.json({ id: doctor?.id, status: 'pending_member' });
  }

  if (registerType !== 'hospital') {
    return NextResponse.json({ error: '등록 유형을 선택해 주세요.' }, { status: 400 });
  }

  const hospitalName = cleanString(hospitalInfo.name);
  const ownerName = cleanString(hospitalInfo.ownerName) || doctorName;
  if (!hospitalName) return NextResponse.json({ error: '병원명을 입력해 주세요.' }, { status: 400 });
  if (!ownerName) return NextResponse.json({ error: '대표자명을 입력해 주세요.' }, { status: 400 });
  if (!doctorName) return NextResponse.json({ error: '병원장 이름을 입력해 주세요.' }, { status: 400 });
  if (!profileImage) return NextResponse.json({ error: '프로필 사진을 첨부해 주세요.' }, { status: 400 });
  if (!licenseImage) return NextResponse.json({ error: '의사면허 이미지를 첨부해 주세요.' }, { status: 400 });

  const { data: hospital, error: hospitalError } = await admin
    .from('hospitals')
    .insert({
      name: hospitalName,
      category,
      phone: cleanString(hospitalInfo.phone) || null,
      tags: Array.isArray(body.treatments) ? body.treatments : [],
      cover_images: [],
      address: cleanString(hospitalInfo.address),
      owner_id: user.id,
      status: 'pending',
    })
    .select('id')
    .single();

  if (hospitalError) return NextResponse.json({ error: hospitalError.message }, { status: 400 });

  const { data: doctor, error: doctorError } = await insertDoctor(admin, {
    hospital_id: hospital.id,
    user_id: user.id,
    name: doctorName,
    title: '병원장',
    specialty: doctorSpecialty,
    profile_image: profileImage,
    is_owner: true,
    is_active: true,
    member_status: 'active',
    certifications,
  });

  if (doctorError) return NextResponse.json({ error: doctorError.message }, { status: 400 });

  await admin
    .from('profiles')
    .update({ is_doctor: false, doctor_id: doctor?.id ?? null })
    .eq('id', user.id);

  return NextResponse.json({ id: hospital.id, doctorId: doctor?.id, status: 'pending_hospital' });
}
