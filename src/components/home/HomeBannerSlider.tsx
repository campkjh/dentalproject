'use client';

// 홈 배너 — 사장 견본: 가운데 큰 정사각 카드(모서리 28) + 양옆 카드가 작게 살짝 보이는 넘기기.
//  · 카드 아래쪽은 그 배너 사진의 키 컬러(lib/image-tone)로 그라데이션이 차오르고, 그 위에 제목(굵게 2줄)·부제.
//  · 오른쪽 아래 'N | 전체' 알약. 3.4초마다 다음 장, 손으로 밀면 4초 쉬었다 이어 간다.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { HomeBanner } from '@/types';
import { defaultHomeBanners } from '@/lib/home-banners';
import { useImageTone } from '@/lib/image-tone';

/** 카드 폭 — 모바일 화면의 76%(옆 카드가 보이게), 넓은 화면은 420 */
const CARD_W = 'min(76vw, 420px)';
const GAP = 12;

function BannerCard({ banner, index, total, active }: { banner: HomeBanner; index: number; total: number; active: boolean }) {
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
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[58%]"
        style={{ background: `linear-gradient(to top, ${key} 0%, ${key} 30%, transparent 100%)` }}
      />
      <div className="absolute inset-x-0 bottom-0 px-6 pb-6">
        <p className="whitespace-pre-line break-keep text-[clamp(22px,6.4vw,28px)] font-bold leading-[1.3] tracking-[-0.6px] text-[#191F28]">
          {banner.title}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          {banner.subtitle ? (
            <p className="min-w-0 truncate text-[clamp(14px,4vw,16px)] font-medium tracking-[-0.3px] text-[#333D4B]">{banner.subtitle}</p>
          ) : <span />}
          {total > 1 && (
            <span className="shrink-0 rounded-full bg-black/25 px-3 py-1 text-[12.5px] font-semibold tabular-nums text-white backdrop-blur">
              {index + 1}<span className="mx-1 opacity-60">|</span>{total}
            </span>
          )}
        </div>
      </div>
    </div>
  );
  return (
    <div
      className="shrink-0 snap-center transition-transform duration-500"
      style={{ width: CARD_W, aspectRatio: '1 / 1', transform: `scale(${active ? 1 : 0.92})`, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
    >
      {banner.targetUrl ? (
        <Link href={banner.targetUrl} className="block h-full w-full" aria-label={banner.title} draggable={false}>
          {body}
        </Link>
      ) : body}
    </div>
  );
}

export default function HomeBannerSlider() {
  const [banners, setBanners] = useState<HomeBanner[]>(defaultHomeBanners);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const pausedUntil = useRef(0);

  const visibleBanners = useMemo(
    () => banners.filter((banner) => banner.imageUrl || banner.title),
    [banners]
  );

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

  // 자동 넘김 — 다음 카드를 가운데로 굴리면 onScroll 이 고른 칸을 바꾼다. 손으로 민 뒤 4초는 쉬고, 움직임 줄이기면 멈춤
  useEffect(() => {
    const count = visibleBanners.length;
    if (count <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      const el = trackRef.current;
      if (!el || Date.now() < pausedUntil.current) return;
      const next = (activeRef.current + 1) % count;
      const card = el.children[next] as HTMLElement | undefined;
      if (card) el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' });
    }, 3400);
    return () => window.clearInterval(timer);
  }, [visibleBanners.length]);

  if (visibleBanners.length === 0) return null;

  return (
    <section aria-label="홈 배너" className="mb-4 pc:-mx-8">
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
          activeRef.current = best;
          if (best !== activeIndex) setActiveIndex(best);
        }}
      >
        {visibleBanners.map((banner, i) => (
          <BannerCard key={banner.id} banner={banner} index={i} total={visibleBanners.length} active={i === activeIndex} />
        ))}
      </div>
    </section>
  );
}
