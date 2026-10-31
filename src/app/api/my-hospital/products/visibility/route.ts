// 등록 상품 가리기·다시 보이기(261101) — 승인된 상품은 지우지 않고 고객 화면에서만 숨긴다(status active ↔ paused).
//  · 아직 끝나지 않은 예약(대기·확정)이 있으면 가릴 수 없다 — 모두 취소한 뒤에만.
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getOwnedHospital, hospitalKeys } from '@/lib/owned-hospital';

export const dynamic = 'force-dynamic';

const OPEN_RESERVATION = ['pending', 'confirmed'];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { id?: unknown; hidden?: unknown };
  const { hospital, error } = await getOwnedHospital();
  if (error) return error;
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: '상품 ID가 필요해요.' }, { status: 400 });
  const hidden = body.hidden === true;

  const admin = await createAdminClient();
  const { data: product, error: readError } = await admin
    .from('products')
    .select('id, hospital_id, status, approval_status')
    .eq('id', id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 400 });
  if (!product || !hospitalKeys(hospital).includes(product.hospital_id)) {
    return NextResponse.json({ error: '상품을 찾을 수 없어요.' }, { status: 404 });
  }
  const approval = (product as { approval_status?: string | null }).approval_status ?? 'approved';
  if (approval !== 'approved' && approval !== 'pending_update') {
    return NextResponse.json({ error: '승인된 상품만 가리거나 다시 보일 수 있어요.' }, { status: 400 });
  }

  if (hidden) {
    const { count, error: countError } = await admin
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)
      .in('status', OPEN_RESERVATION);
    if (countError) return NextResponse.json({ error: countError.message }, { status: 400 });
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: `진행 중인 예약이 ${count}건 있어서 가릴 수 없어요. 예약을 모두 취소한 뒤 가려 주세요.`, openReservations: count },
        { status: 409 },
      );
    }
  }

  const { error: updateError } = await admin.from('products').update({ status: hidden ? 'paused' : 'active' }).eq('id', id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  return NextResponse.json({ ok: true, hidden });
}
