'use client';

import { useState, useMemo, Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, XCircle, ChevronLeft, ChevronDown, MapPin, Locate, Check, X, SlidersHorizontal, DollarSign, CalendarCheck, Star, Heart } from 'lucide-react';
import { useStore } from '@/store';
import { regions, dentalSubCategories } from '@/lib/mock-data';
import type { Product } from '@/types';
import EmptyState from '@/components/common/EmptyState';

const PROVINCES: Record<string, string[]> = {
  '서울': ['전체', '강남구', '서초구', '송파구', '강동구', '마포구', '용산구', '성동구', '광진구', '동대문구', '중랑구', '성북구', '강북구', '도봉구', '노원구', '은평구', '서대문구', '종로구', '중구', '동작구', '관악구', '금천구', '구로구', '영등포구', '양천구'],
  '경기': ['전체', '수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시', '남양주시', '화성시', '평택시', '의정부시', '시흥시', '파주시', '광명시', '김포시', '군포시', '광주시', '이천시', '양주시', '오산시', '구리시', '안성시', '포천시', '의왕시', '하남시', '여주시', '동두천시', '과천시'],
  '인천': ['전체', '중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '강화군', '옹진군'],
  '부산': ['전체', '중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구', '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군'],
  '대구': ['전체', '중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군'],
  '대전': ['전체', '동구', '중구', '서구', '유성구', '대덕구'],
  '광주': ['전체', '동구', '서구', '남구', '북구', '광산구'],
  '울산': ['전체', '중구', '남구', '동구', '북구', '울주군'],
  '세종': ['전체', '세종시'],
  '강원': ['전체', '춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시', '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '화천군', '양구군', '인제군', '고성군', '양양군'],
  '충북': ['전체', '청주시', '충주시', '제천시', '보은군', '옥천군', '영동군', '증평군', '진천군', '괴산군', '음성군', '단양군'],
  '충남': ['전체', '천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시', '당진시', '금산군', '부여군', '서천군', '청양군', '홍성군', '예산군', '태안군'],
  '전북': ['전체', '전주시', '군산시', '익산시', '정읍시', '남원시', '김제시', '완주군', '진안군', '무주군', '장수군', '임실군', '순창군', '고창군', '부안군'],
  '전남': ['전체', '목포시', '여수시', '순천시', '나주시', '광양시', '담양군', '곡성군', '구례군', '고흥군', '보성군', '화순군', '장흥군', '강진군', '해남군', '영암군', '무안군', '함평군', '영광군', '장성군', '완도군', '진도군', '신안군'],
  '경북': ['전체', '포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시', '상주시', '문경시', '경산시', '군위군', '의성군', '청송군', '영양군', '영덕군', '청도군', '고령군', '성주군', '칠곡군', '예천군', '봉화군', '울진군', '울릉군'],
  '경남': ['전체', '창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시', '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군', '산청군', '함양군', '거창군', '합천군'],
  '제주': ['전체', '제주시', '서귀포시'],
};

const provinceKeys = Object.keys(PROVINCES);

const relatedTags: Record<string, string[]> = {
  dental: ['임플란트', '치아교정', '라미네이트', '치아미백', '스케일링', '충치치료', '사랑니발치', '턱관절치료'],
  hair: ['탈모치료', '모발이식', 'PRP주사', '두피관리', '헤어라인교정'],
  eye: ['라식', '라섹', '스마일라식', '백내장수술', '눈밑지방재배치', '눈매교정', '쌍꺼풀수술'],
  ent: ['코골이수술', '비중격교정', '축농증수술', '편도수술', '보청기상담'],
  pediatric: ['소아검진', '예방접종', '성장클리닉', '아토피치료', '소아알레르기'],
  urology: ['산전검사', '임신초음파', '산후관리', '자궁근종', '방광염치료'],
  orthopedic: ['관절내시경', '척추치료', '어깨수술', '무릎연골', '도수치료', '체외충격파'],
  plastic: ['입꼬리보톡스', '입꼬리필러', '필러녹이기', '입술필러', '제거주사', '코필러', '턱보톡스', '이마필러'],
};

// Preset price ranges. Each preset translates to a [min, max] interval —
// max=null means "and up". When the user types into the inputs, the same
// {min, max} are written; clicking a preset fills the inputs.
const PRICE_PRESETS: { label: string; min: number | null; max: number | null }[] = [
  { label: '50,000원 이하', min: null, max: 50000 },
  { label: '50,000원 ~ 110,000원', min: 50000, max: 110000 },
  { label: '110,000원 ~ 200,000원', min: 110000, max: 200000 },
  { label: '200,000원 ~ 320,000원', min: 200000, max: 320000 },
  { label: '320,000원 이상', min: 320000, max: null },
];
const bookingMethods = ['전체', '앱결제', '현장결제', '상담 후 결제'];
const sortOptions = ['추천순', '가격 낮은순', '가격 높은순', '평점순', '리뷰 많은순'];

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩중...</div>}>
      <SearchPage />
    </Suspense>
  );
}

function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get('category');

  const { products, recentSearches, addRecentSearch, removeRecentSearch, showToast, categories, reviews } = useStore();

  // 인기검색어: 상품 태그 빈도순 + 리뷰 시술명 빈도순 합산 (실데이터 기반)
  const popularSearches = useMemo(() => {
    const freq: Record<string, number> = {};
    for (const p of products) {
      for (const tag of p.tags) {
        const clean = tag.replace(/^#/, '');
        freq[clean] = (freq[clean] ?? 0) + 2; // 태그는 가중치 2
      }
      if (p.subCategory) freq[p.subCategory] = (freq[p.subCategory] ?? 0) + 1;
    }
    for (const r of reviews) {
      if (r.treatmentName) freq[r.treatmentName] = (freq[r.treatmentName] ?? 0) + 1;
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k]) => k);
  }, [products, reviews]);
  const [query, setQuery] = useState('');
  // Multi-select regions. Each entry is "경기 수원시", "서울 강남구", or
  // "경기" (province-only = "전체"). Empty array = no region filter.
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  // Single state drives the unified filters bottom sheet — null = closed.
  // The internal tabs switch by mutating this value, no remount.
  const [filterModalTab, setFilterModalTab] = useState<'region' | 'price' | 'booking' | null>(null);
  const [showSortModal, setShowSortModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState(categoryParam ?? '');
  // Price filter as a numeric range so the modal can mix free-input + presets.
  // `null` on either side = open-ended (no lower bound / no upper bound).
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [selectedBooking, setSelectedBooking] = useState('전체');
  const [selectedSort, setSelectedSort] = useState('추천순');
  const [hasSearched, setHasSearched] = useState(false);
  const [locating, setLocating] = useState(false);

  const isCategoryMode = categoryParam !== null;
  const currentCat = categories.find(c => c.id === activeCategory);

  // Tab-switch animation: track which direction the next category sits
  // (right vs left of the previous one) so we can play the matching
  // slide on the results list.
  const [tabDirection, setTabDirection] = useState<'left' | 'right'>('right');
  const prevTabIdxRef = useRef(0);
  const categoryTabIds = ['', ...categories.map((c) => c.id)];

  const changeCategory = (id: string) => {
    const nextIdx = categoryTabIds.indexOf(id);
    setTabDirection(nextIdx >= prevTabIdxRef.current ? 'right' : 'left');
    prevTabIdxRef.current = nextIdx;
    setActiveCategory(id);
  };

  // Province-only entry (no space) means that province's "전체" was checked.
  // Surface that explicitly so users see "{province} 전체" instead of bare
  // "{province}".
  const formatRegion = (r: string) => (r.includes(' ') ? r : `${r} 전체`);
  const regionLabel =
    selectedRegions.length === 0
      ? ''
      : selectedRegions.length === 1
      ? formatRegion(selectedRegions[0])
      : `지역 ${selectedRegions.length}개`;

  // --- Location filter helper ---
  const matchesRegion = (p: typeof products[0]) => {
    if (selectedRegions.length === 0) return true;
    const loc = (p.location ?? '') + (p.hospitalName ?? '');
    return selectedRegions.some((entry) => {
      const [province, district] = entry.split(' ');
      if (district) {
        const districtKey = district.replace(/시$/, '').replace(/구$/, '');
        return loc.includes(district) || loc.includes(districtKey);
      }
      // Province-only entry = "전체" of that province → match any item
      // containing the province name in its location/hospital field.
      return loc.includes(province);
    });
  };

  // --- Price filter helper ---
  const matchesPrice = (p: typeof products[0]) => {
    if (priceMin == null && priceMax == null) return true;
    if (priceMin != null && p.price < priceMin) return false;
    if (priceMax != null && p.price > priceMax) return false;
    return true;
  };

  const priceLabel =
    priceMin == null && priceMax == null
      ? '가격'
      : priceMin == null
      ? `${(priceMax ?? 0).toLocaleString()}원 이하`
      : priceMax == null
      ? `${priceMin.toLocaleString()}원 이상`
      : `${priceMin.toLocaleString()}~${priceMax.toLocaleString()}원`;
  const priceActive = priceMin != null || priceMax != null;

  // --- Sort helper ---
  const sortResults = (arr: typeof products) => {
    const sorted = [...arr];
    if (selectedSort === '가격 낮은순') sorted.sort((a, b) => a.price - b.price);
    else if (selectedSort === '가격 높은순') sorted.sort((a, b) => b.price - a.price);
    else if (selectedSort === '리뷰 많은순') sorted.sort((a, b) => b.reviewCount - a.reviewCount);
    else if (selectedSort === '평점 높은순') sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  };

  const categoryResults = isCategoryMode
    ? sortResults(
        (activeCategory ? products.filter(p => p.category === activeCategory) : products)
          .filter(matchesRegion)
          .filter(matchesPrice)
      )
    : [];

  const searchResults = hasSearched
    ? sortResults(
        products
          .filter(
            (p) =>
              p.title.includes(query) ||
              p.tags.some((t) => t.includes(query)) ||
              p.hospitalName.includes(query) ||
              p.subCategory.includes(query)
          )
          // Category tab in search mode narrows the result set too
          .filter((p) => !activeCategory || p.category === activeCategory)
          .filter(matchesRegion)
          .filter(matchesPrice)
      )
    : [];

  const handleSearch = (keyword?: string) => {
    const k = keyword || query;
    if (!k.trim()) return;
    setQuery(k);
    addRecentSearch(k);
    setHasSearched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) { showToast('위치 서비스를 지원하지 않는 브라우저입니다.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const detected = detectSeoulDistrict(latitude, longitude);
        // detected.region is "서울시 ..."; normalize to "서울 ..." to match the
        // PROVINCES keys used by the modal.
        const province = detected.region.replace(/시\s+/, ' ').split(' ')[0].replace(/시$/, '');
        const district = detected.region.split(' ').slice(1).join(' ') || detected.sub;
        const entry = district ? `${province} ${district}` : province;
        // Single-replace (drops any prior selection so the user clearly
        // sees the detected region kick in).
        setSelectedRegions([entry]);
        // Jump the sidebar to the matching province so the new checkbox is
        // visible without the user having to scroll.
        setActiveProvince(province);
        setLocating(false);
        showToast(`현재 위치: ${entry}`);
      },
      () => {
        // Permission denied / timeout → graceful fallback to 강남구.
        setSelectedRegions(['서울 강남구']);
        setActiveProvince('서울');
        setLocating(false);
        showToast('현재 위치 대신 강남구로 설정했어요.');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  // Simple lat/lng → Seoul district mapping (center coordinates of major districts)
  function detectSeoulDistrict(lat: number, lng: number): { region: string; sub: string } {
    const districts: { region: string; sub: string; lat: number; lng: number }[] = [
      { region: '서울시 강남구', sub: '역삼동', lat: 37.4979, lng: 127.0276 },
      { region: '서울시 서초구', sub: '서초동', lat: 37.4837, lng: 127.0324 },
      { region: '서울시 송파구', sub: '잠실동', lat: 37.5145, lng: 127.1050 },
      { region: '서울시 강동구', sub: '천호동', lat: 37.5301, lng: 127.1237 },
      { region: '서울시 마포구', sub: '서교동', lat: 37.5564, lng: 126.9236 },
      { region: '서울시 종로구', sub: '종로동', lat: 37.5735, lng: 126.9790 },
      { region: '서울시 중구', sub: '명동', lat: 37.5636, lng: 126.9976 },
      { region: '서울시 영등포구', sub: '여의도동', lat: 37.5247, lng: 126.8965 },
      { region: '서울시 동작구', sub: '사당동', lat: 37.5124, lng: 126.9396 },
      { region: '서울시 금천구', sub: '가산동', lat: 37.4568, lng: 126.8956 },
      { region: '서울시 양천구', sub: '목동', lat: 37.5170, lng: 126.8664 },
      { region: '서울시 관악구', sub: '봉천동', lat: 37.4784, lng: 126.9516 },
    ];
    let closest = districts[0];
    let minDist = Infinity;
    for (const d of districts) {
      const dist = Math.hypot(lat - d.lat, lng - d.lng);
      if (dist < minDist) {
        minDist = dist;
        closest = d;
      }
    }
    return { region: closest.region, sub: closest.sub };
  }

  const [activeProvince, setActiveProvince] = useState('서울');

  const toggleRegion = (entry: string) => {
    setSelectedRegions((prev) =>
      prev.includes(entry) ? prev.filter((r) => r !== entry) : [...prev, entry]
    );
  };

  // ========== CATEGORY MODE ==========
  if (isCategoryMode) {
    return (
      <div className="min-h-screen bg-white page-enter">
        {/* Header: 뒤로가기 + 검색창 */}
        <div style={{ position: 'sticky', top: 0, zIndex: 40 }} className="bg-white px-3 py-2 flex items-center gap-2">
          <button onClick={() => router.back()} className="p-1 flex-shrink-0">
            <ChevronLeft size={24} className="text-gray-800" />
          </button>
          <div
            style={{ height: 46 }}
            className="flex-1 flex items-center bg-gray-100 rounded-xl px-2.5 gap-2"
          >
            <Search size={18} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={query || currentCat?.name || ''}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && query) handleSearch(); }}
              placeholder="원하는 시술이 있으신가요?"
              style={{ fontSize: 16 }}
              className="flex-1 bg-transparent outline-none placeholder-gray-400 text-gray-900"
            />
            {(query || currentCat) && (
              <button onClick={() => { setQuery(''); setHasSearched(false); }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="rgba(43,49,61,0.6)" />
                  <path d="m15 9-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  <path d="m9 9 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <ListPageFilters
          categories={categories}
          activeCategory={activeCategory}
          onChangeCategory={changeCategory}
          selectedRegions={selectedRegions}
          regionLabel={regionLabel}
          priceLabel={priceLabel}
          priceActive={priceActive}
          selectedBooking={selectedBooking}
          selectedSort={selectedSort}
          setSelectedBooking={setSelectedBooking}
          onOpenRegion={() => setFilterModalTab('region')}
          onOpenPrice={() => setFilterModalTab('price')}
          onOpenBooking={() => setFilterModalTab('booking')}
          onOpenSort={() => setShowSortModal(true)}
        />

        {/* 결과 — animated slide on tab switch */}
        <div
          key={activeCategory || 'all'}
          className={`px-2.5 pb-4 lg:max-w-7xl lg:mx-auto ${tabDirection === 'right' ? 'tab-slide-right' : 'tab-slide-left'}`}
        >
          <p className="text-sm text-gray-500 mb-3">
            <span className="font-bold text-black">{currentCat?.name || '전체'}</span> · {categoryResults.length}건
          </p>
          {categoryResults.length > 0 ? (
            <div className="flex flex-col divide-y divide-gray-100 stagger-children">
              {categoryResults.map((product) => (
                <SearchProductListItem key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="category"
              message="해당 카테고리에 상품이 없네요!"
              subtitle="다른 카테고리도 둘러보세요"
            />
          )}
        </div>

        {/* ===== MODALS ===== */}
        {/* Unified filter sheet — switches between 지역 / 가격 / 예약방법 internally */}
        {filterModalTab && (
          <FiltersBottomSheet
            initialTab={filterModalTab}
            selectedRegions={selectedRegions}
            toggleRegion={toggleRegion}
            setSelectedRegions={setSelectedRegions}
            activeProvince={activeProvince}
            setActiveProvince={setActiveProvince}
            priceMin={priceMin}
            setPriceMin={setPriceMin}
            priceMax={priceMax}
            setPriceMax={setPriceMax}
            selectedBooking={selectedBooking}
            setSelectedBooking={setSelectedBooking}
            onClose={() => setFilterModalTab(null)}
            onLocate={handleCurrentLocation}
            locating={locating}
          />
        )}

        {/* Sort Modal */}
        {showSortModal && (
          <FilterModal title="정렬" onClose={() => setShowSortModal(false)}>
            <div className="flex-1 overflow-y-auto">
              {sortOptions.map((opt) => (
                <button key={opt} onClick={() => { setSelectedSort(opt); setShowSortModal(false); }}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50 transition-colors ${selectedSort === opt ? 'text-[#8037FF] font-medium bg-purple-50' : 'text-gray-700'}`}>
                  <span>{opt}</span>
                  {selectedSort === opt && <Check size={16} className="text-[#8037FF]" />}
                </button>
              ))}
            </div>
          </FilterModal>
        )}
      </div>
    );
  }

  // ========== NORMAL SEARCH MODE ==========
  return (
    <div className="pb-[86px] lg:pb-0 bg-white min-h-screen page-enter">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40 }} className="bg-white px-3 py-2 flex items-center gap-2 lg:hidden">
        <button onClick={() => router.back()} className="p-1 flex-shrink-0">
          <ChevronLeft size={24} className="text-gray-800" />
        </button>
        <div style={{ height: 46 }} className="flex-1 flex items-center bg-gray-100 rounded-xl px-2.5 gap-2">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (!e.target.value) setHasSearched(false); }}
            onKeyDown={handleKeyDown}
            placeholder="원하는 시술이 있으신가요?"
            style={{ fontSize: 16 }}
            className="flex-1 bg-transparent outline-none placeholder-gray-400 text-gray-900"
          />
          {query && (
            <button onClick={() => { setQuery(''); setHasSearched(false); }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="rgba(43,49,61,0.6)" />
                <path d="m15 9-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <path d="m9 9 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filter section for normal search mode — same layout as category mode */}
      <ListPageFilters
        categories={categories}
        activeCategory={activeCategory}
        onChangeCategory={changeCategory}
        selectedRegions={selectedRegions}
        regionLabel={regionLabel}
        priceLabel={priceLabel}
        priceActive={priceActive}
        selectedBooking={selectedBooking}
        selectedSort={selectedSort}
        setSelectedBooking={setSelectedBooking}
        onOpenRegion={() => setFilterModalTab('region')}
        onOpenPrice={() => setFilterModalTab('price')}
        onOpenBooking={() => setFilterModalTab('booking')}
        onOpenSort={() => setShowSortModal(true)}
      />

      <div className="lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-6">
        <div className="lg:bg-white lg:rounded-2xl lg:shadow-sm lg:p-6">
          {hasSearched ? (
            <div
              key={activeCategory || 'all'}
              className={`px-2.5 stagger-children ${tabDirection === 'right' ? 'tab-slide-right' : 'tab-slide-left'}`}
            >
              {searchResults.length > 0 ? (
                <>
                  <p className="text-sm text-gray-500 mb-3">
                    검색결과 <span className="font-bold text-black">{searchResults.length}</span>건
                  </p>
                  <div className="flex flex-col divide-y divide-gray-100">
                    {searchResults.map((product) => (
                      <SearchProductListItem key={product.id} product={product} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 bounce-in">
                    <Search size={28} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-bold text-lg mb-1">검색내용이 없습니다.</p>
                  <p className="text-gray-400 text-sm">검색어 &quot;{query}&quot;</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {recentSearches.length > 0 && (
                <div className="px-2.5 mb-6 fade-in-up">
                  <h2 className="text-sm font-bold mb-3">최근검색어</h2>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((keyword) => (
                      <div key={keyword} className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 hover:bg-gray-200 transition-colors">
                        <button onClick={() => handleSearch(keyword)} className="text-sm text-gray-700">{keyword}</button>
                        <button onClick={() => removeRecentSearch(keyword)} className="text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="px-2.5 fade-in-up fade-in-up-delay-1">
                <h2 className="text-sm font-bold mb-3">인기검색어</h2>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-x-4 stagger-children">
                  {popularSearches.map((keyword, index) => (
                    <button key={keyword} onClick={() => handleSearch(keyword)}
                      className="flex items-center gap-3 py-2.5 text-left hover:bg-gray-50 rounded-lg px-2 transition-colors">
                      <span className={`text-sm font-bold w-5 text-center ${index < 3 ? 'text-[#8037FF]' : 'text-gray-400'}`}>{index + 1}</span>
                      <span className="text-sm text-gray-800">{keyword}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Unified filter sheet for search mode */}
      {filterModalTab && (
        <FiltersBottomSheet
          initialTab={filterModalTab}
          selectedRegions={selectedRegions}
          toggleRegion={toggleRegion}
          setSelectedRegions={setSelectedRegions}
          activeProvince={activeProvince}
          setActiveProvince={setActiveProvince}
          priceMin={priceMin}
          setPriceMin={setPriceMin}
          priceMax={priceMax}
          setPriceMax={setPriceMax}
          selectedBooking={selectedBooking}
          setSelectedBooking={setSelectedBooking}
          onClose={() => setFilterModalTab(null)}
          onLocate={handleCurrentLocation}
          locating={locating}
        />
      )}
      {showSortModal && (
        <FilterModal title="정렬" onClose={() => setShowSortModal(false)}>
          <div className="flex-1 overflow-y-auto">
            {sortOptions.map((o) => (
              <button key={o} onClick={() => { setSelectedSort(o); setShowSortModal(false); }}
                className={`w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50 ${selectedSort === o ? 'text-[#8037FF] font-medium bg-purple-50' : 'text-gray-700'}`}>
                <span>{o}</span>{selectedSort === o && <Check size={16} className="text-[#8037FF]" />}
              </button>
            ))}
          </div>
        </FilterModal>
      )}
    </div>
  );
}

function SearchProductListItem({ product }: { product: Product }) {
  const { wishlist, toggleWishlist } = useStore();
  const isWished = wishlist.includes(product.id);

  return (
    <Link
      href={`/product/${product.id}`}
      className="block py-4 card-press"
    >
      {/* Top: thumbnail + info + heart */}
      <div className="flex gap-3">
        <div className="relative w-[120px] h-[120px] flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="flex-1 text-[18px] leading-[24px] font-bold text-[#2B313D] line-clamp-2">
              {product.title}
            </h3>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(product.id);
              }}
              className="flex-shrink-0 -mt-0.5 -mr-0.5 p-1"
              aria-label={isWished ? '찜 해제' : '찜하기'}
            >
              <Heart
                size={22}
                fill={isWished ? '#EF4444' : 'none'}
                stroke={isWished ? '#EF4444' : '#C5CAD4'}
                strokeWidth={1.8}
              />
            </button>
          </div>

          <p className="mt-0.5 text-[13px] text-gray-500 line-clamp-1">
            {product.location ? `${product.hospitalName} · ${product.location}` : product.hospitalName}
          </p>

          <div className="mt-1 flex items-center gap-1">
            <Star size={14} fill="#FBBF24" stroke="#FBBF24" />
            <span className="text-[14px] font-bold text-[#2B313D]">{product.rating.toFixed(1)}</span>
            <span className="text-[13px] text-gray-400">({product.reviewCount.toLocaleString()})</span>
          </div>
        </div>
      </div>

      {/* Bottom: VAT 포함 + (discount) price + tags — right aligned */}
      <div className="mt-3 flex flex-col items-end">
        <p className="text-[12px] text-gray-400">
          VAT 포함
          {product.originalPrice && (
            <>
              {' '}·{' '}
              <span className="line-through">{product.originalPrice.toLocaleString()}원</span>
            </>
          )}
        </p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          {product.discount && (
            <span className="text-[18px] font-bold" style={{ color: '#EF4444' }}>
              {product.discount}%
            </span>
          )}
          <span className="text-[18px] font-bold text-[#2B313D]">
            {product.price.toLocaleString()}원
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2 justify-end">
          {/* 앱결제 — gray, text-only (matches ProductCard) */}
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 4,
              color: '#51535C',
              backgroundColor: '#F2F3F5',
            }}
          >
            앱결제
          </span>
          {/* 인증병원 — brand logo + purple text, no background chip */}
          {product.rating >= 4.8 && (
            <span
              className="flex items-center gap-1"
              style={{ fontSize: 11, fontWeight: 600, color: '#7A71FF' }}
            >
              <img src="/icons/brand-logo.svg" alt="" width={16} height={16} className="flex-shrink-0" />
              인증병원
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Reusable filter bottom sheet modal
function FilterModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 modal-overlay-enter" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:max-w-md lg:rounded-2xl bg-white rounded-t-2xl max-h-[70vh] flex flex-col modal-content-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ====================== Region multi-select modal ======================
   Bottom sheet with a drag handle, filter-type tabs at the top, a province
   sidebar on the left, and grouped multi-select checkboxes on the right.
   Closes via "필터 선택 완료" or backdrop tap. Selections persist across
   open/close. */
type FilterTab = 'region' | 'price' | 'booking';

function FiltersBottomSheet({
  initialTab,
  selectedRegions,
  toggleRegion,
  setSelectedRegions,
  activeProvince,
  setActiveProvince,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  selectedBooking,
  setSelectedBooking,
  onClose,
  onLocate,
  locating,
}: {
  initialTab: FilterTab;
  selectedRegions: string[];
  toggleRegion: (entry: string) => void;
  setSelectedRegions: React.Dispatch<React.SetStateAction<string[]>>;
  activeProvince: string;
  setActiveProvince: (p: string) => void;
  priceMin: number | null;
  setPriceMin: (n: number | null) => void;
  priceMax: number | null;
  setPriceMax: (n: number | null) => void;
  selectedBooking: string;
  setSelectedBooking: (b: string) => void;
  onClose: () => void;
  onLocate: () => void;
  locating: boolean;
}) {
  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab);
  // open: false starts the sheet off-screen for a slide-up entrance; an
  // immediate rAF flips it to true so the transform transitions cleanly.
  const [open, setOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => setOpen(true));
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Wrap close in a small animated exit — translate down then unmount.
  const requestClose = () => {
    setOpen(false);
    setTimeout(onClose, 240);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) setDragOffset(dy);
  };
  const onTouchEnd = () => {
    if (dragOffset > 110) {
      requestClose();
    } else {
      setDragOffset(0);
    }
    touchStartY.current = null;
  };

  const SELECT = '#2B313D';
  const SELECT_BG = '#F4F5F7';
  const RED_DOT = '#FF4757';

  const tabs: { key: FilterTab; label: string; hasValue: boolean }[] = [
    { key: 'region', label: '지역', hasValue: selectedRegions.length > 0 },
    { key: 'price', label: '가격', hasValue: priceMin != null || priceMax != null },
    { key: 'booking', label: '예약방법', hasValue: selectedBooking !== '전체' },
  ];

  const transform = `translateY(${open ? dragOffset : 800}px)`;

  // Portal to document.body so the modal isn't trapped by any transformed
  // ancestor (e.g. .page-enter applies translateY which would re-anchor
  // position:fixed to itself). createPortal is safe here because the modal
  // only mounts after a user click, well past hydration.
  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      style={{
        backgroundColor: open ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
        transition: 'background-color 240ms ease-out',
      }}
      onClick={requestClose}
    >
      <div
        className="absolute bottom-0 left-0 right-0 lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:max-w-md lg:rounded-2xl bg-white rounded-t-2xl flex flex-col"
        style={{
          height: '82vh',
          maxHeight: 740,
          transform,
          transition: touchStartY.current == null
            ? 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)'
            : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — drag down past 110px to dismiss */}
        <div
          className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Filter-type tabs */}
        <div className="flex items-center gap-5 px-5 pb-3 flex-shrink-0">
          {tabs.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="relative"
              >
                <span
                  className="text-[20px] font-extrabold whitespace-nowrap"
                  style={{
                    color: isActive ? '#2B313D' : '#C5CAD4',
                    transition: 'color 240ms ease',
                  }}
                >
                  {t.label}
                </span>
                {t.hasValue && (
                  <span
                    className="absolute rounded-full"
                    style={{
                      top: 0,
                      right: -8,
                      width: 5,
                      height: 5,
                      backgroundColor: RED_DOT,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Body — switches based on activeTab */}
        <div className="flex-1 overflow-hidden border-t border-gray-100">
          {/* ----- REGION ----- */}
          {activeTab === 'region' && (
            <div className="flex h-full overflow-hidden">
              <div
                className="w-[108px] flex-shrink-0 overflow-y-auto"
                style={{ backgroundColor: '#FAFAFB' }}
              >
                {provinceKeys.map((prov) => {
                  const isActive = activeProvince === prov;
                  const hasSelection = selectedRegions.some((r) => r.split(' ')[0] === prov);
                  return (
                    <button
                      key={prov}
                      onClick={() => setActiveProvince(prov)}
                      className="w-full text-left py-4 px-4 relative"
                      style={{
                        backgroundColor: isActive ? SELECT_BG : 'transparent',
                        color: isActive ? SELECT : '#A4ABBA',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: 17,
                      }}
                    >
                      {prov}
                      {hasSelection && (
                        <span
                          className="absolute rounded-full"
                          style={{
                            top: 16,
                            right: 14,
                            width: 6,
                            height: 6,
                            backgroundColor: RED_DOT,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex-1 overflow-y-auto bg-white px-4">
                <button
                  onClick={onLocate}
                  className="w-full flex items-center gap-3 py-3.5"
                  style={{ color: SELECT }}
                >
                  <Locate size={18} />
                  <span className="text-[16px] font-semibold">
                    {locating ? '위치 찾는 중...' : '현재 위치로 설정'}
                  </span>
                </button>
                {(PROVINCES[activeProvince] ?? []).map((district) => {
                  const fullKey = district === '전체' ? activeProvince : `${activeProvince} ${district}`;
                  const isChecked = selectedRegions.includes(fullKey);
                  const label = district === '전체' ? `${activeProvince} 전체` : district;
                  return (
                    <button
                      key={district}
                      onClick={() => toggleRegion(fullKey)}
                      className="w-full flex items-center gap-3 py-4"
                    >
                      <span
                        className="flex items-center justify-center flex-shrink-0"
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 5,
                          backgroundColor: isChecked ? SELECT : 'transparent',
                          border: isChecked ? 'none' : '1.5px solid #D1D5DB',
                        }}
                      >
                        {isChecked && (
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="text-[17px]" style={{ color: '#2B313D' }}>
                        {label}
                      </span>
                    </button>
                  );
                })}
                <div className="h-4" />
              </div>
            </div>
          )}

          {/* ----- PRICE ----- (min/max stacked inputs + toggleable preset pills) */}
          {activeTab === 'price' && (
            <div className="h-full overflow-y-auto px-5 pt-5">
              {/* Min input — top */}
              <div className="flex flex-col gap-2.5">
                <div
                  className="flex items-center px-4"
                  style={{
                    height: 52,
                    borderRadius: 12,
                    backgroundColor: '#F9F9F9',
                  }}
                >
                  <span className="text-[14px] flex-shrink-0 mr-3" style={{ color: '#A4ABBA' }}>
                    최소
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={priceMin == null ? '' : priceMin.toLocaleString()}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^\d]/g, '');
                      setPriceMin(digits ? Number(digits) : null);
                    }}
                    placeholder="0"
                    className="flex-1 outline-none text-[16px] bg-transparent text-right"
                    style={{ color: '#2B313D' }}
                  />
                  <span className="text-[15px] ml-2" style={{ color: '#2B313D' }}>원</span>
                </div>

                {/* Max input — bottom */}
                <div
                  className="flex items-center px-4"
                  style={{
                    height: 52,
                    borderRadius: 12,
                    backgroundColor: '#F9F9F9',
                  }}
                >
                  <span className="text-[14px] flex-shrink-0 mr-3" style={{ color: '#A4ABBA' }}>
                    최대
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={priceMax == null ? '' : priceMax.toLocaleString()}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^\d]/g, '');
                      setPriceMax(digits ? Number(digits) : null);
                    }}
                    placeholder="제한 없음"
                    className="flex-1 outline-none text-[16px] bg-transparent text-right"
                    style={{ color: '#2B313D' }}
                  />
                  <span className="text-[15px] ml-2" style={{ color: '#2B313D' }}>원</span>
                </div>
              </div>

              {/* Preset pills — clicking the active one again clears the filter */}
              <div className="flex flex-wrap gap-2 mt-5">
                {PRICE_PRESETS.map((preset) => {
                  const isActive = preset.min === priceMin && preset.max === priceMax;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => {
                        if (isActive) {
                          // Toggle off — clear the filter
                          setPriceMin(null);
                          setPriceMax(null);
                        } else {
                          setPriceMin(preset.min);
                          setPriceMax(preset.max);
                        }
                      }}
                      className="rounded-full"
                      style={{
                        height: 40,
                        paddingLeft: 16,
                        paddingRight: 16,
                        fontSize: 14,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        backgroundColor: isActive ? SELECT : '#fff',
                        color: isActive ? '#fff' : '#51535C',
                        border: isActive ? '1px solid ' + SELECT : '1px solid #E5E7EB',
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ----- BOOKING ----- (single-select) */}
          {activeTab === 'booking' && (
            <div className="h-full overflow-y-auto px-5">
              {bookingMethods.map((m) => {
                const isChecked = selectedBooking === m;
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedBooking(m)}
                    className="w-full flex items-center gap-3 py-4"
                  >
                    <span
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: isChecked ? SELECT : 'transparent',
                        border: isChecked ? 'none' : '1.5px solid #D1D5DB',
                      }}
                    >
                      {isChecked && (
                        <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
                      )}
                    </span>
                    <span className="text-[17px]" style={{ color: '#2B313D' }}>
                      {m}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sheet closes via backdrop tap / drag-down / pulling 필터 선택 완료
            isn't needed since every checkbox toggle commits immediately. */}
      </div>
    </div>,
    document.body,
  );
}

/* ===================== List page filter section =====================
   Specialty category tabs (전체 + 치과/소아과/...) with sliding underline +
   slide-on-switch animation. Below: filter chips row (지역/시술/가격/예약방법/
   병원정보) + sub-row for the 앱결제 quick toggle and 추천순 sort. */
function ListPageFilters({
  categories,
  activeCategory,
  onChangeCategory,
  selectedRegions,
  regionLabel,
  priceLabel,
  priceActive,
  selectedBooking,
  selectedSort,
  setSelectedBooking,
  onOpenRegion,
  onOpenPrice,
  onOpenBooking,
  onOpenSort,
}: {
  categories: { id: string; name: string }[];
  activeCategory: string;
  onChangeCategory: (id: string) => void;
  selectedRegions: string[];
  regionLabel: string;
  priceLabel: string;
  priceActive: boolean;
  selectedBooking: string;
  selectedSort: string;
  setSelectedBooking: (b: string) => void;
  onOpenRegion: () => void;
  onOpenPrice: () => void;
  onOpenBooking: () => void;
  onOpenSort: () => void;
}) {
  const isAppPay = selectedBooking === '앱결제';

  // Sliding underline indicator
  const tabsList: { id: string; name: string }[] = [
    { id: '', name: '전체' },
    ...categories,
  ];
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const activeIdx = tabsList.findIndex((t) => t.id === activeCategory);

  useLayoutEffect(() => {
    const btn = tabBtnRefs.current[activeIdx >= 0 ? activeIdx : 0];
    if (!btn) return;
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeIdx, tabsList.length]);

  useEffect(() => {
    const onResize = () => {
      const btn = tabBtnRefs.current[activeIdx >= 0 ? activeIdx : 0];
      if (!btn) return;
      setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeIdx]);

  const chipStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 14,
    fontWeight: 600,
    height: 36,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: 999,
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    ...(active
      ? { backgroundColor: '#2B313D', color: '#fff', border: '1px solid #2B313D' }
      : { backgroundColor: '#fff', color: '#51535C', border: '1px solid #E5E7EB' }),
  });

  return (
    <div className="bg-white">
      {/* Specialty category tabs — underline lives INSIDE the scroller so
          offsetLeft (relative to the scrollable content) keeps it locked to
          the active tab as the user scrolls horizontally. */}
      <div className="border-b border-gray-100">
        <div className="relative flex gap-5 overflow-x-auto hide-scrollbar px-4 pt-3">
          {tabsList.map((tab, i) => {
            const isActive = tab.id === activeCategory;
            return (
              <button
                key={tab.id || 'all'}
                ref={(el) => {
                  tabBtnRefs.current[i] = el;
                }}
                onClick={() => onChangeCategory(tab.id)}
                className="relative pb-3 flex-shrink-0"
              >
                <span
                  className="text-[16px] font-bold whitespace-nowrap"
                  style={{
                    color: isActive ? '#2B313D' : '#A4ABBA',
                    transition: 'color 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  {tab.name}
                </span>
              </button>
            );
          })}
          {/* Sliding underline (in-flow w.r.t. scroll, so it sticks to the active tab) */}
          <span
            aria-hidden
            className="absolute bottom-0 h-[3px] rounded-full pointer-events-none"
            style={{
              left: indicator.left,
              width: indicator.width,
              backgroundColor: '#2B313D',
              transition:
                'left 380ms cubic-bezier(0.22, 1, 0.36, 1), width 380ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </div>
      </div>

      {/* Filter chips row — 지역 / 가격 / 예약방법 only */}
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar px-4 pt-3 pb-2">
        <button onClick={onOpenRegion} style={chipStyle(selectedRegions.length > 0)}>
          {selectedRegions.length > 0 ? regionLabel : '지역'}
          <ChevronDown size={14} />
        </button>
        <button onClick={onOpenPrice} style={chipStyle(priceActive)}>
          {priceLabel}
          <ChevronDown size={14} />
        </button>
        <button onClick={onOpenBooking} style={chipStyle(selectedBooking !== '전체')}>
          {selectedBooking !== '전체' ? selectedBooking : '예약방법'}
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Sub-row: 앱결제 checkbox + 추천순 sort */}
      <div className="flex items-center justify-between px-4 pt-2 pb-3">
        <button
          onClick={() => setSelectedBooking(isAppPay ? '전체' : '앱결제')}
          className="flex items-center gap-2"
        >
          <span
            className="flex items-center justify-center"
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              backgroundColor: isAppPay ? '#2B313D' : '#fff',
              border: isAppPay ? 'none' : '1.5px solid #D1D5DB',
            }}
          >
            {isAppPay && (
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span className="text-[14px] font-medium" style={{ color: isAppPay ? '#2B313D' : '#51535C' }}>
            앱결제
          </span>
        </button>
        <button
          onClick={onOpenSort}
          className="flex items-center gap-1 text-[14px] font-medium"
          style={{ color: '#51535C' }}
        >
          {selectedSort}
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 6h18M6 12h12M10 18h4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
