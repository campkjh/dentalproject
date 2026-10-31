'use client';

// 홈 배너 — 사장 견본: 가운데 큰 정사각 카드(모서리 28) + 양옆 카드가 작게 살짝 보이는 넘기기.
//  · 카드 아래쪽은 그 배너 사진의 키 컬러(lib/image-tone)로 그라데이션이 차오르고, 그 위에 제목(굵게 2줄)·부제.
//  · 제목·부제는 프리티풀 배너처럼 가운데로 온 장에서만 다시 그려 아래→위로 흐림→선명(fadeSlideUp), 부제는 조금 늦게.
//  · 넘기기(261101 다시) = 손가락을 따라 움직이는 자리(pos, 소수) 하나로 그린다 — 옛 '세 벌 이어 붙이고 몰래 옮기기'(가로 스크롤+스냅)는
//    관성·스냅·몰래 옮기기가 엇갈려 튀었다. 이제 가운데 ±2 장만 그리고 끝없이 돈다(장 번호는 나머지). 놓으면 빠르기 보고 한 장씩 착 붙는다.
//  · 누르면 매거진(/magazine/<id>)으로. 민 뒤 손을 떼는 건 누름으로 치지 않는다.
//  · 'N | 전체' 알약은 카드에 붙지 않고 가운데 카드 오른쪽 아래 자리에 고정.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { HomeBanner } from '@/types';
import { defaultHomeBanners } from '@/lib/home-banners';
import { useImageTone } from '@/lib/image-tone';

/** 카드 폭 — 모바일 화면의 76%(옆 카드가 보이게), 넓은 화면은 420 */
const cardWidth = (w: number) => Math.min(w * 0.76, 420);
const GAP = 12;

function BannerCard({ banner, index, active, turn }: { banner: HomeBanner; index: number; active: boolean; turn: number }) {
  const imageUrl = banner.mobileImageUrl || banner.imageUrl;
  const tone = useImageTone(imageUrl || null, 'square');
  const key = tone?.bg || '#EEF1F5';
  const body = (
    <div className="relative h-full w-full overflow-hidden rounded-[28px]" style={{ backgroundColor: key, transition: 'background-color .5s ease' }}>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} loading={index < 2 ? 'eager' : 'lazy'} />
      )}
      {/* 아래쪽 키 컬러 그라데이션 — 글자가 사진 위에서도 읽히게 */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[58%]" style={{ background: `linear-gradient(to top, ${key} 0%, ${key} 30%, transparent 100%)` }} />
      {/* 제목·부제 — 가운데 장이 될 때마다 새로 그려 떠오른다(옆 장은 숨김) */}
      <div key={active ? `on-${turn}` : 'off'} className="absolute inset-x-0 bottom-0 px-6 pb-6 pr-[84px]" style={{ opacity: active ? undefined : 0, transition: active ? undefined : 'opacity .25s ease' }}>
        <p
          className="whitespace-pre-line break-keep text-[clamp(22px,6.4vw,28px)] font-bold leading-[1.3] tracking-[-0.6px] text-[#191F28]"
          style={active ? { animation: 'fadeSlideUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both' } : undefined}
        >
          {banner.title}
        </p>
        {banner.subtitle && (
          <p
            className="mt-2 truncate text-[clamp(14px,4vw,16px)] font-medium tracking-[-0.3px] text-[#333D4B]"
            style={active ? { animation: 'fadeSlideUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.24s both' } : undefined}
          >
            {banner.subtitle}
          </p>
        )}
      </div>
    </div>
  );
  return (
    <Link href={`/magazine/${banner.id}`} className="block h-full w-full" aria-label={banner.title} draggable={false} tabIndex={active ? 0 : -1}>
      {body}
    </Link>
  );
}

/** 가운데 배너의 키 컬러가 위에서 아래로 은은하게 번지는 바탕 — 장마다 한 겹, 바뀌면 천천히 겹쳐 바뀐다 */
function BannerWash({ banner, active }: { banner: HomeBanner; active: boolean }) {
  const tone = useImageTone(banner.mobileImageUrl || banner.imageUrl || null, 'square');
  if (!tone) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-[calc(-80px-env(safe-area-inset-top))] bottom-[-72px] pc:-top-6"
      style={{
        background: `linear-gradient(180deg, color-mix(in srgb, ${tone.bg} 85%, #ffffff) 0%, color-mix(in srgb, ${tone.bg} 45%, #ffffff) 45%, rgba(255,255,255,0) 100%)`,
        opacity: active ? 1 : 0,
        transition: 'opacity .9s ease',
      }}
    />
  );
}

export default function HomeBannerSlider() {
  const [banners, setBanners] = useState<HomeBanner[]>(defaultHomeBanners);
  const visibleBanners = useMemo(() => banners.filter((banner) => banner.imageUrl || banner.title), [banners]);
  const count = visibleBanners.length;
  const loop = count > 1;

  const boxRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(0);
  /** 지금 자리(장 단위 소수, 끝없이 커지거나 작아진다) — 그리기용 state + 손·애니용 ref */
  const [pos, setPosState] = useState(0);
  const posRef = useRef(0);
  const [settled, setSettled] = useState(true);
  const anim = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number; t: number; start: number; moved: boolean; lastX: number; lastT: number; v: number } | null>(null);
  const suppressClick = useRef(false);
  const pausedUntil = useRef(0);

  const setPos = useCallback((v: number) => { posRef.current = v; setPosState(v); }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/home-banners', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        const next = Array.isArray(payload?.banners) ? payload.banners : [];
        if (!cancelled && next.length > 0) setBanners(next);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  // 폭 재기
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  /** to 자리로 부드럽게(easeOutCubic) */
  const animateTo = useCallback((to: number, ms = 420) => {
    cancelAnimationFrame(anim.current);
    const from = posRef.current;
    if (Math.abs(to - from) < 0.001) { setPos(to); setSettled(true); return; }
    setSettled(false);
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - (1 - k) ** 3;
      setPos(from + (to - from) * e);
      if (k < 1) anim.current = requestAnimationFrame(tick);
      else setSettled(true);
    };
    anim.current = requestAnimationFrame(tick);
  }, [setPos]);

  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  // 자동 넘김 — 손으로 민 뒤 4초는 쉬고, 움직임 줄이기면 멈춤, 화면 밖 탭이면 쉼
  useEffect(() => {
    if (!loop) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      if (drag.current || document.hidden || Date.now() < pausedUntil.current) return;
      animateTo(Math.round(posRef.current) + 1, 620);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [loop, animateTo]);

  if (count === 0) return null;
  const cardW = boxW ? cardWidth(boxW) : 0;
  const step = cardW + GAP;
  const mod = (k: number) => ((k % count) + count) % count;
  const center = Math.round(pos);
  const real = mod(center);
  const ks = loop ? [center - 2, center - 1, center, center + 1, center + 2] : [0];

  const onPointerDown = (e: React.PointerEvent) => {
    if (!loop || !step) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    cancelAnimationFrame(anim.current);
    setSettled(false);
    suppressClick.current = false;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), start: posRef.current, moved: false, lastX: e.clientX, lastT: performance.now(), v: 0 };
    pausedUntil.current = Date.now() + 4000;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      // 세로로 먼저 움직이면 화면 스크롤에 양보
      if (Math.abs(dy) > Math.abs(dx)) { drag.current = null; animateTo(Math.round(posRef.current)); return; }
      d.moved = true;
      suppressClick.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    const now = performance.now();
    if (now > d.lastT) d.v = 0.8 * ((e.clientX - d.lastX) / (now - d.lastT)) + 0.2 * d.v;
    d.lastX = e.clientX; d.lastT = now;
    setPos(d.start - dx / step);
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    pausedUntil.current = Date.now() + 4000;
    if (!d.moved) { setSettled(true); return; }
    // 빠르게 튕기면 그쪽으로 한 장, 아니면 가까운 장 — 한 번에 한 장까지만
    const flick = Math.abs(d.v) > 0.35 ? -Math.sign(d.v) * 0.5 : 0;
    const target = Math.max(Math.round(d.start) - 1, Math.min(Math.round(d.start) + 1, Math.round(posRef.current + flick)));
    animateTo(target, 380);
  };

  return (
    <section aria-label="홈 배너" className="relative mb-4 pc:-mx-8">
      {visibleBanners.map((banner, i) => <BannerWash key={banner.id} banner={banner} active={i === real} />)}
      <div
        ref={boxRef}
        className="relative select-none overflow-hidden py-1"
        style={{ height: cardW ? cardW + 8 : `calc(min(76vw, 420px) + 8px)`, touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(e) => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }}
        onDragStart={(e) => e.preventDefault()}
      >
        {cardW > 0 && ks.map((k) => {
          const dist = Math.abs(k - pos);
          const isActive = settled && k === center;
          return (
            <div
              key={k}
              className="absolute top-1"
              style={{
                width: cardW,
                height: cardW,
                left: (boxW - cardW) / 2,
                transform: `translate3d(${(k - pos) * step}px,0,0) scale(${1 - 0.08 * Math.min(1, dist)})`,
                willChange: 'transform',
              }}
            >
              <BannerCard banner={visibleBanners[mod(k)]} index={mod(k)} active={isActive} turn={k} />
            </div>
          );
        })}
      </div>
      {/* 페이지 번호 — 카드에 붙지 않고 가운데 카드 오른쪽 아래 자리에 고정 */}
      {count > 1 && cardW > 0 && (
        <span
          className="pointer-events-none absolute bottom-[calc(0.25rem+24px)] z-[1] rounded-full bg-black/25 px-3 py-1 text-[12.5px] font-semibold tabular-nums text-white backdrop-blur"
          style={{ right: (boxW - cardW) / 2 + 24 }}
          aria-label={`${count}장 중 ${real + 1}번째`}
        >
          {real + 1}<span className="mx-1 opacity-60">|</span>{count}
        </span>
      )}
    </section>
  );
}
