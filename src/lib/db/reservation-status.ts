/* eslint-disable @typescript-eslint/no-explicit-any */
import { broadcastReservationChange } from '@/lib/realtime/server';

type CompletePastReservationsOptions = {
  hospitalId?: string | null;
  reservationId?: string | null;
  userId?: string | null;
  now?: Date;
  limit?: number;
};

type CompletedReservation = {
  id: string;
  hospital_id: string | null;
  user_id: string | null;
};

export async function completePastConfirmedReservations(admin: any, options: CompletePastReservationsOptions = {}) {
  const nowIso = (options.now ?? new Date()).toISOString();
  let query = admin
    .from('reservations')
    .select('id, hospital_id, user_id')
    .eq('status', 'confirmed')
    .not('visit_at', 'is', null)
    .lte('visit_at', nowIso)
    .limit(options.limit ?? 500);

  if (options.hospitalId) query = query.eq('hospital_id', options.hospitalId);
  if (options.reservationId) query = query.eq('id', options.reservationId);
  if (options.userId) query = query.eq('user_id', options.userId);

  const { data: candidates, error: selectError } = await query;
  if (selectError || !candidates?.length) return [] as CompletedReservation[];

  const ids = candidates.map((row: CompletedReservation) => row.id);
  const { data: completed, error: updateError } = await admin
    .from('reservations')
    .update({ status: 'completed', updated_at: nowIso })
    .in('id', ids)
    .eq('status', 'confirmed')
    .select('id, hospital_id, user_id');

  if (updateError || !completed?.length) return [] as CompletedReservation[];

  const notifications = completed
    .filter((row: CompletedReservation) => row.user_id)
    .map((row: CompletedReservation) => ({
      user_id: row.user_id,
      type: 'info',
      title: '진료가 완료되었습니다',
      content: '예약 시간이 지나 진료가 완료 처리되었습니다. 후기를 남기고 포인트를 받아보세요.',
      link: `/reservations/${row.id}`,
    }));

  if (notifications.length > 0) {
    await admin.from('notifications').insert(notifications);
  }

  await Promise.all(
    completed.map((row: CompletedReservation) =>
      broadcastReservationChange({
        event: 'UPDATE',
        reservationId: row.id,
        hospitalId: row.hospital_id,
        userId: row.user_id,
      })
    )
  );

  return completed as CompletedReservation[];
}
