'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, XCircle, ChevronLeft, ChevronDown, MapPin, Locate, Check, X, SlidersHorizontal, DollarSign, CalendarCheck } from 'lucide-react';
import ProductCard from '@/components/common/ProductCard';
import { useStore } from '@/store';
import { regions, popularSearches, categories, dentalSubCategories } from '@/lib/mock-data';

const subRegions: Record<string, string[]> = {
  '서울시 강남구': ['전체', '압구정동', '청담동', '신사동', '논현동', '역삼동', '삼성동', '대치동'],
  '서울시 서초구': ['전체', '서초동', '반포동', '잠원동', '양재동', '방배동'],
  '서울시 동작구': ['전체', '사당동', '노량진동', '흑석동', '상도동'],
  '서울시 금천구': ['전체', '가산동', '독산동', '시흥동'],
  '서울시 양천구': ['전체', '목동', '신월동', '신정동'],
  '서울시 마포구': ['전체', '합정동', '서교동', '연남동', '상수동', '망원동'],
  '서울시 종로구': ['전체', '종로동', '인사동', '삼청동', '북촌', '서촌'],
  '서울시 중구': ['전체', '명동', '을지로', '충무로', '남산동'],
  '서울시 강동구': ['전체', '천호동', '길동', '둔촌동', '명일동'],
  '서울시 송파구': ['전체', '잠실동', '방이동', '석촌동', '문정동'],
  '서울시 관악구': ['전체', '신림동', '봉천동', '남현동'],
  '서울시 영등포구': ['전체', '여의도동', '영등포동', '당산동', '문래동'],
};

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

  const { products, recentSearches, addRecentSearch, removeRecentSearch, showToast } = useStore();
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

  const isCategoryMode = !!activeCategory;
  const currentCat = categories.find(c => c.id === activeCategory);
  const tags = relatedTags[activeCategory] ?? [];

  const regionLabel = selectedRegion
    ? selectedSubRegion && selectedSubRegion !== '전체'
      ? `${selectedRegion} ${selectedSubRegion}`
      : selectedRegion
    : '';

  const categoryResults = isCategoryMode
    ? products.filter(p => p.category === activeCategory)
    : [];

  const searchResults = hasSearched
    ? products.filter(
        (p) =>
          p.title.includes(query) ||
          p.tags.some((t) => t.includes(query)) ||
          p.hospitalName.includes(query) ||
          p.subCategory.includes(query)
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
        setSelectedRegion('서울시 강남구');
        setSelectedSubRegion('역삼동');
        setLocating(false);
        setShowRegionModal(false);
        showToast(`현재 위치: 서울시 강남구 역삼동`);
      },
      () => { setLocating(false); showToast('위치를 가져올 수 없습니다.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSelectRegion = (region: string) => {
    setTempRegion(region);
    if (subRegions[region]) setRegionStep('sub');
    else { setSelectedRegion(region); setSelectedSubRegion(''); setShowRegionModal(false); }
  };

  const handleSelectSubRegion = (sub: string) => {
    setSelectedRegion(tempRegion);
    setSelectedSubRegion(sub);
    setShowRegionModal(false);
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
            className="flex-1 flex items-center bg-gray-100 rounded-xl px-4 gap-2"
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
                <XCircle size={20} style={{ color: '#505050' }} />
              </button>
            )}
          </div>
        </div>

        {/* 연관 태그 */}
        {tags.length > 0 && (
          <div className="px-4 py-2">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => { setQuery(tag); handleSearch(tag); }}
                  className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-600 whitespace-nowrap hover:bg-[#EDE9FE] hover:text-[#7C3AED] transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 필터 버튼들 */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto hide-scrollbar border-b border-gray-100">
          {/* 지역 */}
          <button
            onClick={() => { setRegionStep('region'); setShowRegionModal(true); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
              selectedRegion ? 'border-[#7C3AED] text-[#7C3AED] bg-[#EDE9FE]' : 'border-gray-200 text-gray-600'
            }`}
          >
            <MapPin size={14} />
            {selectedRegion ? regionLabel : '지역'}
            <ChevronDown size={12} />
          </button>

          {/* 가격 */}
          <button
            onClick={() => setShowPriceModal(true)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
              selectedPrice !== '전체' ? 'border-[#7C3AED] text-[#7C3AED] bg-[#EDE9FE]' : 'border-gray-200 text-gray-600'
            }`}
          >
            <DollarSign size={14} />
            {selectedPrice !== '전체' ? selectedPrice : '가격'}
            <ChevronDown size={12} />
          </button>

          {/* 예약방법 */}
          <button
            onClick={() => setShowBookingModal(true)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
              selectedBooking !== '전체' ? 'border-[#7C3AED] text-[#7C3AED] bg-[#EDE9FE]' : 'border-gray-200 text-gray-600'
            }`}
          >
            <CalendarCheck size={14} />
            {selectedBooking !== '전체' ? selectedBooking : '예약방법'}
            <ChevronDown size={12} />
          </button>

          {/* 정렬 */}
          <button
            onClick={() => setShowSortModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border border-gray-200 text-gray-600 transition-colors"
          >
            <SlidersHorizontal size={14} />
            {selectedSort}
            <ChevronDown size={12} />
          </button>
        </div>

        {/* 카테고리 아이콘 탭 */}
        <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 py-3 lg:px-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex flex-col items-center gap-1.5 min-w-[52px] transition-opacity ${
                activeCategory === cat.id ? '' : 'opacity-40'
              }`}
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all p-2 ${
                activeCategory === cat.id ? 'bg-[#EDE9FE] ring-2 ring-[#7C3AED]' : 'bg-gray-50'
              }`}>
                <img src={cat.icon} alt={cat.name} className="w-full h-full" />
              </div>
              <span className={`text-[10px] whitespace-nowrap ${activeCategory === cat.id ? 'text-[#7C3AED] font-bold' : 'text-gray-400'}`}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>

        {/* 결과 */}
        <div className="px-4 pb-4 lg:max-w-7xl lg:mx-auto">
          <p className="text-sm text-gray-500 mb-3">
            <span className="font-bold text-black">{currentCat?.name}</span> · {categoryResults.length}건
            {selectedRegion && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-[#EDE9FE] text-[#7C3AED] text-xs font-medium rounded-full">
                <MapPin size={10} /> {regionLabel}
              </span>
            )}
          </p>
          {categoryResults.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 lg:gap-6 stagger-children">
              {categoryResults.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 bounce-in">
                <Search size={28} className="text-gray-300" />
              </div>
              <p className="text-gray-500">해당 카테고리에 상품이 없습니다.</p>
            </div>
          )}
        </div>

        {/* ===== MODALS ===== */}
        {/* Region Modal */}
        {showRegionModal && (
          <FilterModal title={regionStep === 'region' ? '지역 선택' : tempRegion} onClose={() => setShowRegionModal(false)}>
            <button
              onClick={handleCurrentLocation}
              className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 text-[#7C3AED] hover:bg-purple-50 transition-colors"
            >
              <div className="w-8 h-8 bg-[#EDE9FE] rounded-full flex items-center justify-center">
                <Locate size={16} />
              </div>
              <span className="text-sm font-medium">{locating ? '위치 찾는 중...' : '현재 위치로 설정'}</span>
            </button>
            <div className="flex-1 overflow-y-auto">
              {regionStep === 'region' ? (
                <>
                  <button onClick={() => { setSelectedRegion(''); setSelectedSubRegion(''); setShowRegionModal(false); }}
                    className={`w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50 ${!selectedRegion ? 'text-[#7C3AED] font-medium bg-purple-50' : 'text-gray-700'}`}>
                    <span>전체 지역</span>
                    {!selectedRegion && <Check size={16} className="text-[#7C3AED]" />}
                  </button>
                  {regions.map((region) => (
                    <button key={region} onClick={() => handleSelectRegion(region)}
                      className={`w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50 transition-colors ${selectedRegion === region ? 'text-[#7C3AED] font-medium bg-purple-50' : 'text-gray-700'}`}>
                      <span>{region}</span>
                      {selectedRegion === region && <Check size={16} className="text-[#7C3AED]" />}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <button onClick={() => setRegionStep('region')} className="w-full flex items-center gap-2 px-5 py-3 text-sm text-[#7C3AED] hover:bg-gray-50 border-b border-gray-50">
                    ← 지역 다시 선택
                  </button>
                  {(subRegions[tempRegion] ?? ['전체']).map((sub) => (
                    <button key={sub} onClick={() => handleSelectSubRegion(sub)}
                      className={`w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50 ${selectedSubRegion === sub && selectedRegion === tempRegion ? 'text-[#7C3AED] font-medium bg-purple-50' : 'text-gray-700'}`}>
                      <span>{sub}</span>
                      {selectedSubRegion === sub && selectedRegion === tempRegion && <Check size={16} className="text-[#7C3AED]" />}
                    </button>
                  ))}
                </>
              )}
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
        <div style={{ height: 46 }} className="flex-1 flex items-center bg-gray-100 rounded-xl px-4 gap-2">
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
              <XCircle size={20} style={{ color: '#505050' }} />
            </button>
          )}
        </div>
      </div>

      {/* Filter buttons for normal search */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto hide-scrollbar border-b border-gray-100">
        <button onClick={() => { setRegionStep('region'); setShowRegionModal(true); }}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${selectedRegion ? 'border-[#7C3AED] text-[#7C3AED] bg-[#EDE9FE]' : 'border-gray-200 text-gray-600'}`}>
          <MapPin size={14} /> {selectedRegion ? regionLabel : '지역'} <ChevronDown size={12} />
        </button>
        <button onClick={() => setShowPriceModal(true)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${selectedPrice !== '전체' ? 'border-[#7C3AED] text-[#7C3AED] bg-[#EDE9FE]' : 'border-gray-200 text-gray-600'}`}>
          <DollarSign size={14} /> {selectedPrice !== '전체' ? selectedPrice : '가격'} <ChevronDown size={12} />
        </button>
        <button onClick={() => setShowBookingModal(true)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${selectedBooking !== '전체' ? 'border-[#7C3AED] text-[#7C3AED] bg-[#EDE9FE]' : 'border-gray-200 text-gray-600'}`}>
          <CalendarCheck size={14} /> {selectedBooking !== '전체' ? selectedBooking : '예약방법'} <ChevronDown size={12} />
        </button>
        <button onClick={() => setShowSortModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border border-gray-200 text-gray-600">
          <SlidersHorizontal size={14} /> {selectedSort} <ChevronDown size={12} />
        </button>
      </div>

      <div className="lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-6">
        <div className="lg:bg-white lg:rounded-2xl lg:shadow-sm lg:p-6">
          {hasSearched ? (
            <div className="px-4 stagger-children">
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
                <div className="px-4 mb-6 fade-in-up">
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
              <div className="px-4 fade-in-up fade-in-up-delay-1">
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

      {/* Shared Modals for normal search mode */}
      {showRegionModal && (
        <FilterModal title={regionStep === 'region' ? '지역 선택' : tempRegion} onClose={() => setShowRegionModal(false)}>
          <button onClick={handleCurrentLocation} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 text-[#7C3AED] hover:bg-purple-50 transition-colors">
            <div className="w-8 h-8 bg-[#EDE9FE] rounded-full flex items-center justify-center"><Locate size={16} /></div>
            <span className="text-sm font-medium">{locating ? '위치 찾는 중...' : '현재 위치로 설정'}</span>
          </button>
          <div className="flex-1 overflow-y-auto">
            {regionStep === 'region' ? (
              <>
                <button onClick={() => { setSelectedRegion(''); setSelectedSubRegion(''); setShowRegionModal(false); }}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50 ${!selectedRegion ? 'text-[#7C3AED] font-medium bg-purple-50' : 'text-gray-700'}`}>
                  <span>전체 지역</span>{!selectedRegion && <Check size={16} className="text-[#7C3AED]" />}
                </button>
                {regions.map((r) => (
                  <button key={r} onClick={() => handleSelectRegion(r)}
                    className={`w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50 ${selectedRegion === r ? 'text-[#7C3AED] font-medium bg-purple-50' : 'text-gray-700'}`}>
                    <span>{r}</span>{selectedRegion === r && <Check size={16} className="text-[#7C3AED]" />}
                  </button>
                ))}
              </>
            ) : (
              <>
                <button onClick={() => setRegionStep('region')} className="w-full flex items-center gap-2 px-5 py-3 text-sm text-[#7C3AED] hover:bg-gray-50 border-b border-gray-50">← 지역 다시 선택</button>
                {(subRegions[tempRegion] ?? ['전체']).map((s) => (
                  <button key={s} onClick={() => handleSelectSubRegion(s)}
                    className={`w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50 ${selectedSubRegion === s && selectedRegion === tempRegion ? 'text-[#7C3AED] font-medium bg-purple-50' : 'text-gray-700'}`}>
                    <span>{s}</span>{selectedSubRegion === s && selectedRegion === tempRegion && <Check size={16} className="text-[#7C3AED]" />}
                  </button>
                ))}
              </>
            )}
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
