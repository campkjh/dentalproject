'use client';

// 홈 배너 — 사장 견본: 가운데 큰 정사각 카드(모서리 28) + 양옆 카드가 작게 살짝 보이는 넘기기.
//  · 카드 아래쪽은 그 배너 사진의 키 컬러(lib/image-tone)로 그라데이션이 차오르고, 그 위에 제목(굵게 2줄)·부제.
//  · 제목·부제는 프리티풀 배너처럼 가운데로 온 장에서만 다시 그려 아래→위로 흐림→선명(fadeSlideUp), 부제는 조금 늦게.
//  · 끝없이 돈다 — 목록을 세 벌 이어 붙이고 가운데 벌에 머물게, 스크롤이 멈추면 앞·뒤 벌에서 같은 장 자리로 소리 없이 옮긴다.
//  · 'N | 전체' 알약은 카드에 붙지 않고 가운데 카드 오른쪽 아래 자리에 고정.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { HomeBanner } from '@/types';
import { defaultHomeBanners } from '@/lib/home-banners';
import { useImageTone } from '@/lib/image-tone';

/** 카드 폭 — 모바일 화면의 76%(옆 카드가 보이게), 넓은 화면은 420 */
const CARD_W = 'min(76vw, 420px)';
const GAP = 12;
const COPIES = 3;

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
    <div
      className="shrink-0 snap-center transition-transform duration-500"
      style={{ width: CARD_W, aspectRatio: '1 / 1', transform: `scale(${active ? 1 : 0.92})`, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
    >
      {banner.targetUrl ? (
        <Link href={banner.targetUrl} className="block h-full w-full" aria-label={banner.title} draggable={false} tabIndex={active ? 0 : -1}>
          {body}
        </Link>
      ) : body}
    </div>
  );
}

export default function HomeBannerSlider() {
  const [banners, setBanners] = useState<HomeBanner[]>(defaultHomeBanners);
  /** 세 벌 이어 붙인 줄에서의 자리(가운데 벌 = count ~ 2count-1) */
  const [slot, setSlot] = useState(0);
  const [turn, setTurn] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef(0);
  const pausedUntil = useRef(0);
  const settleTimer = useRef(0);
  /** 벌 사이 순간 이동 중 — 같은 장이라 제목을 다시 띄우지 않는다 */
  const jumping = useRef(false);

  const visibleBanners = useMemo(() => banners.filter((banner) => banner.imageUrl || banner.title), [banners]);
  const count = visibleBanners.length;
  const loop = count > 1;
  const items = useMemo(() => (loop ? Array.from({ length: COPIES }, () => visibleBanners).flat() : visibleBanners), [visibleBanners, loop]);

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

  /** 줄 안 i 번째 카드를 가운데로 */
  const centerOn = (i: number, behavior: ScrollBehavior) => {
    const el = trackRef.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior });
  };

  // 처음·배너가 바뀌면 가운데 벌 첫 장에서 시작
  useLayoutEffect(() => {
    const start = loop ? count : 0;
    slotRef.current = start;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 줄 길이가 바뀐 직후 자리 맞춤
    setSlot(start);
    centerOn(start, 'instant');
  }, [count, loop]);

  // 자동 넘김 — 다음 장으로 부드럽게. 손으로 민 뒤 4초는 쉬고, 움직임 줄이기면 멈춤
  useEffect(() => {
    if (!loop) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      centerOn(slotRef.current + 1, 'smooth');
    }, 3400);
    return () => window.clearInterval(timer);
  }, [loop]);

  if (count === 0) return null;
  const real = ((slot % count) + count) % count;

  return (
    <section aria-label="홈 배너" className="relative mb-4 pc:-mx-8">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto hide-scrollbar py-1"
        style={{ gap: GAP, paddingInline: `calc((100% - ${CARD_W}) / 2)` }}
        onPointerDown={() => { pausedUntil.current = Date.now() + 4000; }}
        onTouchStart={() => { pausedUntil.current = Date.now() + 4000; }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const center = el.scrollLeft + el.clientWidth / 2;
          let best = 0;
          let bestDist = Infinity;
          Array.from(el.children).forEach((child, i) => {
            const c = child as HTMLElement;
            const dist = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
            if (dist < bestDist) { bestDist = dist; best = i; }
          });
          if (jumping.current) { jumping.current = false; return; }
          if (best !== slotRef.current) {
            slotRef.current = best;
            setSlot(best);
            setTurn(t => t + 1);
          }
          // 멈추면 앞·뒤 벌에서 가운데 벌 같은 장으로 소리 없이 옮긴다(끝없이 도는 것처럼)
          window.clearTimeout(settleTimer.current);
          settleTimer.current = window.setTimeout(() => {
            if (!loop) return;
            const s = slotRef.current;
            if (s < count || s >= count * 2) {
              const mid = count + (((s % count) + count) % count);
              slotRef.current = mid;
              setSlot(mid);
              jumping.current = true;
              centerOn(mid, 'instant');
            }
          }, 140);
        }}
      >
        {items.map((banner, i) => (
          <BannerCard key={`${banner.id}-${i}`} banner={banner} index={i % count} active={i === slot} turn={turn} />
        ))}
      </div>
      {/* 페이지 번호 — 카드에 붙지 않고 가운데 카드 오른쪽 아래 자리에 고정 */}
      {count > 1 && (
        <span
          className="pointer-events-none absolute bottom-[calc(0.25rem+24px)] z-[1] rounded-full bg-black/25 px-3 py-1 text-[12.5px] font-semibold tabular-nums text-white backdrop-blur"
          style={{ right: `calc((100% - ${CARD_W}) / 2 + 24px)` }}
          aria-label={`${count}장 중 ${real + 1}번째`}
        >
          {real + 1}<span className="mx-1 opacity-60">|</span>{count}
        </span>
      )}
    </section>
  );
}
