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
  return NextResponse.json({ ok: true });
}
