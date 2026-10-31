'use client';

// 마이닥 매거진 글 — 홈 배너를 누르면 열리는 이야기(프리티풀 공지·이벤트 결, 매거진 톤).
//  · 머리 = TopBar(맨 위에선 사진 위에 투명, 내려가면 흰 줄).
//  · 히어로 = 배너 사진 + 사진 키 컬러(lib/image-tone) 바탕·아래 그라데이션, 배지 + 큰 제목 + 부제가 아래→위로 떠오른다.
//  · 본문 = 리드 · 섹션(h2 + 문단) · 에디터 팁 · 기억할 것(모두 칸 없이 글로만) · 회색 각주 → 이 주제의 인기 상품 → 다른 이야기.
//  · 바닥 = '관련 시술 보러가기'(배너 targetUrl, 없으면 숨김).
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import TopBar from '@/components/common/TopBar';
import ProductCard from '@/components/common/ProductCard';
import { EmptyBlock } from '@/components/mypage/screens/ScreenKit';
import type { HomeBanner } from '@/types';
import { useStore } from '@/store';
import { useImageTone } from '@/lib/image-tone';
import { bannerCategory, bannerDateLabel, storyForBanner, useHomeBannerList } from '@/lib/home-banner-stories';

const RISE = (delay: number) => ({ animation: `fadeSlideUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s both` });
const item = (i: number) => ({ animationDelay: `${0.18 + Math.min(i, 12) * 0.05}s` });

function Hero({ banner }: { banner: HomeBanner }) {
  const imageUrl = banner.mobileImageUrl || banner.imageUrl;
  const tone = useImageTone(imageUrl || null, 'square');
  const key = tone?.bg || '#EEF1F5';
  return (
    <section className="-mt-14 pc:mt-6 pc:px-5">
      <div
        className="relative aspect-square w-full overflow-hidden pc:aspect-[4/3] pc:rounded-[28px]"
        style={{ backgroundColor: key, transition: 'background-color .5s ease', transform: 'translateZ(0)' }}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {/* 사진 → 글 사이는 흰 그라데이션(261101 사장 요청) — 아래 흰 본문과 이어진다 */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[64%]" style={{ background: 'linear-gradient(to top, #fff 0%, #fff 30%, rgba(255,255,255,0.85) 52%, rgba(255,255,255,0) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-7 pc:px-8 pc:pb-8">
          <span className="inline-flex h-6 items-center rounded-[6px] bg-[#EFF5FE] px-2 text-[13.5px] font-semibold text-[#2F6FE4]" style={RISE(0.05)}>
            {banner.badgeText || '마이닥 매거진'}
          </span>
          <h1 className="mt-3 whitespace-pre-line break-keep text-[clamp(26px,7.6vw,30px)] font-bold leading-[1.3] tracking-[-0.7px] text-[#191F28]" style={RISE(0.12)}>
            {banner.title}
          </h1>
          {banner.subtitle && (
            <p className="mt-2 break-keep text-[16px] font-medium tracking-[-0.3px] text-[#333D4B]" style={RISE(0.24)}>{banner.subtitle}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function OtherStoryCard({ banner, index }: { banner: HomeBanner; index: number }) {
  const imageUrl = banner.mobileImageUrl || banner.imageUrl;
  const tone = useImageTone(imageUrl || null, 'square');
  const key = tone?.bg || '#EEF1F5';
  return (
    <Link
      href={`/magazine/${encodeURIComponent(banner.id)}`}
      className="qd-a-item card-press block w-[148px] shrink-0 snap-start"
      style={item(index)}
    >
      <div className="relative aspect-square overflow-hidden rounded-[20px]" style={{ backgroundColor: key, transform: 'translateZ(0)' }}>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[64%]" style={{ background: `linear-gradient(to top, ${key} 0%, ${key} 28%, transparent 100%)` }} />
        <p className="absolute inset-x-0 bottom-0 line-clamp-2 whitespace-pre-line break-keep px-3.5 pb-3.5 text-[14.5px] font-bold leading-[1.35] tracking-[-0.3px] text-[#191F28]">
          {banner.title}
        </p>
      </div>
      {banner.badgeText && <p className="mt-2 px-0.5 text-[13px] font-medium text-[#8B95A1]">{banner.badgeText}</p>}
    </Link>
  );
}

export default function MagazineStoryPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(String(params?.id ?? ''));
  const { banners, loaded } = useHomeBannerList();
  const products = useStore((st) => st.products);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const read = () => setScrolled(window.scrollY > 240);
    read();
    window.addEventListener('scroll', read, { passive: true });
    return () => window.removeEventListener('scroll', read);
  }, []);

  const banner = banners.find((b) => b.id === id) ?? null;
  const others = banners.filter((b) => b.id !== id);

  const related = useMemo(() => {
    if (!banner) return [];
    const cat = bannerCategory(banner);
    return products
      .filter((p) => !cat || p.category === cat)
      .slice()
      .sort((a, b) => (b.likeCount - a.likeCount) || (b.reviewCount - a.reviewCount))
      .slice(0, 4);
  }, [banner, products]);

  if (!banner) {
    return (
      <div className="mx-auto min-h-screen max-w-[720px] bg-white">
        <TopBar />
        {loaded && (
          <EmptyBlock icon="document" title="이야기를 찾을 수 없어요" desc="내려갔거나 주소가 바뀐 이야기예요.">
            <Link href="/magazine" className="mt-7 inline-flex h-12 items-center rounded-[14px] bg-[#F2F4F6] px-5 text-[15px] font-semibold text-[#333D4B]">
              다른 이야기 보기
            </Link>
          </EmptyBlock>
        )}
      </div>
    );
  }

  const story = storyForBanner(banner);
  const cta = banner.targetUrl;
  const dateLabel = bannerDateLabel(banner);
  let n = 0;

  return (
    <div className="mx-auto min-h-screen max-w-[720px] bg-white" style={{ letterSpacing: '-0.02em', paddingBottom: cta ? 'calc(env(safe-area-inset-bottom, 0px) + 112px)' : 48 }}>
      <TopBar transparent={!scrolled} />
      <Hero key={banner.id} banner={banner} />

      {/* ─── 본문 ─── */}
      <article key={`a-${banner.id}`} className="px-6 pb-8 pt-7 pc:px-10 pc:pt-9">
        <p className="qd-a-item text-[13.5px] font-medium text-[#8B95A1]" style={item(n++)}>
          {['마이닥 매거진', banner.badgeText, dateLabel !== '마이닥 매거진' ? dateLabel : ''].filter(Boolean).join(' · ')}
        </p>
        {story.lead && (
          <p className="qd-a-item mt-4 break-keep text-[18px] leading-[1.75] tracking-[-0.3px] text-[#333D4B]" style={item(n++)}>
            {story.lead}
          </p>
        )}

        {story.sections.map((sec) => (
          <section key={sec.title} className="qd-a-item mt-10" style={item(n++)}>
            <h2 className="break-keep text-[20px] font-bold leading-[1.4] tracking-[-0.4px] text-[#191F28]">{sec.title}</h2>
            {sec.paragraphs.map((p, i) => (
              <p key={i} className="mt-3 break-keep text-[16.5px] leading-[1.75] tracking-[-0.2px] text-[#4E5968]">{p}</p>
            ))}
          </section>
        ))}

        {/* 팁·체크리스트도 칸·체크 없이 글로만(261101 사장 요청) */}
        {story.tip && (
          <section className="qd-a-item mt-10" style={item(n++)}>
            <h2 className="text-[20px] font-bold leading-[1.4] tracking-[-0.4px] text-[#191F28]">에디터 팁</h2>
            <p className="mt-3 break-keep text-[16.5px] leading-[1.75] tracking-[-0.2px] text-[#4E5968]">{story.tip}</p>
          </section>
        )}

        {story.checklist && story.checklist.length > 0 && (
          <section className="qd-a-item mt-10" style={item(n++)}>
            <h2 className="break-keep text-[20px] font-bold leading-[1.4] tracking-[-0.4px] text-[#191F28]">{story.checklistTitle || '이것만 기억해요'}</h2>
            {story.checklist.map((c) => (
              <p key={c} className="mt-3 break-keep text-[16.5px] leading-[1.75] tracking-[-0.2px] text-[#4E5968]">{c}</p>
            ))}
          </section>
        )}

        <p className="qd-a-item mt-10 text-[13.5px] leading-[1.6] text-[#8B95A1]" style={item(n++)}>
          개인에 따라 결과가 다를 수 있어요. 시술 전 의료진과 상담하세요.
        </p>
      </article>

      {related.length > 0 && (
        <>
          <div className="h-2.5 bg-[#F2F4F6]" />
          <section className="px-5 py-7 pc:px-8">
            <h2 className="text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">이 주제의 인기 상품</h2>
            <div className="mt-4 grid grid-cols-2 gap-2.5 pc:gap-4">
              {related.map((p, i) => (
                <div key={p.id} className="qd-a-item" style={item(i)}>
                  <ProductCard product={p} index={i} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {others.length > 0 && (
        <>
          <div className="h-2.5 bg-[#F2F4F6]" />
          <section className="py-7">
            <div className="flex items-center justify-between px-5 pc:px-8">
              <h2 className="text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">다른 이야기</h2>
              <Link href="/magazine" className="text-[15px] font-semibold text-[#8B95A1]">전체 보기</Link>
            </div>
            <div className="hide-scrollbar mt-4 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pc:scroll-px-8 pc:px-8">
              {others.map((b, i) => <OtherStoryCard key={b.id} banner={b} index={i} />)}
            </div>
          </section>
        </>
      )}

      {/* ─── 바닥 버튼 ─── */}
      {cta && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-white px-4" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)' }}>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-gradient-to-b from-white/0 to-white" />
          <div className="mx-auto max-w-[680px] pt-2">
            <Link href={cta} className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-transform active:scale-[0.98]">
              관련 시술 보러가기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
