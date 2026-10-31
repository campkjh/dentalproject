'use client';

// 마이닥 매거진 목록 — 공지사항(토스 뉴스룸 카드) 결 그대로, 바탕만 배너 사진.
//  · 4:3 카드(r28)에 배너 사진 + 아래쪽 사진 키 컬러(lib/image-tone) 그라데이션 위에 '배지 | 기간' + 굵은 제목 2줄.
//  · 모바일 1열 · PC 2열. 누르면 /magazine/[id].
import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import type { HomeBanner } from '@/types';
import { Screen, EmptyBlock, screenCss as s } from '@/components/mypage/screens/ScreenKit';
import { useImageTone } from '@/lib/image-tone';
import { bannerDateLabel, useHomeBannerList } from '@/lib/home-banner-stories';

function StoryCard({ banner, index }: { banner: HomeBanner; index: number }) {
  const imageUrl = banner.mobileImageUrl || banner.imageUrl;
  const tone = useImageTone(imageUrl || null, 'square');
  const key = tone?.bg || '#EEF1F5';
  return (
    <Link
      href={`/magazine/${encodeURIComponent(banner.id)}`}
      className={`${s.newsCard} qd-a-item block`}
      style={{ animationDelay: `${0.22 + Math.min(index, 10) * 0.05}s` }}
    >
      <div
        // translateZ(0): 사파리에서 안쪽 흐림이 둥근 모서리 밖으로 번지지 않게
        className="relative overflow-hidden rounded-[28px] pc:rounded-[32px]"
        style={{ aspectRatio: '4 / 3', backgroundColor: key, transform: 'translateZ(0)', transition: 'background-color .5s ease' }}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className={`${s.newsArt} absolute inset-0 h-full w-full object-cover`} loading={index < 2 ? 'eager' : 'lazy'} />
        )}
        <span aria-hidden="true" className={`${s.newsBlur} pointer-events-none absolute inset-x-0 bottom-0 h-[62%]`} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%]"
          style={{ background: `linear-gradient(to bottom, color-mix(in srgb, ${key} 0%, transparent) 0%, color-mix(in srgb, ${key} 70%, transparent) 50%, ${key} 100%)` }}
        />
        <span className="absolute inset-x-0 bottom-0 block px-6 pb-6 pc:px-7 pc:pb-7">
          <span className="flex items-center text-[13px] font-medium leading-[1.4] tracking-[-0.2px] text-[#4E5968]">
            {banner.badgeText || '마이닥 매거진'}
            <span aria-hidden="true" className="mx-2 h-[11px] w-px bg-[#8B95A1] opacity-50" />
            {bannerDateLabel(banner)}
          </span>
          <span className="mt-2.5 line-clamp-2 whitespace-pre-line break-keep text-[19px] font-bold leading-[1.38] tracking-[-0.5px] text-[#191F28] pc:text-[20px]">
            {banner.title}
          </span>
        </span>
      </div>
    </Link>
  );
}

export default function MagazineListPage() {
  const { banners, loaded } = useHomeBannerList();
  return (
    <Screen wide>
      <TopBar title="마이닥 매거진" sub="건강과 아름다움에 관한 이야기를 모았어요" />
      {banners.length === 0 ? (
        loaded ? <EmptyBlock icon="document" title="아직 올라온 이야기가 없어요" desc="새로운 이야기가 생기면 이곳에 알려드릴게요." /> : null
      ) : (
        <div className="grid grid-cols-1 gap-4 px-5 pt-1 pc:grid-cols-2 pc:gap-6 pc:px-8">
          {banners.map((b, i) => <StoryCard key={b.id} banner={b} index={i} />)}
        </div>
      )}
    </Screen>
  );
}
