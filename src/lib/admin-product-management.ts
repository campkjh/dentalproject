import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase/types';

type AdminClient = SupabaseClient<Database>;

export function adminProductsQuery(admin: AdminClient, columns: string) {
  return admin.from('products').select(columns).neq('status', 'removed')
    .order('created_at', { ascending: false }).limit(500);
}

/** Preserve reservation/review references while removing the product and its pending request. */
export async function removeAdminProducts(admin: AdminClient, ids: string[]) {
  const uniqueIds = [...new Set(ids)];
  const remove = (patch: Record<string, unknown>) => admin.from('products').update(patch)
    .in('id', uniqueIds).neq('status', 'removed').select('id');
  let result = await remove({ status: 'removed', approval_status: 'rejected', pending_changes: null });
  const error = result.error;
  if (error && ['42703', 'PGRST204'].includes(error.code)
    && /approval_status|pending_changes/i.test(`${error.message} ${error.details} ${error.hint}`)) {
    result = await remove({ status: 'removed' });
  }
  return result;
}
