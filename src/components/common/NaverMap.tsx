'use client';

import { useEffect, useRef, useState } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    naver?: any;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
const SCRIPT_ID = 'naver-maps-sdk';

let loadPromise: Promise<void> | null = null;
function loadNaverMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.naver?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    if (!CLIENT_ID) {
      reject(new Error('NEXT_PUBLIC_NAVER_MAP_CLIENT_ID is not set'));
      return;
    }
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('script error')));
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${CLIENT_ID}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('script error'));
    document.head.appendChild(script);
  });
  return loadPromise;
}

type Props = {
  /** 좌표가 없을 때 주소로 geocoding 한다 */
  address?: string;
  lat?: number | null;
  lng?: number | null;
  name?: string;
  zoom?: number;
  className?: string;
};

export default function NaverMap({ address, lat, lng, name, zoom = 16, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null
  );
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // 1) 좌표 확보: props 우선, 없으면 주소로 geocode
  useEffect(() => {
    let cancelled = false;
    if (typeof lat === 'number' && typeof lng === 'number') {
      setCoords({ lat, lng });
      return;
    }
    const q = address?.trim();
    if (!q) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    fetch(`/api/geocode?query=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (typeof d?.lat === 'number' && typeof d?.lng === 'number') {
          setCoords({ lat: d.lat, lng: d.lng });
        } else {
          setStatus('error');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [address, lat, lng]);

  // 2) 좌표가 준비되면 지도 렌더
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    loadNaverMaps()
      .then(() => {
        if (cancelled || !ref.current || !window.naver?.maps) return;
        const { naver } = window;
        const center = new naver.maps.LatLng(coords.lat, coords.lng);
        const map = new naver.maps.Map(ref.current, {
          center,
          zoom,
          scrollWheel: false,
        });
        new naver.maps.Marker({ position: center, map, title: name });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [coords, zoom, name]);

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={ref} style={{ width: '100%', height: '100%' }} />
      {status !== 'ready' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F4F5F7',
            color: '#A4ABBA',
            fontSize: 13,
          }}
        >
          {status === 'error' ? '위치 정보를 불러올 수 없습니다' : '지도 불러오는 중…'}
        </div>
      )}
    </div>
  );
}
