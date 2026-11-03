import { writeNotifications } from '@/lib/push/delivery';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type RegisterType = 'hospital' | 'doctor';

// 병원 등록 필수 서류 — 화면(hospital/register REQUIRED_DOCS)과 같은 이름
const REQUIRED_HOSPITAL_DOCS = ['사업자등록증', '의료기관 개설신고증', '의사 면허증', '대표자 신분증 사본'];

async function notifyApplicant(userId: string, title: string, content: string, link: string) {
  await writeNotifications({ user_id: userId, type: 'important', title, content, link });
}

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

export type ApplicationStatus = 'none' | 'pending' | 'approved' | 'rejected';

/** 내 병원 신청 상태 — 마이페이지 '병원 신청' 줄(신청중 태그)·신청 화면에서 본다 */
export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ status: 'none' });

  const admin = await createAdminClient();
  const { data: hospitals } = await admin
    .from('hospitals')
    .select('id, name, status')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);
  const hospital = hospitals?.[0];
  if (hospital) {
    const status: ApplicationStatus = hospital.status === 'approved' ? 'approved' : hospital.status === 'rejected' ? 'rejected' : 'pending';
    return NextResponse.json({ status, kind: 'hospital', hospitalName: hospital.name });
  }

  const { data: doctors } = await admin
    .from('doctors')
    .select('id, member_status, is_active, hospital:hospitals (name)')
    .eq('user_id', user.id)
    .not('hospital_id', 'is', null)
    .limit(1);
  const doctor: any = doctors?.[0];
  if (doctor && doctor.member_status !== 'left') {
    const status: ApplicationStatus = doctor.member_status === 'pending'
      ? 'pending'
      : doctor.member_status === 'rejected' ? 'rejected' : 'approved';
    return NextResponse.json({ status, kind: 'doctor', hospitalName: doctor.hospital?.name ?? '' });
  }
  return NextResponse.json({ status: 'none' });
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
      await writeNotifications({
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

    await notifyApplicant(
      admin,
      user.id,
      '원장 등록 신청이 정상적으로 접수되었습니다',
      `${hospital.name}에서 요청을 확인하고 수락하면 알려드릴게요.`,
      '/mypage'
    );

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

  const submittedDocs =
    body.documents && typeof body.documents === 'object' && !Array.isArray(body.documents)
      ? (body.documents as Record<string, string>)
      : {};
  const missingDocs = REQUIRED_HOSPITAL_DOCS.filter((title) => !cleanString(submittedDocs[title]));
  if (missingDocs.length) {
    return NextResponse.json({ error: `필수 서류를 모두 올려 주세요. (${missingDocs.join(', ')})` }, { status: 400 });
  }

  // 이미 신청했거나 등록된 병원이 있으면 다시 만들지 않는다(같은 사람 병원이 둘이 되지 않게)
  const { data: existingHospitals } = await admin
    .from('hospitals')
    .select('id, status')
    .eq('owner_id', user.id)
    .neq('status', 'rejected')
    .limit(1);
  if (existingHospitals?.[0]) {
    const pending = existingHospitals[0].status === 'pending';
    return NextResponse.json(
      { error: pending ? '이미 병원 신청이 접수되어 심사 중이에요.' : '이미 등록된 병원이 있어요.' },
      { status: 409 }
    );
  }

  const baseInsert: Record<string, any> = {
    name: hospitalName,
    category,
    phone: cleanString(hospitalInfo.phone) || null,
    tags: Array.isArray(body.treatments) ? body.treatments : [],
    cover_images: [],
    address: cleanString(hospitalInfo.address),
    owner_id: user.id,
    status: 'pending',
  };

  let hospitalRes = await admin
    .from('hospitals')
    .insert({ ...baseInsert, submitted_documents: submittedDocs })
    .select('id')
    .single();

  if (
    hospitalRes.error &&
    /submitted_documents/i.test(`${hospitalRes.error.message ?? ''} ${hospitalRes.error.details ?? ''}`)
  ) {
    hospitalRes = await admin.from('hospitals').insert(baseInsert).select('id').single();
  }

  const hospital = hospitalRes.data;
  const hospitalError = hospitalRes.error;

  if (hospitalError || !hospital) {
    return NextResponse.json({ error: hospitalError?.message ?? '병원 생성에 실패했습니다.' }, { status: 400 });
  }

  // Persist operating hours submitted at registration time
  if (Array.isArray(body.operatingHours) && body.operatingHours.length > 0) {
    const rows = body.operatingHours
      .map((h: any) => ({
        hospital_id: hospital.id,
        day: cleanString(h?.day),
        start_time: h?.closed ? null : cleanString(h?.start) || null,
        end_time: h?.closed ? null : cleanString(h?.end) || null,
        is_closed: !!h?.closed,
      }))
      .filter((r: any) => r.day);
    if (rows.length > 0) {
      await admin.from('operating_hours').upsert(rows, { onConflict: 'hospital_id,day' });
    }
  }

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

  await notifyApplicant(
    admin,
    user.id,
    '병원 신청이 정상적으로 접수되었습니다',
    `${hospitalName} 신청 서류를 심사하고 있어요. 승인이 완료되면 알려드릴게요.`,
    '/mypage'
  );

  return NextResponse.json({ id: hospital.id, doctorId: doctor?.id, status: 'pending_hospital' });
}
