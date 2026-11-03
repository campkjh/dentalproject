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

const OWNED_HOSPITAL_COLUMNS = 'id, slug, name, category, status';

/**
 * 지금 로그인한 사람의 병원. 서버 권한(admin)으로 찾아서 심사 중(pending) 병원도 찾는다.
 * 병원을 두 번 신청해 두 곳이 있어도 최근 것 하나만 쓴다(maybeSingle 이 여러 줄에서 실패하지 않게).
 * ownerOnly — 병원 정보 수정처럼 대표만 할 수 있는 일은 소속 의사로 찾지 않는다.
 */
export async function getOwnedHospital({ ownerOnly = false }: { ownerOnly?: boolean } = {}) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };

  const admin = await createAdminClient();
  const { data: owned } = await admin
    .from('hospitals')
    .select(OWNED_HOSPITAL_COLUMNS)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (owned?.[0]) return { hospital: owned[0] as any, user };

  if (!ownerOnly) {
    const { data: doctors } = await admin
      .from('doctors')
      .select('hospital_id')
      .eq('user_id', user.id)
      .not('hospital_id', 'is', null)
      .limit(1);

    const doctorHospitalId = doctors?.[0]?.hospital_id;
    if (doctorHospitalId) {
      const { data: doctorHospital } = await admin
        .from('hospitals')
        .select(OWNED_HOSPITAL_COLUMNS)
        .eq('id', doctorHospitalId)
        .maybeSingle();
      if (doctorHospital) return { hospital: doctorHospital as any, user };
    }
  }

  return { error: NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 }) };
}
