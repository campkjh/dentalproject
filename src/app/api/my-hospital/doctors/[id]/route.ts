/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type DoctorMembershipRow = {
  id: string;
  user_id?: string | null;
  hospital_id?: string | null;
  is_owner?: boolean | null;
  member_status?: 'pending' | 'active' | 'rejected' | 'left' | null;
  is_active?: boolean | null;
};

async function ownerHospitalId(sb: any, userId: string) {
  const { data } = await sb.from('hospitals').select('id').eq('owner_id', userId).maybeSingle();
  return data?.id ?? null;
}

function isMissingDoctorColumn(error: { message?: string; details?: string | null; hint?: string | null } | null, column: string) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  return text.includes(column.toLowerCase()) || text.includes(`doctors.${column.toLowerCase()}`);
}

async function getDoctorMembership(sb: any, id: string): Promise<DoctorMembershipRow | null> {
  const full = await sb
    .from('doctors')
    .select('id, user_id, hospital_id, is_owner, member_status, is_active')
    .eq('id', id)
    .maybeSingle();

  if (!full.error) return full.data ?? null;
  if (!isMissingDoctorColumn(full.error, 'member_status') && !isMissingDoctorColumn(full.error, 'is_active')) {
    return null;
  }

  const fallback = await sb
    .from('doctors')
    .select('id, user_id, hospital_id, is_owner')
    .eq('id', id)
    .maybeSingle();

  return fallback.data ?? null;
}

async function updateDoctorMembership(
  admin: any,
  id: string,
  patch: Record<string, any>,
  fallbackPatch: Record<string, any>
) {
  if (Object.keys(patch).length) {
    const { error } = await admin.from('doctors').update(patch).eq('id', id);
    if (!error) return null;
    if (!isMissingDoctorColumn(error, 'member_status') && !isMissingDoctorColumn(error, 'is_active')) return error;
  }

  if (!Object.keys(fallbackPatch).length) return null;
  const { error: fallbackError } = await admin.from('doctors').update(fallbackPatch).eq('id', id);
  return fallbackError ?? null;
}

async function unlinkDoctorProfile(admin: any, doctor: DoctorMembershipRow) {
  if (!doctor.user_id) return;
  await admin
    .from('profiles')
    .update({ is_doctor: false, doctor_id: null })
    .eq('id', doctor.user_id);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const hospitalId = await ownerHospitalId(sb, user.id);
  const doc = await getDoctorMembership(sb, id);
  const canManage = Boolean(hospitalId && doc?.hospital_id === hospitalId);
  const isSelf = Boolean(doc?.user_id && doc.user_id === user.id);
  if (!doc || (!canManage && !isSelf)) {
    return NextResponse.json({ error: '해당 의사를 찾을 수 없습니다.' }, { status: 404 });
  }

  const admin = await createAdminClient();

  if (body.action === 'accept') {
    if (!canManage) return NextResponse.json({ error: '병원장만 멤버 요청을 수락할 수 있습니다.' }, { status: 403 });
    const error = await updateDoctorMembership(
      admin,
      id,
      { member_status: 'active', is_active: true },
      {}
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (doc.user_id) {
      await admin.from('profiles').update({ is_doctor: true, doctor_id: id }).eq('id', doc.user_id);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'reject') {
    if (!canManage) return NextResponse.json({ error: '병원장만 멤버 요청을 거절할 수 있습니다.' }, { status: 403 });
    const error = await updateDoctorMembership(
      admin,
      id,
      { member_status: 'rejected', is_active: false, hospital_id: null },
      { hospital_id: null }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await unlinkDoctorProfile(admin, doc);
    return NextResponse.json({ ok: true });
  }

  const patch: Record<string, any> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.title !== undefined) patch.title = body.title;
  if (body.specialty !== undefined) patch.specialty = body.specialty;
  if (body.bio !== undefined) patch.bio = body.bio;
  if (body.profileImage !== undefined) patch.profile_image = body.profileImage;

  const { error } = await admin.from('doctors').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const ownedHospitalId = await ownerHospitalId(sb, user.id);

  const doc = await getDoctorMembership(sb, id);
  const canManage = Boolean(ownedHospitalId && doc?.hospital_id === ownedHospitalId);
  const isSelf = Boolean(doc?.user_id && doc.user_id === user.id);
  if (!doc || (!canManage && !isSelf)) {
    return NextResponse.json({ error: '해당 의사를 찾을 수 없습니다.' }, { status: 404 });
  }
  if (doc.is_owner) {
    return NextResponse.json({ error: '병원장은 탈퇴 처리할 수 없습니다.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const error = await updateDoctorMembership(
    admin,
    id,
    { member_status: 'left', is_active: false, hospital_id: null },
    { hospital_id: null }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await unlinkDoctorProfile(admin, doc);
  return NextResponse.json({ ok: true });
}
