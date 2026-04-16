import { createClient } from '@/lib/supabase/server';

export async function listMyReservations(userId: string) {
  const sb = await createClient();
  const { data, error } = await sb
    .from('reservations')
    .select(
      `*, hospital:hospitals (id, name, address, phone, location),
          product:products (id, title, image_url),
          doctor:doctors (id, name, title)`
    )
    .eq('user_id', userId)
    .order('visit_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getReservation(id: string) {
  const sb = await createClient();
  const { data, error } = await sb
    .from('reservations')
    .select(
      `*, hospital:hospitals (id, name, address, phone, location),
          product:products (id, title, image_url),
          doctor:doctors (id, name, title)`
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
