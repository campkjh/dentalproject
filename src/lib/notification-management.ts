import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase/types';

export const notificationDeleteInput = z.union([
  z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).strict(),
  z.object({ all: z.literal(true) }).strict(),
]);

export function removeOwnNotifications(client: SupabaseClient<Database>, userId: string, ids: string[] | null) {
  const query = client.from('notifications').delete().eq('user_id', userId);
  return (ids ? query.in('id', [...new Set(ids)]) : query).select('id');
}

export function readOwnNotifications(client: SupabaseClient<Database>, userId: string) {
  return client.from('notifications').update({ is_read: true })
    .eq('user_id', userId).eq('is_read', false).select('id');
}
