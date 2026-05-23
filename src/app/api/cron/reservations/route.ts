import { NextResponse, type NextRequest } from 'next/server';
import { cancelExpiredPendingReservations, completePastConfirmedReservations } from '@/lib/db/reservation-status';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await createAdminClient();
  const cancelled = await cancelExpiredPendingReservations(admin);
  const completed = await completePastConfirmedReservations(admin);

  return NextResponse.json({
    ok: true,
    cancelled: cancelled.length,
    completed: completed.length,
  });
}
