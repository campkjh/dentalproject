import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const sb = await createClient();

  const patch: Record<string, unknown> = {};
  if (body.status) patch.status = body.status;
  if (body.cancelReason) {
    patch.cancel_reason = body.cancelReason;
    patch.cancel_at = new Date().toISOString();
  }
  if (body.doctorId !== undefined) {
    patch.doctor_id =
      body.doctorId && /^[0-9a-f]{8}-/.test(body.doctorId) ? body.doctorId : null;
  }

  const { error } = await sb.from('reservations').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Notify the patient when status changes
  if (body.status) {
    const { data: rsv } = await sb
      .from('reservations')
      .select('user_id, hospital:hospitals (name)')
      .eq('id', id)
      .maybeSingle();
    if (rsv?.user_id) {
      const hospitalName = (rsv as { hospital?: { name?: string } }).hospital?.name ?? '병원';
      const titleMap: Record<string, string> = {
        confirmed: '예약이 확정되었습니다',
        cancelled: '예약이 취소되었습니다',
        completed: '시술이 완료되었습니다',
        pending: '예약이 검토 중입니다',
      };
      const typeMap: Record<string, string> = {
        confirmed: 'important',
        cancelled: 'important',
        completed: 'info',
        pending: 'info',
      };
      await sb.from('notifications').insert({
        user_id: rsv.user_id,
        type: typeMap[body.status] ?? 'info',
        title: titleMap[body.status] ?? '예약 상태가 변경되었습니다',
        content: `${hospitalName}의 예약 상태가 변경되었습니다.${body.cancelReason ? '\n\n사유: ' + body.cancelReason : ''}`,
        link: `/reservations/${id}`,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
