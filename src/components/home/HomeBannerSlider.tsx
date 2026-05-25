'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { HomeBanner } from '@/types';
import { defaultHomeBanners } from '@/lib/home-banners';

function BannerFrame({ banner }: { banner: HomeBanner }) {
  const imageUrl = banner.imageUrl || banner.mobileImageUrl;
  const content = imageUrl ? (
    <picture className="block h-full w-full">
      {banner.mobileImageUrl && <source media="(max-width: 767px)" srcSet={banner.mobileImageUrl} />}
      <img
        src={imageUrl}
        alt={banner.title}
        className="h-full w-full object-cover"
        draggable={false}
      />
    </picture>
  ) : (
    <div className="flex h-full w-full items-center justify-between overflow-hidden bg-[#EAF2FF] px-6 py-5">
      <div className="min-w-0">
        {banner.badgeText && (
          <span className="mb-3 inline-flex rounded-full bg-white/80 px-3 py-1 text-[12px] font-bold text-[#3478F6]">
            {banner.badgeText}
          </span>
        )}
        <h2 className="max-w-[72%] text-[24px] font-black leading-[1.22] text-gray-950">
          {banner.title}
        </h2>
        {banner.subtitle && (
          <p className="mt-2 text-[15px] font-bold leading-[1.35] text-[#4D74D8]">
            {banner.subtitle}
          </p>
        )}
      </div>
      <div className="h-24 w-24 flex-shrink-0 rounded-[28px] bg-white/70 shadow-[0_20px_60px_rgba(52,120,246,0.22)]" />
    </div>
  );

  if (banner.targetUrl) {
    return (
      <Link href={banner.targetUrl} className="block h-full w-full" aria-label={banner.title}>
        {content}
      </Link>
    );
  }

  return <div className="h-full w-full">{content}</div>;
}

export default function HomeBannerSlider() {
  const [banners, setBanners] = useState<HomeBanner[]>(defaultHomeBanners);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

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
        if (!cancelled && next.length > 0) {
          setBanners(next);
          setActiveIndex(0);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeIndex <= visibleBanners.length - 1) return;
    setActiveIndex(0);
  }, [activeIndex, visibleBanners.length]);

  useEffect(() => {
    if (visibleBanners.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % visibleBanners.length);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [visibleBanners.length]);

  if (visibleBanners.length === 0) return null;

  const go = (direction: 1 | -1) => {
    if (visibleBanners.length <= 1) return;
    setActiveIndex((current) => (current + direction + visibleBanners.length) % visibleBanners.length);
  };

  return (
    <section
      className="mx-4 mb-2 lg:mx-auto lg:max-w-7xl lg:px-6"
      aria-label="홈 배너"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
        const diff = endX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(diff) < 42) return;
        go(diff < 0 ? 1 : -1);
      }}
    >
      <div className="relative overflow-hidden rounded-[20px] bg-gray-100 shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
        >
          {visibleBanners.map((banner) => (
            <div key={banner.id} className="h-auto min-w-full">
              <div className="aspect-[2/1] w-full overflow-hidden lg:max-h-[420px]">
                <BannerFrame banner={banner} />
              </div>
            </div>
          ))}
        </div>

        {visibleBanners.length > 1 && (
          <>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1.5 backdrop-blur">
              {visibleBanners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/55'
                  }`}
                  aria-label={`${index + 1}번째 배너 보기`}
                />
              ))}
            </div>
            <div className="absolute bottom-3 right-3 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
              {activeIndex + 1}/{visibleBanners.length}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
