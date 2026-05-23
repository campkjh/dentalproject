import { cancelExpiredPendingReservations, completePastConfirmedReservations } from '@/lib/db/reservation-status';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function listMyReservations(userId: string) {
  const admin = await createAdminClient();
  await cancelExpiredPendingReservations(admin, { userId });
  await completePastConfirmedReservations(admin, { userId });

  const sb = await createClient();
  const { data, error } = await sb
    .from('reservations')
    .select(
	      `*, hospital:hospitals (id, slug, name, address, phone, location, logo_url, cover_images),
	          product:products (id, title, image_url),
	          doctor:doctors (id, name, title, profile_image)`
    )
    .eq('user_id', userId)
    .order('visit_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getReservation(id: string) {
  const admin = await createAdminClient();
  await cancelExpiredPendingReservations(admin, { reservationId: id });
  await completePastConfirmedReservations(admin, { reservationId: id });

  const sb = await createClient();
  const { data, error } = await sb
    .from('reservations')
    .select(
	      `*, hospital:hospitals (id, slug, name, address, phone, location, logo_url, cover_images),
	          product:products (id, title, image_url),
	          doctor:doctors (id, name, title, profile_image)`
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
