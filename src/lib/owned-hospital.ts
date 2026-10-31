/* eslint-disable @typescript-eslint/no-explicit-any */
// 의사·병원 관리자 API 공통 — 지금 로그인한 사람의 병원 찾기(병원 주인 → 소속 의사 순)와 상품의 hospital_id 후보(옛 슬러그 포함)
import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const LEGACY_HOSPITAL_SLUG_BY_NAME: Record<string, string> = {
  '레브치과의원': 'h1',
  '아이디치과': 'h2',
  '화이트드림치과': 'h3',
  '서울스마일치과': 'h4',
};

export function hospitalKeys(hospital: any) {
  return Array.from(new Set([
    typeof hospital?.id === 'string' ? hospital.id.trim() : '',
    typeof hospital?.slug === 'string' ? hospital.slug.trim() : '',
    typeof hospital?.name === 'string' ? LEGACY_HOSPITAL_SLUG_BY_NAME[hospital.name.trim()] : '',
  ].filter(Boolean)));
}

export async function getOwnedHospital() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };

  const admin = await createAdminClient();
  const { data: hospital } = await admin
    .from('hospitals')
    .select('id, slug, name')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (hospital) return { hospital };

  const { data: doctor } = await admin
    .from('doctors')
    .select('hospital_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (doctor?.hospital_id) {
    const { data: doctorHospital } = await admin
      .from('hospitals')
      .select('id, slug, name')
      .eq('id', doctor.hospital_id)
      .maybeSingle();
    if (doctorHospital) return { hospital: doctorHospital };
  }

  return { error: NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 }) };
}
