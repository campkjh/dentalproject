'use client';

import { useState, useMemo, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, XCircle, ChevronLeft, ChevronDown, MapPin, Locate, Check, X, SlidersHorizontal, DollarSign, CalendarCheck } from 'lucide-react';
import ProductCard from '@/components/common/ProductCard';
import { useStore } from '@/store';
import { regions, dentalSubCategories } from '@/lib/mock-data';

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

const priceRanges = ['전체', '10만원 이하', '10~30만원', '30~50만원', '50~100만원', '100만원 이상'];
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedSubRegion, setSelectedSubRegion] = useState('');
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [regionStep, setRegionStep] = useState<'region' | 'sub'>('region');
  const [tempRegion, setTempRegion] = useState('');
  const [activeCategory, setActiveCategory] = useState(categoryParam ?? '');
  const [selectedPrice, setSelectedPrice] = useState('전체');
  const [selectedBooking, setSelectedBooking] = useState('전체');
  const [selectedSort, setSelectedSort] = useState('추천순');
  const [hasSearched, setHasSearched] = useState(false);
  const [locating, setLocating] = useState(false);

  const isCategoryMode = categoryParam !== null;
  const currentCat = categories.find(c => c.id === activeCategory);
  const tags = relatedTags[activeCategory] ?? [];

  const regionLabel = selectedRegion
    ? selectedSubRegion && selectedSubRegion !== '전체'
      ? `${selectedRegion} ${selectedSubRegion}`
      : selectedRegion
    : '';

  // --- Location filter helper ---
  const matchesRegion = (p: typeof products[0]) => {
    if (!selectedRegion) return true;
    const loc = (p.location ?? '') + (p.hospitalName ?? '');
    // Extract district from selectedRegion like "서울시 강남구" → "강남"
    const regionKey = selectedRegion.replace(/시\s*/, '').replace(/구$/, '');
    if (selectedSubRegion && selectedSubRegion !== '전체') {
      return loc.includes(selectedSubRegion) || loc.includes(regionKey);
    }
    return loc.includes(regionKey) || loc.includes(selectedRegion);
  };

  // --- Price filter helper ---
  const matchesPrice = (p: typeof products[0]) => {
    if (selectedPrice === '전체') return true;
    if (selectedPrice === '10만원 이하') return p.price <= 100000;
    if (selectedPrice === '10~50만원') return p.price > 100000 && p.price <= 500000;
    if (selectedPrice === '50~100만원') return p.price > 500000 && p.price <= 1000000;
    if (selectedPrice === '100만원 이상') return p.price > 1000000;
    return true;
  };

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
        // Map lat/lng to nearest Seoul district
        const { latitude, longitude } = pos.coords;
        const detected = detectSeoulDistrict(latitude, longitude);
        setSelectedRegion(detected.region);
        setSelectedSubRegion(detected.sub);
        setLocating(false);
        setShowRegionModal(false);
        showToast(`현재 위치: ${detected.region} ${detected.sub}`);
      },
      () => {
        setLocating(false);
        // Fallback to default region instead of showing error
        setSelectedRegion('서울시 강남구');
        setSelectedSubRegion('전체');
        setShowRegionModal(false);
        showToast('현재 위치 대신 강남구로 설정했어요. 직접 선택도 가능합니다.');
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

  const handleSelectRegion = (region: string) => {
    setTempRegion(region);
    // Provinces always have sub-regions
    setActiveProvince(region);
    setRegionStep('sub');
  };

  const handleSelectSubRegion = (sub: string) => {
    // Build region string like "서울시 강남구" or "경기 수원시"
    const regionStr = sub === '전체'
      ? activeProvince
      : `${activeProvince} ${sub}`;
    setSelectedRegion(regionStr);
    setSelectedSubRegion(sub === '전체' ? '' : sub);
    setShowRegionModal(false);
    setRegionStep('region');
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

        {/* 연관 태그 */}
        {tags.length > 0 && (
          <div className="px-2.5 py-2">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTags(prev => isSelected ? prev.filter(t => t !== tag) : [...prev, tag]);
                    }}
                    style={{
                      fontSize: 12, fontWeight: 500, borderRadius: 8, color: '#51535C', backgroundColor: '#F2F3F5',
                      border: isSelected ? '1.4px solid #2B313D' : '1.4px solid transparent',
                      transition: 'border-color 0.15s ease',
                    }}
                    className="px-3 py-1.5 whitespace-nowrap"
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 필터 버튼들 + 선택된 태그 */}
        <div className="px-2.5 flex gap-2 overflow-x-auto hide-scrollbar border-b border-gray-100" style={{ paddingTop: 10, paddingBottom: 10 }}>
          <button
            onClick={() => { setRegionStep('region'); setShowRegionModal(true); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors"
            style={{ fontSize: 14, fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', ...(selectedRegion ? { backgroundColor: '#2B313D', color: '#fff', borderColor: '#2B313D' } : { borderColor: '#E5E7EB', color: '#4B5563' }) }}
          >
            {selectedRegion ? regionLabel : '지역'}
            <ChevronDown size={12} />
          </button>
          <button
            onClick={() => setShowPriceModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors"
            style={{ fontSize: 14, fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', ...(selectedPrice !== '전체' ? { backgroundColor: '#2B313D', color: '#fff', borderColor: '#2B313D' } : { borderColor: '#E5E7EB', color: '#4B5563' }) }}
          >
            {selectedPrice !== '전체' ? selectedPrice : '가격'}
            <ChevronDown size={12} />
          </button>
          <button
            onClick={() => setShowBookingModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors"
            style={{ fontSize: 14, fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', ...(selectedBooking !== '전체' ? { backgroundColor: '#2B313D', color: '#fff', borderColor: '#2B313D' } : { borderColor: '#E5E7EB', color: '#4B5563' }) }}
          >
            {selectedBooking !== '전체' ? selectedBooking : '예약방법'}
            <ChevronDown size={12} />
          </button>
          <button
            onClick={() => setShowSortModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors"
            style={{ fontSize: 14, fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderColor: '#E5E7EB', color: '#4B5563' }}
          >
            {selectedSort}
            <ChevronDown size={12} />
          </button>
          {selectedTags.map(tag => (
            <span key={tag} className="flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap"
              style={{ fontSize: 12, fontWeight: 500, backgroundColor: '#F2F3F5', color: '#51535C', borderRadius: 8 }}>
              {tag}
              <button onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>

        {/* 카테고리 아이콘 탭 */}
        <div className="flex gap-3 overflow-x-auto hide-scrollbar px-2.5 py-3 lg:px-0">
          {/* 전체 카테고리 */}
          <button
            onClick={() => setActiveCategory('')}
            className="flex flex-col items-center gap-1.5 min-w-[52px]"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all p-2 ${
              !activeCategory ? 'bg-[#EDE9FE] ring-2 ring-[#7C3AED]' : 'bg-gray-50'
            }`}>
              <span className="text-lg">📋</span>
            </div>
            <span className={`text-[10px] whitespace-nowrap ${!activeCategory ? 'text-[#7C3AED] font-bold' : 'text-gray-500'}`}>
              전체
            </span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="flex flex-col items-center gap-1.5 min-w-[52px]"
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all p-2 ${
                activeCategory === cat.id ? 'bg-[#EDE9FE] ring-2 ring-[#7C3AED]' : 'bg-gray-50'
              }`}>
                <img src={cat.icon} alt={cat.name} className="w-full h-full" />
              </div>
              <span className={`text-[10px] whitespace-nowrap ${activeCategory === cat.id ? 'text-[#7C3AED] font-bold' : 'text-gray-500'}`}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>

        {/* 결과 */}
        <div className="px-2.5 pb-4 lg:max-w-7xl lg:mx-auto">
          <p className="text-sm text-gray-500 mb-3">
            <span className="font-bold text-black">{currentCat?.name || '전체'}</span> · {categoryResults.length}건
            {selectedRegion && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-[#EDE9FE] text-[#7C3AED] text-xs font-medium rounded-full">
                <MapPin size={10} /> {regionLabel}
              </span>
            )}
          </p>
          {categoryResults.length > 0 ? (
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-1.5 lg:gap-6 stagger-children">
              {categoryResults.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 bounce-in">
                <Search size={28} className="text-gray-300" />
              </div>
              <p style={{ fontSize: 18, fontWeight: 600, color: '#2B313D' }}>해당 카테고리에 상품이 없습니다.</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#51535C', marginTop: 2 }}>어떤 상품을 찾으시나요?</p>
            </div>
          )}
        </div>

        {/* ===== MODALS ===== */}
        {/* Region Modal */}
        {showRegionModal && (
          <FilterModal title="지역 선택" onClose={() => { setShowRegionModal(false); setRegionStep('region'); }}>
            {/* 현재 위치 */}
            <button
              onClick={handleCurrentLocation}
              className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 text-[#7C3AED] hover:bg-purple-50 transition-colors"
            >
              <div className="w-7 h-7 bg-[#EDE9FE] rounded-full flex items-center justify-center">
                <Locate size={14} />
              </div>
              <span className="text-[13px] font-medium">{locating ? '위치 찾는 중...' : '현재 위치로 설정'}</span>
            </button>
            {/* 전체 지역 초기화 */}
            <button
              onClick={() => { setSelectedRegion(''); setSelectedSubRegion(''); setShowRegionModal(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-[13px] border-b border-gray-100 ${!selectedRegion ? 'text-[#7C3AED] font-bold bg-purple-50' : 'text-gray-600'}`}
            >
              <span>전체 지역</span>
              {!selectedRegion && <Check size={14} className="text-[#7C3AED]" />}
            </button>
            {/* 좌: 시/도 | 우: 구/시 */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left: provinces */}
              <div className="w-[110px] flex-shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50">
                {provinceKeys.map((prov) => {
                  const isActive = activeProvince === prov;
                  return (
                    <button
                      key={prov}
                      onClick={() => setActiveProvince(prov)}
                      className="w-full text-left px-3 py-3 text-[13px] transition-colors"
                      style={{
                        backgroundColor: isActive ? '#fff' : 'transparent',
                        color: isActive ? '#7C3AED' : '#4B5563',
                        fontWeight: isActive ? 700 : 500,
                        borderRight: isActive ? '2px solid #7C3AED' : '2px solid transparent',
                      }}
                    >
                      {prov}
                    </button>
                  );
                })}
              </div>
              {/* Right: districts */}
              <div className="flex-1 overflow-y-auto">
                {(PROVINCES[activeProvince] ?? []).map((district) => {
                  const fullRegion = district === '전체' ? activeProvince : `${activeProvince} ${district}`;
                  const isSelected = selectedRegion === fullRegion || (district === '전체' && selectedRegion === activeProvince);
                  return (
                    <button
                      key={district}
                      onClick={() => handleSelectSubRegion(district)}
                      className="w-full flex items-center justify-between px-4 py-3 text-[13px] hover:bg-gray-50 transition-colors"
                      style={{
                        color: isSelected ? '#7C3AED' : '#374151',
                        fontWeight: isSelected ? 600 : 400,
                        backgroundColor: isSelected ? '#F4EFFF' : 'transparent',
                      }}
                    >
                      <span>{district}</span>
                      {isSelected && <Check size={14} className="text-[#7C3AED]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </FilterModal>
        )}

        {/* Price Modal */}
        {showPriceModal && (
          <FilterModal title="가격대 선택" onClose={() => setShowPriceModal(false)}>
            <div className="flex-1 overflow-y-auto">
              {priceRanges.map((price) => (
                <button key={price} onClick={() => { setSelectedPrice(price); setShowPriceModal(false); }}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50 transition-colors ${selectedPrice === price ? 'text-[#7C3AED] font-medium bg-purple-50' : 'text-gray-700'}`}>
                  <span>{price}</span>
                  {selectedPrice === price && <Check size={16} className="text-[#7C3AED]" />}
                </button>
              ))}
            </div>
          </FilterModal>
        )}

        {/* Booking Modal */}
        {showBookingModal && (
          <FilterModal title="예약방법 선택" onClose={() => setShowBookingModal(false)}>
            <div className="flex-1 overflow-y-auto">
              {bookingMethods.map((method) => (
                <button key={method} onClick={() => { setSelectedBooking(method); setShowBookingModal(false); }}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50 transition-colors ${selectedBooking === method ? 'text-[#7C3AED] font-medium bg-purple-50' : 'text-gray-700'}`}>
                  <span>{method}</span>
                  {selectedBooking === method && <Check size={16} className="text-[#7C3AED]" />}
                </button>
              ))}
            </div>
          </FilterModal>
        )}

        {/* Sort Modal */}
        {showSortModal && (
          <FilterModal title="정렬" onClose={() => setShowSortModal(false)}>
            <div className="flex-1 overflow-y-auto">
              {sortOptions.map((opt) => (
                <button key={opt} onClick={() => { setSelectedSort(opt); setShowSortModal(false); }}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50 transition-colors ${selectedSort === opt ? 'text-[#7C3AED] font-medium bg-purple-50' : 'text-gray-700'}`}>
                  <span>{opt}</span>
                  {selectedSort === opt && <Check size={16} className="text-[#7C3AED]" />}
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

      {/* Filter buttons for normal search */}
      <div className="px-2.5 flex gap-2 overflow-x-auto hide-scrollbar border-b border-gray-100" style={{ paddingTop: 10, paddingBottom: 10 }}>
        <button onClick={() => { setRegionStep('region'); setShowRegionModal(true); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors"
          style={{ fontSize: 14, fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', ...(selectedRegion ? { backgroundColor: '#2B313D', color: '#fff', borderColor: '#2B313D' } : { borderColor: '#E5E7EB', color: '#4B5563' }) }}>
          {selectedRegion ? regionLabel : '지역'} <ChevronDown size={12} />
        </button>
        <button onClick={() => setShowPriceModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors"
          style={{ fontSize: 14, fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', ...(selectedPrice !== '전체' ? { backgroundColor: '#2B313D', color: '#fff', borderColor: '#2B313D' } : { borderColor: '#E5E7EB', color: '#4B5563' }) }}>
          {selectedPrice !== '전체' ? selectedPrice : '가격'} <ChevronDown size={12} />
        </button>
        <button onClick={() => setShowBookingModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors"
          style={{ fontSize: 14, fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', ...(selectedBooking !== '전체' ? { backgroundColor: '#2B313D', color: '#fff', borderColor: '#2B313D' } : { borderColor: '#E5E7EB', color: '#4B5563' }) }}>
          {selectedBooking !== '전체' ? selectedBooking : '예약방법'} <ChevronDown size={12} />
        </button>
        <button onClick={() => setShowSortModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors"
          style={{ fontSize: 14, fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderColor: '#E5E7EB', color: '#4B5563' }}>
          {selectedSort} <ChevronDown size={12} />
        </button>
      </div>

      <div className="lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-6">
        <div className="lg:bg-white lg:rounded-2xl lg:shadow-sm lg:p-6">
          {hasSearched ? (
            <div className="px-2.5 stagger-children">
              {selectedRegion && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#EDE9FE] text-[#7C3AED] text-xs font-medium rounded-full">
                    <MapPin size={12} /> {regionLabel}
                  </span>
                </div>
              )}
              {searchResults.length > 0 ? (
                <>
                  <p className="text-sm text-gray-500 mb-3">
                    검색결과 <span className="font-bold text-black">{searchResults.length}</span>건
                  </p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                    {searchResults.map((product) => (
                      <ProductCard key={product.id} product={product} />
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
                      <span className={`text-sm font-bold w-5 text-center ${index < 3 ? 'text-[#7C3AED]' : 'text-gray-400'}`}>{index + 1}</span>
                      <span className="text-sm text-gray-800">{keyword}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Shared Region Modal for normal search mode — same split design */}
      {showRegionModal && (
        <FilterModal title="지역 선택" onClose={() => { setShowRegionModal(false); setRegionStep('region'); }}>
          <button onClick={handleCurrentLocation} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 text-[#7C3AED] hover:bg-purple-50 transition-colors">
            <div className="w-7 h-7 bg-[#EDE9FE] rounded-full flex items-center justify-center"><Locate size={14} /></div>
            <span className="text-[13px] font-medium">{locating ? '위치 찾는 중...' : '현재 위치로 설정'}</span>
          </button>
          <button onClick={() => { setSelectedRegion(''); setSelectedSubRegion(''); setShowRegionModal(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 text-[13px] border-b border-gray-100 ${!selectedRegion ? 'text-[#7C3AED] font-bold bg-purple-50' : 'text-gray-600'}`}>
            <span>전체 지역</span>{!selectedRegion && <Check size={14} className="text-[#7C3AED]" />}
          </button>
          <div className="flex flex-1 overflow-hidden">
            <div className="w-[110px] flex-shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50">
              {provinceKeys.map((prov) => {
                const isActive = activeProvince === prov;
                return (
                  <button key={prov} onClick={() => setActiveProvince(prov)}
                    className="w-full text-left px-3 py-3 text-[13px] transition-colors"
                    style={{ backgroundColor: isActive ? '#fff' : 'transparent', color: isActive ? '#7C3AED' : '#4B5563', fontWeight: isActive ? 700 : 500, borderRight: isActive ? '2px solid #7C3AED' : '2px solid transparent' }}>
                    {prov}
                  </button>
                );
              })}
            </div>
            <div className="flex-1 overflow-y-auto">
              {(PROVINCES[activeProvince] ?? []).map((district) => {
                const fullRegion = district === '전체' ? activeProvince : `${activeProvince} ${district}`;
                const isSelected = selectedRegion === fullRegion || (district === '전체' && selectedRegion === activeProvince);
                return (
                  <button key={district} onClick={() => handleSelectSubRegion(district)}
                    className="w-full flex items-center justify-between px-4 py-3 text-[13px] hover:bg-gray-50 transition-colors"
                    style={{ color: isSelected ? '#7C3AED' : '#374151', fontWeight: isSelected ? 600 : 400, backgroundColor: isSelected ? '#F4EFFF' : 'transparent' }}>
                    <span>{district}</span>{isSelected && <Check size={14} className="text-[#7C3AED]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </FilterModal>
      )}
      {showPriceModal && (
        <FilterModal title="가격대 선택" onClose={() => setShowPriceModal(false)}>
          <div className="flex-1 overflow-y-auto">
            {priceRanges.map((p) => (
              <button key={p} onClick={() => { setSelectedPrice(p); setShowPriceModal(false); }}
                className={`w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50 ${selectedPrice === p ? 'text-[#7C3AED] font-medium bg-purple-50' : 'text-gray-700'}`}>
                <span>{p}</span>{selectedPrice === p && <Check size={16} className="text-[#7C3AED]" />}
              </button>
            ))}
          </div>
        </FilterModal>
      )}
      {showBookingModal && (
        <FilterModal title="예약방법 선택" onClose={() => setShowBookingModal(false)}>
          <div className="flex-1 overflow-y-auto">
            {bookingMethods.map((m) => (
              <button key={m} onClick={() => { setSelectedBooking(m); setShowBookingModal(false); }}
                className={`w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50 ${selectedBooking === m ? 'text-[#7C3AED] font-medium bg-purple-50' : 'text-gray-700'}`}>
                <span>{m}</span>{selectedBooking === m && <Check size={16} className="text-[#7C3AED]" />}
              </button>
            ))}
          </div>
        </FilterModal>
      )}
      {showSortModal && (
        <FilterModal title="정렬" onClose={() => setShowSortModal(false)}>
          <div className="flex-1 overflow-y-auto">
            {sortOptions.map((o) => (
              <button key={o} onClick={() => { setSelectedSort(o); setShowSortModal(false); }}
                className={`w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50 ${selectedSort === o ? 'text-[#7C3AED] font-medium bg-purple-50' : 'text-gray-700'}`}>
                <span>{o}</span>{selectedSort === o && <Check size={16} className="text-[#7C3AED]" />}
              </button>
            ))}
          </div>
        </FilterModal>
      )}
    </div>
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
