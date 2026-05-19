type ReservationRealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

type BroadcastReservationChangeInput = {
  event: ReservationRealtimeEvent;
  reservationId: string;
  hospitalId?: string | null;
  userId?: string | null;
};

function getRealtimeBroadcastUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  return `${supabaseUrl.replace(/\/$/, '')}/realtime/v1/api/broadcast`;
}

export async function broadcastReservationChange({
  event,
  reservationId,
  hospitalId,
  userId,
}: BroadcastReservationChangeInput) {
  const broadcastUrl = getRealtimeBroadcastUrl();
  const token = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!broadcastUrl || !token) return;

  const payload = {
    event,
    reservationId,
    hospitalId,
    userId,
    sentAt: new Date().toISOString(),
  };

  const messages = [
    hospitalId
      ? {
          topic: `reservations:hospital:${hospitalId}`,
          event: 'reservation_changed',
          payload,
        }
      : null,
    userId
      ? {
          topic: `reservations:user:${userId}`,
          event: 'reservation_changed',
          payload,
        }
      : null,
  ].filter(Boolean);

  if (messages.length === 0) return;

  try {
    await fetch(broadcastUrl, {
      method: 'POST',
      headers: {
        apikey: token,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });
  } catch {
    // Realtime delivery is best-effort; the DB write has already succeeded.
  }
}
