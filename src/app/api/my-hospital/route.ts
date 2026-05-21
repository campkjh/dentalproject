/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ hospital: null });

  const { data: hospital } = await sb
    .from('hospitals')
    .select(
      `*,
       doctors (*),
       operating_hours (*),
       products!products_hospital_id_fkey (id, title, price, status)`
    )
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!hospital) return NextResponse.json({ hospital: null });

  // Reviews + recent reservations
  const [reviewsRes, reservationsRes] = await Promise.all([
    sb
      .from('reviews')
      .select('*, author:profiles!reviews_author_id_fkey (name)')
      .eq('hospital_id', hospital.id)
      .order('created_at', { ascending: false })
      .limit(50),
    sb
      .from('reservations')
      .select(
        `*, user:profiles!reservations_user_id_fkey (name, phone),
            product:products (title)`
      )
      .eq('hospital_id', hospital.id)
      .order('reservation_at', { ascending: false })
      .limit(100),
  ]);

  return NextResponse.json({
    hospital,
    reviews: reviewsRes.data ?? [],
    reservations: reservationsRes.data ?? [],
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  // 1) 유저 인증
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  // 2) 소유 병원 확인 (anon client: SELECT 가능)
  const { data: hospital } = await sb
    .from('hospitals').select('id').eq('owner_id', user.id).maybeSingle();
  if (!hospital) return NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 });

  // 3) admin client로 업데이트 (RLS 우회 — 소유 확인은 위에서 완료)
  const patch: Record<string, any> = {};
  if (typeof body.name === 'string') patch.name = body.name;
  if (typeof body.phone === 'string') patch.phone = body.phone;
  if (typeof body.address === 'string') patch.address = body.address;
  if (typeof body.addressDetail === 'string') patch.address_detail = body.addressDetail;
  if (typeof body.introduction === 'string') patch.introduction = body.introduction;
  if (typeof body.holidayNotice === 'string') patch.holiday_notice = body.holidayNotice;
  if (typeof body.imageUrl === 'string') patch.image_url = body.imageUrl;
  if (Array.isArray(body.tags)) patch.tags = body.tags;
  if (Array.isArray(body.coverImages)) patch.cover_images = body.coverImages;

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

  const admin = await createAdminClient();
  const { error } = await admin.from('hospitals').update(patch).eq('id', hospital.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
