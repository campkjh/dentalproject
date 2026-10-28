'use client';

// 포켓(옛 찜목록) — 장바구니처럼 담아 둔 상품을 골라 예약한다(프리티풀 토스 결).
//  · 탭 = 포켓 · 최근 본. 포켓 = 전체 선택 줄 + 상품 줄(체크 · 사진 · 병원 · 이름 · 가격) + 선택 삭제.
//  · 아래 고정 영역(모바일) / 오른쪽 요약 칸(PC) = 선택 개수 · 합계 · 큰 '예약하기'(56 · r16).
//  · 예약은 상품 하나씩이라 — 1개 고르면 바로 /booking, 여러 개면 시트에서 먼저 예약할 상품을 고른다.
//  · 데이터는 store 의 wishlist/toggleWishlist 그대로(이름만 화면에서 '포켓').
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import { useStore } from '@/store';
import type { Product } from '@/types';
import LoginRequired from '@/components/common/LoginRequired';
import ProductCard from '@/components/common/ProductCard';
import { HeaderSearchIcon } from '@/components/icons/HeaderIcons';
import { PocketIcon } from '@/components/icons/PocketIcon';
import PocketRow, { CheckCircle } from '@/components/pocket/PocketRow';
import pocketStyles from '@/components/pocket/pocket.module.css';
import { useListEntrance, useTabEntrance } from '@/components/reservations/useTabEntrance';
import matchStyles from '@/components/reservations/match.module.css';
import { resolveProductImageUrl } from '@/lib/images';

type Tab = 'pocket' | 'recent';

const tabKeys: Tab[] = ['pocket', 'recent'];
const LEAVE_MS = 260;

const won = (n: number) => `${n.toLocaleString()}원`;

export default function PocketPage() {
  const router = useRouter();
  const { isLoggedIn, products, wishlist, recentlyViewed, toggleWishlist, showConfirm, showToast } = useStore();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('pocket');
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const activeIndex = tabKeys.indexOf(activeTab);
  // 체크 — 새로 담긴 상품은 켜진 채로 들어오게 '끈 것'만 기억한다(장바구니처럼 기본 전체 선택)
  const [unchecked, setUnchecked] = useState<Set<string>>(() => new Set());
  // × 로 빼는 줄 — 옆으로 밀리며 접힌 뒤 실제로 뺀다
  const [leaving, setLeaving] = useState<Set<string>>(() => new Set());
  const [bookSheet, setBookSheet] = useState(false);

  useLayoutEffect(() => {
    const btn = tabBtnRefs.current[activeIndex];
    if (!btn) return;
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeIndex, isLoggedIn]);

  const pocketProducts = useMemo(() => products.filter((p) => wishlist.includes(p.id)), [products, wishlist]);
  const recentProducts = useMemo(
    () => recentlyViewed.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p),
    [recentlyViewed, products],
  );
  const hasNew = recentProducts.length > 0;

  const selected = useMemo(() => pocketProducts.filter((p) => !unchecked.has(p.id) && !leaving.has(p.id)), [pocketProducts, unchecked, leaving]);
  const allChecked = pocketProducts.length > 0 && selected.length === pocketProducts.filter((p) => !leaving.has(p.id)).length;
  const total = selected.reduce((sum, p) => sum + p.price, 0);
  const originalTotal = selected.reduce((sum, p) => sum + Math.max(p.originalPrice ?? p.price, p.price), 0);
  const saved = originalTotal - total;

  // 실시간 TOP 10 인기 시술 — 좋아요 + 리뷰 수 기반 정렬
  const topProducts = useMemo(
    () => [...products]
      .sort((a, b) => (b.likeCount ?? 0) + (b.reviewCount ?? 0) - ((a.likeCount ?? 0) + (a.reviewCount ?? 0)))
      .slice(0, 10),
    [products],
  );

  // 첫 진입 = 프리티풀 탭 등장(제목↑ · 줄 ←) — 뒤로가기·30초 안 재진입은 생략
  const entrance = useTabEntrance('pocket');
  const displayed = activeTab === 'pocket' ? pocketProducts : recentProducts;
  const enterProps = useListEntrance(displayed.map((p) => `${activeTab}:${p.id}`), entrance);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleCheck = (id: string) => {
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setUnchecked(allChecked ? new Set(pocketProducts.map((p) => p.id)) : new Set());
  };

  const removeOne = (id: string) => {
    if (leaving.has(id)) return;
    setLeaving((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      toggleWishlist(id);
      setLeaving((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setUnchecked((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, LEAVE_MS);
  };

  const removeSelected = () => {
    if (selected.length === 0) return;
    const ids = selected.map((p) => p.id);
    showConfirm(
      '선택한 상품을 뺄까요?',
      `${ids.length}개 상품을 포켓에서 빼요.`,
      () => {
        ids.forEach((id) => toggleWishlist(id));
        // 상품마다 뜨는 토스트를 한 줄로 덮는다
        showToast(`${ids.length}개 상품을 포켓에서 뺐어요.`);
      },
      { confirmText: '빼기', cancelText: '닫기' },
    );
  };

  const goBooking = (productId: string) => {
    setBookSheet(false);
    router.push(`/booking?productId=${encodeURIComponent(productId)}`);
  };

  const startBooking = () => {
    if (selected.length === 0) return;
    if (selected.length === 1) goBooking(selected[0].id);
    else setBookSheet(true);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const showCheckout = isLoggedIn && activeTab === 'pocket' && pocketProducts.length > 0;
  const bookLabel = selected.length > 1 ? `${selected.length}개 중 하나씩 예약하기` : '예약하기';

  return (
    <div className="min-h-screen w-full bg-white">
      {/* 탭 머리 — 모바일은 프리티풀 탭 머리 표준(왼쪽 16 · 20 굵게 · 오른쪽 돋보기), PC 는 전체 헤더 아래 큰 제목 */}
      <div className="sticky top-0 z-40 flex items-center justify-between bg-white px-4 pc:hidden" style={{ height: 56 }}>
        <h1 className={`text-[20px] font-bold leading-none text-[#191F28] ${entrance ? matchStyles.enterTitle : ''}`}>포켓</h1>
        <Link href="/search" aria-label="시술 검색" className="-mr-1.5 flex h-11 w-11 items-center justify-center transition-transform active:scale-90">
          <HeaderSearchIcon />
        </Link>
      </div>
      <div className="hidden pb-4 pt-10 pc:block">
        <h1 className={`text-[26px] font-bold leading-tight tracking-[-0.5px] text-[#191F28] ${entrance ? matchStyles.enterTitle : ''}`}>포켓</h1>
        <p className={`mt-1 text-[14px] text-[#8B95A1] ${entrance ? matchStyles.enterSub : ''}`}>담아 둔 시술을 골라 비교하고 바로 예약해 보세요</p>
      </div>

      {!isLoggedIn ? (
        <LoginRequired />
      ) : (
        <>
          {/* 탭 — 밀리는 밑줄(기존 partner-community 탭 어법) */}
          <div className="partner-community-category-shell sticky top-[56px] z-10 bg-white pc:top-[72px]">
            <div className="partner-community-categories hide-scrollbar">
              <span
                aria-hidden
                className="partner-community-category-indicator"
                style={{
                  width: indicator.width,
                  transform: `translateX(${indicator.left}px)`,
                  opacity: indicator.width > 0 ? 1 : 0,
                }}
              />
              {tabKeys.map((tab, i) => {
                const showActive = activeTab === tab && indicator.width > 0;
                const label = tab === 'pocket' ? '포켓' : '최근 본';
                const count = tab === 'pocket' ? pocketProducts.length : recentProducts.length;
                return (
                  <button
                    key={tab}
                    ref={(el) => {
                      tabBtnRefs.current[i] = el;
                    }}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={showActive ? 'is-active' : undefined}
                  >
                    {label}{count > 0 ? ` ${count}` : ''}
                    {tab === 'recent' && hasNew && (
                      <span className="ml-1 inline-flex h-[14px] items-center justify-center rounded-full bg-[#F04452] px-1.5 align-middle text-[9px] font-bold leading-[14px] text-white">
                        NEW
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {displayed.length === 0 ? (
            <>
              {/* 빈 화면 — 가방 아이콘 · 안내 · 둘러보기 */}
              <div className="flex flex-col items-center px-6 pb-10 pt-14 text-center">
                <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#E8F3FF] text-[#3180F7]">
                  <PocketIcon size={36} strokeWidth={1.9} />
                </span>
                <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">
                  {activeTab === 'pocket' ? '아직 포켓에 담은 상품이 없어요' : '최근 본 상품이 없어요'}
                </p>
                <p className="mt-1.5 text-[15px] leading-[1.6] tracking-[-0.2px] text-[#8B95A1]">
                  {activeTab === 'pocket' ? '마음에 드는 시술을 포켓에 담아 두고 한 번에 비교해 보세요' : '상품을 둘러보면 여기에 차례로 모여요'}
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold tracking-[-0.3px] text-[#3180F7] transition active:scale-[0.97] active:bg-[#DCEBFF]"
                >
                  시술 둘러보기
                </Link>
              </div>

              {/* 실시간 TOP 10 인기 시술 */}
              {topProducts.length > 0 && (
                <section className="mt-2 border-t border-[#F2F4F6] pb-10 pt-6">
                  <h2 className="mb-4 px-4 text-[20px] font-bold leading-[28px] tracking-[-0.4px] text-[#191F28] pc:px-0">
                    실시간 <span className="text-[#3180F7]">TOP 10</span> 인기 시술
                  </h2>
                  <TopProductsCarousel products={topProducts} />
                </section>
              )}
            </>
          ) : activeTab === 'pocket' ? (
            <div key="pocket" className="list-fade-slide pc:grid pc:grid-cols-[minmax(0,1fr)_360px] pc:items-start pc:gap-8 pc:pt-4">
              <div className="min-w-0">
                {/* 전체 선택 · 선택 삭제 */}
                <div className="flex h-14 items-center justify-between px-4 pc:px-0">
                  <button type="button" role="checkbox" aria-checked={allChecked} onClick={toggleAll} className="flex items-center gap-2.5 transition-opacity active:opacity-70">
                    <CheckCircle on={allChecked} />
                    <span className="text-[15px] font-semibold tracking-[-0.2px] text-[#333D4B]">
                      전체 선택 <span className="tabular-nums text-[#8B95A1]">{selected.length}/{pocketProducts.length}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={removeSelected}
                    disabled={selected.length === 0}
                    className="h-9 rounded-full px-3 text-[14px] font-semibold tracking-[-0.2px] text-[#6B7684] transition active:bg-[#F2F4F6] disabled:text-[#C9CED6]"
                  >
                    선택 삭제
                  </button>
                </div>
                <div className="mx-4 h-px bg-[#F2F4F6] pc:mx-0" />

                <ul className="divide-y divide-[#F2F4F6] px-4 pc:px-0">
                  {pocketProducts.map((p) => {
                    const enter = enterProps(`pocket:${p.id}`);
                    return (
                      <PocketRow
                        key={p.id}
                        product={p}
                        mode="pocket"
                        checked={!unchecked.has(p.id)}
                        leaving={leaving.has(p.id)}
                        onToggleCheck={() => toggleCheck(p.id)}
                        onRemove={() => removeOne(p.id)}
                        className={enter.className}
                        style={enter.style}
                      />
                    );
                  })}
                </ul>

                {/* 모바일 — 아래 고정 영역에 가리지 않게 자리 */}
                <div className="h-[200px] pc:hidden" />
              </div>

              {/* PC 오른쪽 요약 — 선택 개수 · 금액 · 예약하기 */}
              <aside className="hidden pc:block pc:self-stretch">
                <div className="sticky top-[132px] rounded-[24px] bg-[#F9FAFB] p-6">
                  <div className="flex items-center gap-2">
                    <PocketIcon size={20} filled className="text-[#3180F7]" />
                    <h2 className="text-[16px] font-bold text-[#191F28]">선택한 상품</h2>
                    <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[12px] font-semibold tabular-nums text-[#4E5968]">{selected.length}개</span>
                  </div>
                  <dl className="mt-5 space-y-2.5 text-[15px] tracking-[-0.2px]">
                    <div className="flex justify-between"><dt className="text-[#6B7684]">상품 금액</dt><dd className="tabular-nums text-[#333D4B]">{won(originalTotal)}</dd></div>
                    <div className="flex justify-between"><dt className="text-[#6B7684]">할인 금액</dt><dd className="tabular-nums text-[#F04452]">{saved > 0 ? `-${won(saved)}` : '0원'}</dd></div>
                  </dl>
                  <div className="my-4 h-px bg-[#E5E8EB]" />
                  <div className="flex items-baseline justify-between">
                    <span className="text-[15px] font-semibold text-[#191F28]">합계</span>
                    <span className="text-[22px] font-bold tabular-nums tracking-[-0.4px] text-[#191F28]">{won(total)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={startBooking}
                    disabled={selected.length === 0}
                    className="mt-5 flex h-14 w-full items-center justify-center rounded-[16px] bg-[#3180F7] text-[17px] font-bold tracking-[-0.2px] text-white transition hover:bg-[#2272EB] active:scale-[0.98] disabled:bg-[#D1D6DB]"
                  >
                    {selected.length === 0 ? '상품을 골라 주세요' : bookLabel}
                  </button>
                  <p className="mt-3 text-center text-[12px] leading-5 text-[#8B95A1]">예약은 상품 하나씩 진행돼요. 가격은 병원 사정에 따라 바뀔 수 있어요.</p>
                </div>
              </aside>
            </div>
          ) : (
            <div key="recent" className="list-fade-slide pc:pt-4">
              <ul className="divide-y divide-[#F2F4F6] px-4 pc:grid pc:grid-cols-2 pc:gap-x-8 pc:divide-y-0 pc:px-0">
                {recentProducts.map((p) => {
                  const enter = enterProps(`recent:${p.id}`);
                  return (
                    <PocketRow
                      key={p.id}
                      product={p}
                      mode="recent"
                      inPocket={wishlist.includes(p.id)}
                      onTogglePocket={() => toggleWishlist(p.id)}
                      className={`pc:border-b pc:border-[#F2F4F6] ${enter.className ?? ''}`}
                      style={enter.style}
                    />
                  );
                })}
              </ul>
              <div className="h-24 pc:hidden" />
            </div>
          )}
        </>
      )}

      {/* 모바일 아래 고정 영역 — 선택 개수 · 합계 · 큰 예약하기(56 · r16) */}
      {showCheckout && (
        <div className={pocketStyles.checkoutBar}>
          <div className={pocketStyles.checkoutInner}>
            <div className="flex items-baseline justify-between px-1">
              <span className="text-[14px] tracking-[-0.2px] text-[#6B7684]">
                선택 <span className="font-semibold tabular-nums text-[#191F28]">{selected.length}개</span>
                {saved > 0 && <span className="ml-1.5 text-[#F04452]">{won(saved)} 할인</span>}
              </span>
              <span className="text-[19px] font-bold tabular-nums tracking-[-0.4px] text-[#191F28]">{won(total)}</span>
            </div>
            <button
              type="button"
              onClick={startBooking}
              disabled={selected.length === 0}
              className="mt-2.5 flex h-14 w-full items-center justify-center rounded-[16px] bg-[#3180F7] text-[17px] font-bold tracking-[-0.2px] text-white transition active:scale-[0.98] active:bg-[#2272EB] disabled:bg-[#D1D6DB]"
            >
              {selected.length === 0 ? '상품을 골라 주세요' : bookLabel}
            </button>
          </div>
        </div>
      )}

      {/* 여러 개 골랐을 때 — 먼저 예약할 상품 고르기(프리티풀 .ft 시트 어법) */}
      {bookSheet && (
        <div className={pocketStyles.scrim} onClick={() => setBookSheet(false)}>
          <div className={pocketStyles.sheet} role="dialog" aria-modal="true" aria-labelledby="pocket-book-title" onClick={(e) => e.stopPropagation()}>
            <div className={pocketStyles.grab} aria-hidden="true" />
            <h2 id="pocket-book-title" className={pocketStyles.title}>어떤 상품부터 예약할까요?</h2>
            <p className={pocketStyles.desc}>예약은 상품 하나씩 진행돼요.{'\n'}하나를 마치면 포켓에서 다음 상품을 이어서 예약할 수 있어요.</p>
            <ul className="mt-5 space-y-2">
              {selected.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => goBooking(p.id)}
                    className="flex w-full items-center gap-3 rounded-[16px] bg-[#F9FAFB] p-3 text-left transition active:scale-[0.99] active:bg-[#F2F4F6]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveProductImageUrl(p.imageUrl, p.id)} alt="" className="h-12 w-12 shrink-0 rounded-[12px] bg-[#F2F4F6] object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-[#8B95A1]">{p.hospitalName}</span>
                      <span className="block truncate text-[15px] font-bold tracking-[-0.2px] text-[#191F28]">{p.title}</span>
                    </span>
                    <span className="shrink-0 text-[15px] font-bold tabular-nums text-[#3180F7]">{won(p.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className={pocketStyles.actions}>
              <button type="button" className={`${pocketStyles.btn} ${pocketStyles.secondary}`} onClick={() => setBookSheet(false)}>닫기</button>
              <button type="button" className={`${pocketStyles.btn} ${pocketStyles.primary}`} onClick={() => goBooking(selected[0].id)}>첫 상품 예약하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 맨 위로 — 포켓 고정 영역이 있으면 그 위로 */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="맨 위로"
          className={`fixed right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E8EB] bg-white shadow-lg transition-colors hover:bg-[#F9FAFB] pc:bottom-8 pc:right-8 ${showCheckout ? 'bottom-[200px]' : 'bottom-24'}`}
        >
          <ArrowUp size={18} className="text-[#6B7684]" />
        </button>
      )}

      <div className="pb-24 pc:pb-16" />
    </div>
  );
}

/* ============================== TopProductsCarousel ============================== */

// 실시간 TOP 인기 시술 — 카드는 모두 같은 크기(가까운 카드만 키우던 효과는 뺐다)
function TopProductsCarousel({ products }: { products: Product[] }) {
  return (
    <div className="hide-scrollbar flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto pb-6 pl-4 pr-12 pc:pl-0 pc:scroll-pl-0">
      {products.map((product, idx) => (
        <div key={product.id} className="w-[156px] flex-shrink-0 snap-start pc:w-[200px]">
          <ProductCard product={product} index={idx} />
        </div>
      ))}
    </div>
  );
}
