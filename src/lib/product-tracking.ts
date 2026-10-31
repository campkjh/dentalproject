'use client';

// 상품 노출·조회 기록(261101) — 의사 '상품 인사이트'용.
//  · 노출 = 목록 카드가 화면에 절반 이상 보임 / 조회 = 상세 열기. 같은 기기·같은 상품은 하루 한 번만 센다.
//  · 모아서 1.5초 뒤 한 번에 /api/products/track 으로 보내고, 창을 닫을 땐 sendBeacon 으로 남은 것을 보낸다.
import { useEffect } from 'react';

type Kind = 'impressions' | 'views';
const queue: Record<Kind, Set<string>> = { impressions: new Set(), views: new Set() };
let timer: ReturnType<typeof setTimeout> | null = null;
let hooked = false;

function today() {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); // 한국 날짜
}
function seenKey() { return `md-pt-${today()}`; }
/** 오늘 이미 센 상품이면 true, 아니면 표시해 두고 false */
function alreadyCounted(kind: Kind, id: string) {
  const key = `${kind[0]}:${id}`;
  try {
    const raw = localStorage.getItem(seenKey());
    const seen: string[] = raw ? JSON.parse(raw) : [];
    if (seen.includes(key)) return true;
    seen.push(key);
    localStorage.setItem(seenKey(), JSON.stringify(seen.slice(-800)));
    // 지난날 기록은 치운다
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith('md-pt-') && k !== seenKey()) localStorage.removeItem(k);
    }
  } catch { /* 저장소 막힘 — 그래도 보낸다 */ }
  return false;
}

function flush(beacon = false) {
  if (timer) { clearTimeout(timer); timer = null; }
  const body = { impressions: [...queue.impressions], views: [...queue.views] };
  if (!body.impressions.length && !body.views.length) return;
  queue.impressions.clear(); queue.views.clear();
  const json = JSON.stringify(body);
  if (beacon && navigator.sendBeacon) { navigator.sendBeacon('/api/products/track', new Blob([json], { type: 'application/json' })); return; }
  fetch('/api/products/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json, keepalive: true }).catch(() => {});
}

export function trackProduct(kind: Kind, id: string | undefined | null) {
  if (typeof window === 'undefined' || !id || !/^[0-9a-f-]{36}$/i.test(id)) return;
  if (alreadyCounted(kind, id)) return;
  queue[kind].add(id);
  if (!hooked) {
    hooked = true;
    window.addEventListener('pagehide', () => flush(true));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });
  }
  if (!timer) timer = setTimeout(() => flush(), 1500);
}

/** 카드가 화면에 절반 이상 보이면 노출 1회 */
export function useProductImpression(element: Element | null, id: string | undefined) {
  useEffect(() => {
    if (!element || !id || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { trackProduct('impressions', id); observer.disconnect(); }
    }, { threshold: 0.5 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, id]);
}
