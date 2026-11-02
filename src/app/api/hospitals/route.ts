import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveHospitalImageUrl } from '@/lib/images';

export const dynamic = 'force-dynamic';

// 원장 등록 — 소속 병원 찾기 목록. 승인된 병원만, 줄에 쓸 칸만 보낸다(거르기·정렬은 화면에서).
//  · id 는 진짜 id(uuid) — 카탈로그(store hospitals)는 slug 를 id 로 써서 가입 신청에 못 쓴다.
export async function GET() {
  const sb = await createClient();
  const { data, error } = await sb
    .from('hospitals')
    .select('id, name, category, address, location, logo_url, cover_images')
    .eq('status', 'approved')
    .order('name')
    .limit(3000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    hospitals: (data ?? []).map((h) => ({
      id: h.id as string,
      name: (h.name as string) ?? '',
      category: (h.category as string) ?? '',
      address: ((h.address as string) || (h.location as string) || '').trim(),
      image: resolveHospitalImageUrl(h),
    })),
  });
}
