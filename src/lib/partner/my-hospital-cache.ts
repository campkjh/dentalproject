'use client';

import { useCallback, useEffect, useState } from 'react';

export type MyHospitalData<
  THospital = unknown,
  TReservation = unknown,
  TReview = unknown,
> = {
  hospital: THospital | null;
  reservations: TReservation[];
  reviews: TReview[];
  fetchedAt: number;
  ownerId: string;
};

type CacheState = MyHospitalData | null;
type Listener = () => void;

let cache: CacheState = null;
let inFlight: Promise<MyHospitalData> | null = null;
const listeners = new Set<Listener>();
const MY_HOSPITAL_CACHE_TTL_MS = 45_000;

function notify() {
  listeners.forEach((listener) => listener());
}

function readForOwner(ownerId?: string | null) {
  if (!ownerId || cache?.ownerId !== ownerId) return null;
  return cache;
}

function isFresh(data: MyHospitalData | null) {
  return Boolean(data && Date.now() - data.fetchedAt < MY_HOSPITAL_CACHE_TTL_MS);
}

export function clearMyHospitalCache(ownerId?: string | null) {
  if (!ownerId || cache?.ownerId === ownerId) {
    cache = null;
    inFlight = null;
    notify();
  }
}

export function mutateMyHospitalCache<
  THospital = unknown,
  TReservation = unknown,
  TReview = unknown,
>(
  ownerId: string | null | undefined,
  updater: (
    current: MyHospitalData<THospital, TReservation, TReview> | null
  ) => MyHospitalData<THospital, TReservation, TReview> | null
) {
  if (!ownerId) return null;
  const current = readForOwner(ownerId) as MyHospitalData<THospital, TReservation, TReview> | null;
  const next = updater(current);
  cache = next as CacheState;
  notify();
  return next;
}

export async function fetchMyHospitalData<
  THospital = unknown,
  TReservation = unknown,
  TReview = unknown,
>(
  ownerId: string,
  options: { force?: boolean } = {}
) {
  const cached = readForOwner(ownerId) as MyHospitalData<THospital, TReservation, TReview> | null;
  if (cached && isFresh(cached as MyHospitalData) && !options.force) {
    return cached;
  }

  if (inFlight && !options.force) {
    return inFlight as Promise<MyHospitalData<THospital, TReservation, TReview>>;
  }

  const request = fetch('/api/my-hospital', { cache: 'no-store' })
    .then(async (res) => {
      if (!res.ok) throw new Error('병원 정보를 불러오지 못했습니다.');
      const payload = await res.json();
      const next: MyHospitalData<THospital, TReservation, TReview> = {
        hospital: payload.hospital ?? null,
        reservations: payload.reservations ?? [],
        reviews: payload.reviews ?? [],
        fetchedAt: Date.now(),
        ownerId,
      };
      cache = next as CacheState;
      notify();
      return next;
    })
    .finally(() => {
      if (inFlight === request) inFlight = null;
    });

  inFlight = request as Promise<MyHospitalData>;
  return request;
}

export function useMyHospitalData<
  THospital = unknown,
  TReservation = unknown,
  TReview = unknown,
>(
  ownerId?: string | null,
  options: { enabled?: boolean; revalidateOnMount?: boolean } = {}
) {
  const { enabled = true, revalidateOnMount = true } = options;
  const [data, setData] = useState<MyHospitalData<THospital, TReservation, TReview> | null>(() => (
    readForOwner(ownerId) as MyHospitalData<THospital, TReservation, TReview> | null
  ));
  const [loading, setLoading] = useState(() => Boolean(enabled && ownerId && !readForOwner(ownerId)));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setData(readForOwner(ownerId) as MyHospitalData<THospital, TReservation, TReview> | null);
    };
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, [ownerId]);

  const refresh = useCallback(async (refreshOptions: { force?: boolean; showLoading?: boolean } = {}) => {
    if (!enabled || !ownerId) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      return null;
    }

    const hasCachedData = Boolean(readForOwner(ownerId));
    const shouldShowBlockingLoading = refreshOptions.showLoading ?? !hasCachedData;
    if (shouldShowBlockingLoading && !hasCachedData) setLoading(true);
    if (hasCachedData) setRefreshing(true);
    setError(null);

    try {
      const next = await fetchMyHospitalData<THospital, TReservation, TReview>(
        ownerId,
        { force: refreshOptions.force }
      );
      setData(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : '병원 정보를 불러오지 못했습니다.');
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled, ownerId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!enabled || !ownerId) {
        setData(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const cached = readForOwner(ownerId);
      setData(cached as MyHospitalData<THospital, TReservation, TReview> | null);
      setLoading(!cached);
      if (revalidateOnMount && (!cached || !isFresh(cached))) {
        void refresh({ force: false, showLoading: !cached });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, ownerId, refresh, revalidateOnMount]);

  const mutate = useCallback((
    updater: (
      current: MyHospitalData<THospital, TReservation, TReview> | null
    ) => MyHospitalData<THospital, TReservation, TReview> | null
  ) => mutateMyHospitalCache<THospital, TReservation, TReview>(ownerId, updater), [ownerId]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh,
    mutate,
  };
}
