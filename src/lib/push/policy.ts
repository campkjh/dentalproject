export const PUSH_DEFAULTS = { reservation: true, message: true, community: true, event: true, marketing: false, night: true };
export type PushPreferences = typeof PUSH_DEFAULTS;

export function pushPreferences(value: unknown): PushPreferences {
  const result = { ...PUSH_DEFAULTS };
  if (value && typeof value === 'object') {
    for (const key of Object.keys(result) as (keyof PushPreferences)[]) {
      const setting = (value as Record<string, unknown>)[key];
      if (typeof setting === 'boolean') result[key] = setting;
    }
  }
  return result;
}

export function nativePushLink(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s\u0000-\u001f]/.test(value)) return '/notifications';
  return value;
}

export function nativePushPolicy(notification: { type: string; title: string; link?: string | null }, preferences: PushPreferences, now = new Date()) {
  const link = nativePushLink(notification.link);
  let category: keyof PushPreferences = 'message';
  if (/예약|진료|스케줄/.test(notification.title) || /\/(reservations|appointments)(\/|$)/.test(link)) category = 'reservation';
  else if (/댓글|답글|팔로우/.test(notification.title) || /\/community(\/|$)/.test(link)) category = 'community';
  else if (notification.type === 'recommendation') category = 'marketing';
  else if (notification.type === 'event') category = 'event';
  const hour = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', hour: '2-digit', hourCycle: 'h23' }).format(now));
  return { allowed: preferences[category], quiet: preferences.night && (hour >= 22 || hour < 8), link };
}
