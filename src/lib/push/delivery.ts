import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isPushConfigured, sendPush } from './fcm';
import { nativePushPolicy, pushPreferences } from './policy';

type Notice = { id?: string; user_id: string; type: string; title: string; content: string; link?: string | null };

/** Only server-authorized routes may call this helper with recipients. */
export async function writeNotifications(notices: Notice | Notice[], upsert?: { onConflict: string; ignoreDuplicates: boolean }) {
  const admin = await createAdminClient();
  const query = admin.from('notifications');
  const result = await (upsert ? query.upsert(notices, upsert) : query.insert(notices)).select('id');
  if (!result.error && result.data?.length && isPushConfigured()) {
    const ids = result.data.map((row: { id: string }) => row.id);
    after(async () => {
      try { await flushNativePush(ids); }
      catch { console.error('Native push worker failed; pending deliveries will be retried'); }
    });
  }
  return result;
}

export async function flushNativePush(notificationIds?: string[]) {
  if (!isPushConfigured()) return { configured: false, sent: 0, processed: 0 };
  const admin = await createAdminClient();
  const { data: queue, error } = await admin.rpc('claim_native_push', { batch_size: 10, notification_ids: notificationIds ?? null });
  if (error) throw new Error('Native push queue is unavailable');
  let sent = 0;
  for (const item of queue ?? []) {
    const finish = async (status: string, lastError: string | null = null) => {
      const { error: updateError } = await admin.from('native_push_queue').update({
        status, last_error: lastError,
        available_at: new Date(Date.now() + Math.min(3600, 30 * 2 ** item.attempts) * 1000).toISOString(),
      }).eq('notification_id', item.notification_id).eq('lease_id', item.lease_id);
      if (updateError) throw new Error('Could not finish native push lease');
    };
    try {
      if (Date.now() - new Date(item.created_at).getTime() > 86400000) { await finish('skipped', 'expired'); continue; }
      const [notice, devices, settings] = await Promise.all([
        admin.from('notifications').select('id, user_id, type, title, link, is_read').eq('id', item.notification_id).maybeSingle(),
        admin.from('push_devices').select('token').eq('user_id', item.user_id),
        admin.from('push_preferences').select('settings').eq('user_id', item.user_id).maybeSingle(),
      ]);
      if (notice.error || devices.error || settings.error) throw new Error('lookup failed');
      if (!notice.data || notice.data.is_read || !devices.data?.length) { await finish('skipped'); continue; }
      const policy = nativePushPolicy(notice.data, pushPreferences(settings.data?.settings));
      if (!policy.allowed) { await finish('skipped'); continue; }
      const tokens = devices.data.map((device: { token: string }) => device.token);
      // Keep medical details and message contents off the lock screen and out of FCM.
      const result = await sendPush({ tokens, title: '마이닥 알림', body: '새 알림이 도착했어요. 앱에서 확인해주세요.',
        notificationId: item.notification_id, quiet: policy.quiet,
        data: { notificationId: item.notification_id, link: policy.link },
      });
      sent += result.sent;
      if (result.invalidTokens.length) await admin.from('push_devices').delete().in('token', result.invalidTokens);
      const retryable = result.failed > result.invalidTokens.length;
      await finish(retryable ? item.attempts >= 6 ? 'failed' : 'pending' : 'sent', result.errors[0] ?? null);
    } catch {
      await finish(item.attempts >= 6 ? 'failed' : 'pending', 'delivery failed');
    }
  }
  return { configured: true, sent, processed: queue?.length ?? 0 };
}
