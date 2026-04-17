/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function ownerHospitalId(sb: any, userId: string) {
  const { data } = await sb.from('hospitals').select('id').eq('owner_id', userId).maybeSingle();
  return data?.id ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const hospitalId = await ownerHospitalId(sb, user.id);
  if (!hospitalId) return NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 });

  // Verify doctor belongs to this hospital
  const { data: doc } = await sb.from('doctors').select('hospital_id').eq('id', id).maybeSingle();
  if (!doc || doc.hospital_id !== hospitalId) {
    return NextResponse.json({ error: '해당 의사를 찾을 수 없습니다.' }, { status: 404 });
  }

  const patch: Record<string, any> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.title !== undefined) patch.title = body.title;
  if (body.specialty !== undefined) patch.specialty = body.specialty;
  if (body.bio !== undefined) patch.bio = body.bio;
  if (body.profileImage !== undefined) patch.profile_image = body.profileImage;

  const { error } = await sb.from('doctors').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const hospitalId = await ownerHospitalId(sb, user.id);
  if (!hospitalId) return NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 });

  const { data: doc } = await sb.from('doctors').select('hospital_id, is_owner').eq('id', id).maybeSingle();
  if (!doc || doc.hospital_id !== hospitalId) {
    return NextResponse.json({ error: '해당 의사를 찾을 수 없습니다.' }, { status: 404 });
  }
  if (doc.is_owner) {
    return NextResponse.json({ error: '대표원장은 삭제할 수 없습니다.' }, { status: 400 });
  }

  const { error } = await sb.from('doctors').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
