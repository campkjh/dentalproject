'use client';

import { useEffect, useRef } from 'react';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';

const RESERVATION_REALTIME_DEBOUNCE_MS = 250;

type ReservationRealtimeOptions = {
  enabled?: boolean;
  hospitalId?: string | null;
  userId?: string | null;
  onChange: () => void | Promise<void>;
  revalidateOnFocus?: boolean;
};

function getReservationFilter({ hospitalId, userId }: Pick<ReservationRealtimeOptions, 'hospitalId' | 'userId'>) {
  if (hospitalId) return `hospital_id=eq.${hospitalId}`;
  if (userId) return `user_id=eq.${userId}`;
  return null;
}

function getReservationTopic({ hospitalId, userId }: Pick<ReservationRealtimeOptions, 'hospitalId' | 'userId'>) {
  if (hospitalId) return `reservations:hospital:${hospitalId}`;
  if (userId) return `reservations:user:${userId}`;
  return null;
}

export function useReservationRealtimeRefresh({
  enabled = true,
  hospitalId,
  userId,
  onChange,
  revalidateOnFocus = true,
}: ReservationRealtimeOptions) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const filter = getReservationFilter({ hospitalId, userId });
    const topic = getReservationTopic({ hospitalId, userId });
    if (!enabled || !filter || !topic || !hasSupabaseEnv()) return;

    const supabase = createClient();
    let mounted = true;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const queueRefresh = () => {
      if (!mounted) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (mounted) void onChangeRef.current();
      }, RESERVATION_REALTIME_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(topic)
      .on('broadcast', { event: 'reservation_changed' }, queueRefresh)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter,
        },
        queueRefresh
      )
      .subscribe();

    if (revalidateOnFocus) {
      window.addEventListener('focus', queueRefresh);
      window.addEventListener('online', queueRefresh);
    }

    return () => {
      mounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (revalidateOnFocus) {
        window.removeEventListener('focus', queueRefresh);
        window.removeEventListener('online', queueRefresh);
      }
      void supabase.removeChannel(channel);
    };
  }, [enabled, hospitalId, revalidateOnFocus, userId]);
}
