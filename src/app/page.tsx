'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Send, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/common/ProductCard';
import { useStore } from '@/store';
import { categories } from '@/lib/mock-data';

const searchPlaceholders = [
  '입술필러 검색해보세요',
  '임플란트 검색해보세요',
  '라미네이트 검색해보세요',
  '치아미백 검색해보세요',
  '보톡스 검색해보세요',
];

export default function HomePage() {
  const router = useRouter();
  const { products, isLoggedIn, login, recentlyViewed } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  const popularProducts = products.slice(0, 6);
  const recentProducts = recentlyViewed
    .map(id => products.find(p => p.id === id))
    .filter(Boolean) as typeof products;
  const dentalProducts = products.filter(p => p.category === 'dental').slice(0, 4);
  const plasticProducts = products.filter(p => p.category === 'plastic').slice(0, 4);

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Slot machine placeholder rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setPlaceholderIdx(prev => (prev + 1) % searchPlaceholders.length);
        setAnimating(false);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pb-[86px] lg:pb-0 page-enter">
      {/* Sticky Header */}
      <div
        ref={headerRef}
        style={{ position: 'sticky', top: 0, zIndex: 40 }}
        className="bg-white lg:hidden transition-all duration-300"
      >
        {/* Default Header (logo + icons) */}
        <div className={`flex items-center justify-between px-4 py-3 transition-all duration-300 ${scrolled ? 'h-0 overflow-hidden opacity-0 py-0' : 'opacity-100'}`}>
          <span className="text-lg font-bold text-[#7C3AED]">로고</span>
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <Link href="/search"><Search size={22} /></Link>
              <Link href="/notifications" className="relative">
                <Send size={22} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">23</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={() => login('kakao')} className="bg-[#7C3AED] text-white text-sm px-4 py-2 rounded-full font-medium">
                테스트 로그인
              </button>
              <Link href="/search"><Search size={22} /></Link>
            </div>
          )}
        </div>

        {/* Scrolled Header (search bar) */}
        <div className={`px-4 transition-all duration-300 ${scrolled ? 'py-2 opacity-100' : 'h-0 overflow-hidden opacity-0 py-0'}`}>
          <button
            onClick={() => router.push('/search')}
            style={{ height: 46, borderRadius: 10, borderWidth: 1.4, borderColor: '#C8CEDA', backgroundColor: '#F9F9F9' }}
            className="w-full flex items-center gap-3 px-4 text-left border-solid"
          >
            <Search size={18} className="text-gray-400 flex-shrink-0" />
            <div style={{ fontSize: 16, height: 22, overflow: 'hidden' }} className="flex-1 relative">
              <span
                className={`block text-gray-400 transition-all duration-300 ${
                  animating ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
                }`}
              >
                {searchPlaceholders[placeholderIdx]}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Desktop content wrapper */}
      <div className="lg:bg-white lg:rounded-2xl lg:shadow-sm lg:my-6">

        {/* Banner */}
        <div className="mx-4 lg:mx-auto lg:max-w-7xl lg:px-6 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] p-5 lg:p-8 mb-6 text-white relative overflow-hidden gradient-shift">
          <p className="text-sm opacity-90">첫방문 체험</p>
          <p className="text-xl font-bold mt-1">추가 15% 쿠폰 증정</p>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 w-20 h-20 bg-white/20 rounded-full flex items-center justify-center float">
            <div className="text-center">
              <div className="text-2xl font-bold">15%</div>
              <div className="text-[10px]">COUPON</div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-4 px-6 lg:max-w-7xl lg:mx-auto lg:px-6 mb-8 stagger-children">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/search?category=${cat.id}`}
              className="flex flex-col items-center gap-2 relative group"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-50 group-hover:bg-[#EDE9FE] group-hover:ring-2 group-hover:ring-[#7C3AED] transition-all duration-200 p-2.5">
                <img src={cat.icon} alt={cat.name} className="w-full h-full" />
              </div>
              <span className="text-xs text-gray-600 group-hover:text-[#7C3AED] group-hover:font-medium transition-colors">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>

        {/* 치과 섹션 */}
        {dentalProducts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between px-4 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
              <div className="flex items-center gap-2">
                <img src="/icons/dental.svg" alt="치과" className="w-6 h-6" />
                <h2 className="font-bold">치과</h2>
              </div>
              <Link href="/search?category=dental" className="flex items-center gap-0.5 text-sm text-[#7C3AED] hover:underline">
                더보기 <ChevronRight size={14} />
              </Link>
            </div>
            <div className="px-4 lg:max-w-7xl lg:mx-auto">
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-2 lg:grid lg:grid-cols-4 lg:gap-1.5 lg:overflow-visible">
                {dentalProducts.map((product) => (
                  <div key={product.id} className="w-[42vw] max-w-[180px] flex-shrink-0 lg:w-auto lg:max-w-none lg:flex-shrink">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 성형외과 섹션 */}
        {plasticProducts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between px-4 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
              <div className="flex items-center gap-2">
                <img src="/icons/plastic.svg" alt="성형외과" className="w-6 h-6" />
                <h2 className="font-bold">성형외과</h2>
              </div>
              <Link href="/search?category=plastic" className="flex items-center gap-0.5 text-sm text-[#7C3AED] hover:underline">
                더보기 <ChevronRight size={14} />
              </Link>
            </div>
            <div className="px-4 lg:max-w-7xl lg:mx-auto">
              <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-2 lg:grid lg:grid-cols-4 lg:gap-1.5 lg:overflow-visible">
                {plasticProducts.map((product) => (
                  <div key={product.id} className="w-[42vw] max-w-[180px] flex-shrink-0 lg:w-auto lg:max-w-none lg:flex-shrink">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 최근 본 상품 */}
        {recentProducts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between px-4 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🕐</span>
                <h2 className="font-bold">최근 본 상품</h2>
              </div>
            </div>
            <div className="px-4 lg:max-w-7xl lg:mx-auto">
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible">
                {recentProducts.slice(0, 10).map((product) => (
                  <div key={product.id} className="w-[42vw] max-w-[180px] flex-shrink-0 lg:w-auto lg:max-w-none lg:flex-shrink">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 인기 상품 */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-4 lg:px-6 lg:max-w-7xl lg:mx-auto mb-3">
            <h2 className="font-bold">인기 상품</h2>
            <Link href="/search" className="flex items-center gap-0.5 text-sm text-[#7C3AED] hover:underline">
              전체보기 <ChevronRight size={14} />
            </Link>
          </div>
          <div className="px-4 lg:max-w-7xl lg:mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 stagger-children">
              {popularProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>

      </div>{/* End desktop content wrapper */}

      {/* Footer */}
      <div className="mt-8 px-4 py-6 text-xs text-gray-400 border-t border-gray-100 lg:hidden">
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-4 text-gray-500">
          <Link href="/terms/privacy" className="hover:text-gray-700 underline">개인정보처리방침</Link>
          <Link href="/terms/service" className="hover:text-gray-700 underline">서비스이용약관</Link>
          <Link href="/terms/thirdparty" className="hover:text-gray-700 underline">제3자정보제공동의</Link>
          <Link href="/terms/refund" className="hover:text-gray-700 underline">환불약관</Link>
          <Link href="/terms/withdrawal" className="hover:text-gray-700 underline">회원탈퇴 문의</Link>
          <Link href="/terms/meta" className="hover:text-gray-700 underline">META서비스 이용방침</Link>
        </div>
        <p>(주)00000은 통신판매중개자로서 통신판매의 당사자가 아니며 개별 판매자가 제공하는 서비스에 대한 이행, 계약사항 등과 관련한 의무와 책임은 거래 당사자에게 있습니다.</p>
        <p className="mt-2">통신판매업신고번호 : 제 2025-서울송파-0000호</p>
        <p>(주)0000 | 우 00000</p>
        <p>주소 서울특별시 금천구 가산디지털1로 225, 11층 1123-에이-2호(가산동, 에이스 가산 포휴)</p>
        <p className="mt-1">T 070-000-0000 | E ceo@sample.com</p>
        <p className="mt-1">대표자 000 | 사업자 등록 번호 000-00-00000</p>
        <p>Copyright(c) 000. All right reserved.</p>
      </div>

    </div>
  );
}
