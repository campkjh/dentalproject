'use client';

import { useState, useMemo, Suspense, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, XCircle, ChevronLeft, ChevronRight, ChevronDown, MapPin, Locate, Check, X, SlidersHorizontal, DollarSign, CalendarCheck, Star, Heart } from 'lucide-react';
import { useStore } from '@/store';
import { regions, dentalSubCategories } from '@/lib/mock-data';
import type { Product } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import AllCategoriesSheet, { rememberCategory } from '@/components/search/AllCategoriesSheet';
import ProductCard from '@/components/common/ProductCard';
import MonoIcon from '@/components/common/MonoIcon';

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
const bookingMethods = ['전체', '앱결제', '현장결제', '상담 후 결제'];
/** 예약방법 컬러 아이콘(public/icons/color — 사장 제공 토스 컬러 아이콘, 261031) */
const BOOKING_ICONS: Record<string, string> = {
  '전체': '/icons/color/grid.svg',
  '앱결제': '/icons/color/phone-check.svg',
  '현장결제': '/icons/color/card.svg',
  '상담 후 결제': '/icons/color/chat-dots.svg',
};
const PRICE_STEP = 5000;
const PRICE_CAP = 2000000;
const sortOptions = ['추천순', '가격 낮은순', '가격 높은순', '평점 높은순', '리뷰 많은순'];

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
  const [promoProduct, setPromoProduct] = useState<{ productId: string; title: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/search-promo', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPromoProduct(data?.promo ?? null);
      } catch {
        // ignore — AD slot just hides
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const promoProductData = useMemo(() => {
    if (!promoProduct?.productId) return null;
    const local = products.find((p) => p.id === promoProduct.productId);
    if (local) return local;
    if (promoProduct.title) {
      return { id: promoProduct.productId, title: promoProduct.title } as Pick<Product, 'id' | 'title'>;
    }
    return null;
  }, [promoProduct, products]);

  const isCategoryMode = categoryParam !== null;
  const currentCat = categories.find(c => c.id === activeCategory);

  // Tab-switch animation: track which direction the next category sits
  // (right vs left of the previous one) so we can play the matching
  // slide on the results list.
  const [tabDirection, setTabDirection] = useState<'left' | 'right'>('right');
  const prevTabIdxRef = useRef(0);
  const categoryTabIds = ['', ...categories.map((c) => c.id)];

  // 전체 카테고리 화면(머리 햄버거) — 진료과 알약 줄 대신
  const [allCatsOpen, setAllCatsOpen] = useState(false);
  // 카테고리 목록 머리 검색 칸 — 진료과 이름을 보여 주다가 X 를 누르면 비운다(진료과를 바꾸면 다시 보인다)
  const [catLabelCleared, setCatLabelCleared] = useState(false);
  const catInputRef = useRef<HTMLInputElement>(null);
  // 본 진료과를 '최근 본 카테고리'로 남긴다
  useEffect(() => { if (activeCategory) rememberCategory(activeCategory); }, [activeCategory]);

  const changeCategory = (id: string) => {
    setCatLabelCleared(false);
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
        const detected = detectKoreaRegion(latitude, longitude);
        if (!detected) {
          setLocating(false);
          showToast('현재 위치를 한국 내에서 찾을 수 없어요.');
          return;
        }
        const entry = detected.district
          ? `${detected.province} ${detected.district}`
          : `${detected.province}`;
        setSelectedRegions([entry]);
        setActiveProvince(detected.province);
        setLocating(false);
        showToast(`현재 위치: ${entry}`);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          showToast('위치 권한이 거부됐어요. 브라우저 설정에서 허용해 주세요.');
        } else if (err.code === err.TIMEOUT) {
          showToast('위치 찾기에 시간이 너무 오래 걸려요. 잠시 후 다시 시도해 주세요.');
        } else {
          showToast('현재 위치를 가져올 수 없어요.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Map GPS coordinates to Korean 광역시도 + 주요 시군구.
  // Uses bounding boxes for province detection, then nearest-center for sub-region.
  function detectKoreaRegion(lat: number, lng: number): { province: string; district: string | null } | null {
    // Province bounding boxes (rough).
    const provinces: { name: string; box: [number, number, number, number] /* minLat, maxLat, minLng, maxLng */ }[] = [
      { name: '서울',   box: [37.42, 37.70, 126.76, 127.18] },
      { name: '인천',   box: [37.30, 37.60, 126.40, 126.78] },
      { name: '경기',   box: [36.90, 38.30, 126.40, 127.90] },
      { name: '강원',   box: [37.00, 38.62, 127.40, 129.40] },
      { name: '대전',   box: [36.20, 36.50, 127.30, 127.55] },
      { name: '세종',   box: [36.40, 36.70, 127.20, 127.40] },
      { name: '충북',   box: [36.00, 37.20, 127.30, 128.80] },
      { name: '충남',   box: [35.90, 37.00, 126.10, 127.50] },
      { name: '광주',   box: [35.06, 35.27, 126.65, 127.00] },
      { name: '전북',   box: [35.40, 36.30, 126.30, 127.90] },
      { name: '전남',   box: [33.90, 35.65, 125.80, 127.60] },
      { name: '대구',   box: [35.70, 36.00, 128.40, 128.80] },
      { name: '울산',   box: [35.40, 35.75, 129.10, 129.50] },
      { name: '부산',   box: [34.95, 35.40, 128.80, 129.30] },
      { name: '경북',   box: [35.40, 37.20, 127.80, 129.70] },
      { name: '경남',   box: [34.60, 36.00, 127.50, 129.20] },
      { name: '제주',   box: [33.10, 33.60, 126.10, 126.95] },
    ];

    // 1) Find which province the user falls into. If multiple match (Seoul is inside Gyeonggi), prefer the smaller/metro one (it's listed first).
    let provinceName: string | null = null;
    for (const p of provinces) {
      const [minLat, maxLat, minLng, maxLng] = p.box;
      if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
        provinceName = p.name;
        break;
      }
    }
    if (!provinceName) return null;

    // 2) Within the province, find the nearest district center.
    const districtCenters: Record<string, { name: string; lat: number; lng: number }[]> = {
      '서울': [
        { name: '강남구', lat: 37.4979, lng: 127.0276 },
        { name: '서초구', lat: 37.4837, lng: 127.0324 },
        { name: '송파구', lat: 37.5145, lng: 127.1050 },
        { name: '강동구', lat: 37.5301, lng: 127.1237 },
        { name: '마포구', lat: 37.5564, lng: 126.9236 },
        { name: '용산구', lat: 37.5326, lng: 126.9909 },
        { name: '성동구', lat: 37.5634, lng: 127.0367 },
        { name: '광진구', lat: 37.5384, lng: 127.0822 },
        { name: '동대문구', lat: 37.5744, lng: 127.0397 },
        { name: '중랑구', lat: 37.6063, lng: 127.0928 },
        { name: '성북구', lat: 37.5894, lng: 127.0167 },
        { name: '강북구', lat: 37.6396, lng: 127.0257 },
        { name: '도봉구', lat: 37.6688, lng: 127.0471 },
        { name: '노원구', lat: 37.6541, lng: 127.0568 },
        { name: '은평구', lat: 37.6027, lng: 126.9291 },
        { name: '서대문구', lat: 37.5791, lng: 126.9368 },
        { name: '종로구', lat: 37.5735, lng: 126.9790 },
        { name: '중구', lat: 37.5636, lng: 126.9976 },
        { name: '동작구', lat: 37.5124, lng: 126.9396 },
        { name: '관악구', lat: 37.4784, lng: 126.9516 },
        { name: '금천구', lat: 37.4568, lng: 126.8956 },
        { name: '구로구', lat: 37.4955, lng: 126.8874 },
        { name: '영등포구', lat: 37.5247, lng: 126.8965 },
        { name: '양천구', lat: 37.5170, lng: 126.8664 },
        { name: '강서구', lat: 37.5509, lng: 126.8495 },
      ],
      '경기': [
        { name: '수원시', lat: 37.2636, lng: 127.0286 },
        { name: '성남시', lat: 37.4200, lng: 127.1265 },
        { name: '고양시', lat: 37.6584, lng: 126.8320 },
        { name: '용인시', lat: 37.2411, lng: 127.1776 },
        { name: '부천시', lat: 37.5036, lng: 126.7660 },
        { name: '안산시', lat: 37.3219, lng: 126.8309 },
        { name: '안양시', lat: 37.3943, lng: 126.9568 },
        { name: '남양주시', lat: 37.6360, lng: 127.2165 },
        { name: '화성시', lat: 37.1995, lng: 126.8316 },
        { name: '평택시', lat: 36.9921, lng: 127.1129 },
        { name: '의정부시', lat: 37.7381, lng: 127.0337 },
        { name: '시흥시', lat: 37.3800, lng: 126.8030 },
        { name: '파주시', lat: 37.7600, lng: 126.7800 },
        { name: '광명시', lat: 37.4780, lng: 126.8645 },
        { name: '김포시', lat: 37.6153, lng: 126.7156 },
        { name: '하남시', lat: 37.5394, lng: 127.2148 },
        { name: '광주시', lat: 37.4290, lng: 127.2552 },
      ],
      '인천': [
        { name: '중구', lat: 37.4738, lng: 126.6217 },
        { name: '동구', lat: 37.4736, lng: 126.6432 },
        { name: '미추홀구', lat: 37.4634, lng: 126.6502 },
        { name: '연수구', lat: 37.4099, lng: 126.6786 },
        { name: '남동구', lat: 37.4474, lng: 126.7314 },
        { name: '부평구', lat: 37.5077, lng: 126.7218 },
        { name: '계양구', lat: 37.5375, lng: 126.7376 },
        { name: '서구', lat: 37.5454, lng: 126.6760 },
      ],
      '부산': [
        { name: '중구', lat: 35.1057, lng: 129.0345 },
        { name: '서구', lat: 35.0975, lng: 129.0244 },
        { name: '동구', lat: 35.1294, lng: 129.0451 },
        { name: '영도구', lat: 35.0913, lng: 129.0676 },
        { name: '부산진구', lat: 35.1631, lng: 129.0530 },
        { name: '동래구', lat: 35.1972, lng: 129.0837 },
        { name: '남구', lat: 35.1366, lng: 129.0844 },
        { name: '북구', lat: 35.1972, lng: 129.0123 },
        { name: '해운대구', lat: 35.1631, lng: 129.1639 },
        { name: '사하구', lat: 35.1042, lng: 128.9744 },
        { name: '금정구', lat: 35.2426, lng: 129.0921 },
        { name: '강서구', lat: 35.2122, lng: 128.9810 },
        { name: '연제구', lat: 35.1761, lng: 129.0807 },
        { name: '수영구', lat: 35.1456, lng: 129.1133 },
        { name: '사상구', lat: 35.1525, lng: 128.9911 },
      ],
      '대구': [
        { name: '중구', lat: 35.8693, lng: 128.6058 },
        { name: '동구', lat: 35.8866, lng: 128.6356 },
        { name: '서구', lat: 35.8716, lng: 128.5591 },
        { name: '남구', lat: 35.8459, lng: 128.5973 },
        { name: '북구', lat: 35.8854, lng: 128.5827 },
        { name: '수성구', lat: 35.8584, lng: 128.6308 },
        { name: '달서구', lat: 35.8298, lng: 128.5326 },
      ],
      '광주': [
        { name: '동구', lat: 35.1462, lng: 126.9233 },
        { name: '서구', lat: 35.1521, lng: 126.8901 },
        { name: '남구', lat: 35.1330, lng: 126.9027 },
        { name: '북구', lat: 35.1740, lng: 126.9120 },
        { name: '광산구', lat: 35.1395, lng: 126.7937 },
      ],
      '대전': [
        { name: '동구', lat: 36.3119, lng: 127.4548 },
        { name: '중구', lat: 36.3257, lng: 127.4214 },
        { name: '서구', lat: 36.3551, lng: 127.3833 },
        { name: '유성구', lat: 36.3623, lng: 127.3565 },
        { name: '대덕구', lat: 36.3464, lng: 127.4148 },
      ],
      '울산': [
        { name: '중구', lat: 35.5694, lng: 129.3328 },
        { name: '남구', lat: 35.5440, lng: 129.3300 },
        { name: '동구', lat: 35.5050, lng: 129.4170 },
        { name: '북구', lat: 35.5829, lng: 129.3613 },
      ],
      '세종': [{ name: '세종시', lat: 36.4801, lng: 127.2890 }],
      '제주': [
        { name: '제주시', lat: 33.4996, lng: 126.5312 },
        { name: '서귀포시', lat: 33.2541, lng: 126.5601 },
      ],
    };

    const candidates = districtCenters[provinceName];
    if (!candidates || candidates.length === 0) {
      // Province without sub-district mapping (예: 강원, 충북 등) → 전체로 표시
      return { province: provinceName, district: null };
    }

    let closest = candidates[0];
    let minDist = Infinity;
    for (const c of candidates) {
      const dist = Math.hypot(lat - c.lat, lng - c.lng);
      if (dist < minDist) {
        minDist = dist;
        closest = c;
      }
    }
    return { province: provinceName, district: closest.name };
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
        <div style={{ position: 'sticky', top: 0, zIndex: 40 }} className="bg-white flex h-[60px] items-center gap-1 pl-1.5 pr-4">
          <button type="button" onClick={() => router.back()} aria-label="뒤로가기" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#191F28] transition-colors active:bg-[#F2F4F6]">
            <i aria-hidden="true" className="block h-[26px] w-[26px] bg-[#191F28]" style={{ WebkitMaskImage: 'url(/quick-match/icons/back.svg)', maskImage: 'url(/quick-match/icons/back.svg)', WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }} />
          </button>
          <div
            className="flex h-12 flex-1 items-center gap-2 rounded-[14px] bg-[#F2F4F6] px-3.5 transition-colors focus-within:bg-[#EDEFF2]"
          >
            <Search size={19} strokeWidth={2.2} className="shrink-0 text-[#8B95A1]" />
            <input
              type="text"
              ref={catInputRef}
              value={query || (catLabelCleared ? '' : currentCat?.name || '')}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && query) handleSearch(); }}
              placeholder="원하는 시술이 있으신가요?"
              style={{ fontSize: 16 }}
              className="min-w-0 flex-1 bg-transparent font-medium text-[#191F28] outline-none placeholder:font-normal placeholder:text-[#8B95A1]"
            />
            {(query || (currentCat && !catLabelCleared)) && (
              <button type="button" aria-label="검색어 지우기" onClick={() => { setQuery(''); setHasSearched(false); setCatLabelCleared(true); catInputRef.current?.focus(); }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#C9CED6" />
                  <path d="m15 9-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  <path d="m9 9 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          <button type="button" onClick={() => setAllCatsOpen(true)} aria-label="전체 카테고리" className="-mr-1.5 ml-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#191F28] transition-colors active:bg-[#F2F4F6]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
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
          setSelectedSort={setSelectedSort}
          count={categoryResults.length}
        />

        {/* 결과 — animated slide on tab switch */}
        <div
          key={activeCategory || 'all'}
          className={`px-4 pb-4 lg:max-w-7xl lg:mx-auto ${tabDirection === 'right' ? 'tab-slide-right' : 'tab-slide-left'}`}
        >
          {categoryResults.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 stagger-children md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
              {categoryResults.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
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

        {allCatsOpen && (
          <AllCategoriesSheet
            categories={categories}
            activeId={activeCategory}
            onPick={(id) => { changeCategory(id); setQuery(''); }}
            onClose={() => setAllCatsOpen(false)}
          />
        )}
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

      </div>
    );
  }

  // ========== NORMAL SEARCH MODE ==========
  // When the user has actually run a search we collapse back to the compact
  // header layout (back + inline search bar) so results have more room. The
  // landing state (no search yet) uses the dedicated "검색" title + combined
  // region/keyword box per the new design.
  if (hasSearched) {
    return (
      <div className="pb-[86px] lg:pb-0 bg-white min-h-screen page-enter">
        <div style={{ position: 'sticky', top: 0, zIndex: 40 }} className="bg-white flex h-[60px] items-center gap-1 pl-1.5 pr-4 lg:hidden">
          <button type="button" onClick={() => router.back()} aria-label="뒤로가기" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#191F28] transition-colors active:bg-[#F2F4F6]">
            <i aria-hidden="true" className="block h-[26px] w-[26px] bg-[#191F28]" style={{ WebkitMaskImage: 'url(/quick-match/icons/back.svg)', maskImage: 'url(/quick-match/icons/back.svg)', WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }} />
          </button>
          <div className="flex h-12 flex-1 items-center gap-2 rounded-[14px] bg-[#F2F4F6] px-3.5 transition-colors focus-within:bg-[#EDEFF2]">
            <Search size={19} strokeWidth={2.2} className="shrink-0 text-[#8B95A1]" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (!e.target.value) setHasSearched(false); }}
              onKeyDown={handleKeyDown}
              placeholder="원하는 시술이 있으신가요?"
              style={{ fontSize: 16 }}
              className="min-w-0 flex-1 bg-transparent font-medium text-[#191F28] outline-none placeholder:font-normal placeholder:text-[#8B95A1]"
            />
            {query && (
              <button onClick={() => { setQuery(''); setHasSearched(false); }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#C9CED6" />
                  <path d="m15 9-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  <path d="m9 9 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          <button type="button" onClick={() => setAllCatsOpen(true)} aria-label="전체 카테고리" className="-mr-1.5 ml-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#191F28] transition-colors active:bg-[#F2F4F6]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
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
          setSelectedSort={setSelectedSort}
          count={searchResults.length}
        />

        <div className="lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-6">
          <div className="lg:bg-white lg:rounded-2xl lg:shadow-sm lg:p-6">
            <div
              key={activeCategory || 'all'}
              className={`px-2.5 stagger-children ${tabDirection === 'right' ? 'tab-slide-right' : 'tab-slide-left'}`}
            >
              {searchResults.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
                    {searchResults.map((product, i) => (
                      <ProductCard key={product.id} product={product} index={i} />
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
          </div>
        </div>

        {allCatsOpen && (
          <AllCategoriesSheet
            categories={categories}
            activeId={activeCategory}
            onPick={(id) => { changeCategory(id); setQuery(''); }}
            onClose={() => setAllCatsOpen(false)}
          />
        )}
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
      </div>
    );
  }

  // ===== 검색 첫 화면 — 프리티풀 검색 그대로(뒤로 · 칸이 오른쪽에서 벌어짐 · 최근 검색 칩 · 차례 등장).
  //  · 지역은 칸 안 왼쪽 알약(핀 + 지역 ⌄)으로 — 홈 내린 머리 검색 줄(내 근처 ⌄ | 글자)과 같은 결, 고르면 파랑
  //  · 인기 검색어는 순위 줄(1~3위 파랑), 추천 상품은 맨 위 한 줄
  const regionPicked = selectedRegions.length > 0;
  return (
    <div className="min-h-screen bg-white pb-[86px] lg:pb-0" style={{ letterSpacing: '-0.02em' }}>
      {/* 머리 — 뒤로 · 지역+검색 칸 */}
      <div className="sticky top-0 z-40 bg-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex h-[60px] w-full max-w-[720px] items-center gap-1 pl-1.5 pr-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="뒤로가기"
            className="srch-back flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#191F28] transition-colors active:bg-[#F2F4F6]"
          >
            <i
              aria-hidden="true"
              className="block h-[26px] w-[26px] bg-[#191F28]"
              style={{ WebkitMaskImage: 'url(/quick-match/icons/back.svg)', maskImage: 'url(/quick-match/icons/back.svg)', WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }}
            />
          </button>
          <div className="flex min-w-0 flex-1 justify-end">
            <div className="srch-field relative flex h-12 w-full items-center overflow-hidden rounded-[14px] bg-[#F2F4F6] transition-colors focus-within:bg-[#EDEFF2]">
              <button
                type="button"
                onClick={() => setFilterModalTab('region')}
                aria-label={regionPicked ? `지역 ${regionLabel} — 바꾸기` : '지역 고르기'}
                className="srch-input ml-1.5 flex h-9 max-w-[42%] shrink-0 items-center gap-1 rounded-[10px] pl-2 pr-1.5 transition-colors active:bg-black/5"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                  <path d="M12 21.2s-6.6-5.7-6.6-11.1a6.6 6.6 0 0 1 13.2 0c0 5.4-6.6 11.1-6.6 11.1z" fill={regionPicked ? '#3180F7' : '#8B95A1'} />
                  <circle cx="12" cy="10" r="2.4" fill="#fff" />
                </svg>
                <span className={`truncate text-[15px] font-semibold ${regionPicked ? 'text-[#3180F7]' : 'text-[#4E5968]'}`}>
                  {regionPicked ? regionLabel : '전국'}
                </span>
                <ChevronDown size={15} strokeWidth={2.4} className={`shrink-0 ${regionPicked ? 'text-[#3180F7]' : 'text-[#B0B8C1]'}`} />
              </button>
              <span aria-hidden className="mx-1.5 h-4 w-px shrink-0 bg-[#D1D6DB]" />
              <input
                type="search"
                value={query}
                autoFocus
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="시술, 병원 이름으로 검색"
                enterKeyHint="search"
                autoComplete="off"
                className="srch-input h-full min-w-0 flex-1 bg-transparent pr-10 text-[16px] font-medium text-[#191F28] outline-none placeholder:font-normal placeholder:text-[#8B95A1] [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="검색어 지우기"
                  className="srch-clear absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#C9CED6] text-white"
                >
                  <X size={13} strokeWidth={2.6} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[720px] pb-10">
        {/* 최근 검색 — 시계 칩, × 로 하나씩 */}
        <section className="qd-a-title px-5 pt-6">
          <h2 className="text-[18px] font-bold text-[#191F28]">최근 검색</h2>
          {recentSearches.length > 0 ? (
            <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recentSearches.map((keyword, i) => (
                <span
                  key={keyword}
                  className="srch-chip qd-a-item inline-flex h-10 shrink-0 items-center rounded-full border border-[#E5E8EB] bg-white"
                  style={{ animationDelay: `${0.14 + i * 0.045}s` }}
                >
                  <button
                    type="button"
                    onClick={() => handleSearch(keyword)}
                    className="flex h-full items-center gap-1.5 pl-3.5 pr-1 text-[15px] font-medium text-[#333D4B]"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                      <circle cx="12" cy="12" r="8.6" stroke="#B0B8C1" strokeWidth="2" />
                      <path d="M12 7.8V12l2.8 1.8" stroke="#B0B8C1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="max-w-[160px] truncate">{keyword}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRecentSearch(keyword)}
                    aria-label={`최근 검색어 ${keyword} 지우기`}
                    className="flex h-full items-center pl-1 pr-3 text-[#B0B8C1] transition-colors active:text-[#6B7684]"
                  >
                    <X size={14} strokeWidth={2.4} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="qd-a-sub mt-3 text-[15px] text-[#8B95A1]">최근에 검색한 기록이 없어요</p>
          )}
        </section>

        {/* 인기 검색어 — 순위 줄 */}
        <section className="qd-a-sub px-5 pt-9">
          <h2 className="text-[18px] font-bold text-[#191F28]">인기 검색어</h2>
          <div className="mt-2 flex flex-col">
            {promoProductData && (
              <Link
                href={`/product/${promoProductData.id}`}
                className="qd-a-item -mx-2 flex h-[52px] items-center gap-3 rounded-[14px] px-2 transition-colors active:bg-[#F9FAFB]"
                style={{ animationDelay: '0.26s' }}
              >
                <span className="inline-flex h-6 shrink-0 items-center rounded-[7px] bg-[#EDF4FF] px-2 text-[12.5px] font-bold text-[#3180F7]">추천</span>
                <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-[#191F28]">{promoProductData.title}</span>
                <span className="shrink-0 text-[12px] font-medium text-[#B0B8C1]">AD</span>
              </Link>
            )}
            {popularSearches.map((keyword, index) => (
              <button
                key={keyword}
                type="button"
                onClick={() => handleSearch(keyword)}
                className="qd-a-item -mx-2 flex h-[52px] items-center gap-3 rounded-[14px] px-2 text-left transition-colors active:bg-[#F9FAFB]"
                style={{ animationDelay: `${0.3 + index * 0.04}s` }}
              >
                <span className={`w-6 shrink-0 text-center text-[16px] font-bold tabular-nums ${index < 3 ? 'text-[#3180F7]' : 'text-[#8B95A1]'}`}>{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[16px] font-medium text-[#333D4B]">{keyword}</span>
              </button>
            ))}
          </div>
        </section>
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
                className={`w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-gray-50 ${selectedSort === o ? 'text-[#3180F7] font-medium bg-[#EDF4FF]' : 'text-gray-700'}`}>
                <span>{o}</span>{selectedSort === o && <Check size={16} className="text-[#3180F7]" />}
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

  // 261031 새 톤 — 상품 상세·칩과 같은 결: 회색 트랙 + 흰 알약 탭 · 파란 체크 동그라미 · 회색 칸 · 모서리 8 칩 · 바닥 초기화/결과 보기
  const tabs: { key: FilterTab; label: string; hasValue: boolean }[] = [
    { key: 'region', label: '지역', hasValue: selectedRegions.length > 0 },
    { key: 'price', label: '가격', hasValue: priceMin != null || priceMax != null },
    { key: 'booking', label: '예약방법', hasValue: selectedBooking !== '전체' },
  ];
  const tabIdx = Math.max(0, tabs.findIndex((t) => t.key === activeTab));

  const transform = `translateY(${open ? dragOffset : 800}px)`;

  const resetAll = () => {
    setSelectedRegions([]);
    setPriceMin(null);
    setPriceMax(null);
    setSelectedBooking('전체');
  };

  // 체크 동그라미 — 켤 때 톡 튀며 체크가 그려지고, 끌 때 살짝 움츠렸다 돌아온다(globals .chk-dot)
  const checkDot = (on: boolean) => (
    <span key={String(on)} className={`chk-dot flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${on ? 'is-on bg-[#2F6FE4]' : 'is-off border-2 border-[#E5E8EB]'}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={on ? '#fff' : '#D1D6DB'} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
  );

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
        className="absolute bottom-0 left-0 right-0 mx-auto flex max-w-[640px] flex-col rounded-t-[28px] bg-white lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:max-w-md lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[28px]"
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
        {/* 손잡이 — 110px 넘게 끌어내리면 닫힌다 */}
        <div
          className="flex shrink-0 cursor-grab justify-center pb-2 pt-3 active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="h-1 w-9 rounded-full bg-[#E5E8EB]" />
        </div>

        {/* 탭 — 회색 트랙 위 흰 알약이 미끄러진다 */}
        <div className="shrink-0 px-5 pb-3 pt-1">
          <div className="relative flex rounded-[12px] bg-[#F2F4F6] p-1">
            <span
              aria-hidden
              className="absolute bottom-1 top-1 rounded-[10px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-transform duration-300"
              style={{ left: 4, width: `calc((100% - 8px) / ${tabs.length})`, transform: `translateX(${tabIdx * 100}%)`, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
            {tabs.map((t) => {
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`relative z-[1] flex h-10 flex-1 items-center justify-center gap-1 text-[15.5px] transition-colors ${isActive ? 'font-bold text-[#191F28]' : 'font-semibold text-[#8B95A1]'}`}
                >
                  {t.label}
                  {t.hasValue && <span className="h-1.5 w-1.5 rounded-full bg-[#3180F7]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 본문 — 탭에 따라 바뀐다 */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {/* ----- 지역 ----- */}
          {activeTab === 'region' && (
            <div className="flex h-full overflow-hidden">
              <ProvinceDial provinces={provinceKeys} active={activeProvince} onChange={setActiveProvince} marked={(prov) => selectedRegions.some((r) => r.split(' ')[0] === prov)} />
              <div className="flex-1 overflow-y-auto px-5">
                <button type="button" onClick={onLocate} className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[12px] bg-[#EFF5FE] text-[15px] font-bold text-[#2F6FE4] transition-all active:scale-[0.98]">
                  <MonoIcon name="pin-location" size={17} color="#2F6FE4" />
                  {locating ? '위치 찾는 중…' : '현재 위치로 설정'}
                </button>
                {(PROVINCES[activeProvince] ?? []).map((district) => {
                  const fullKey = district === '전체' ? activeProvince : `${activeProvince} ${district}`;
                  const isChecked = selectedRegions.includes(fullKey);
                  const label = district === '전체' ? `${activeProvince} 전체` : district;
                  return (
                    <button key={district} type="button" onClick={() => toggleRegion(fullKey)} className="flex w-full items-center gap-3 py-3.5 text-left">
                      {checkDot(isChecked)}
                      <span className={`text-[17px] ${isChecked ? 'font-semibold text-[#2F6FE4]' : 'text-[#333D4B]'}`}>{label}</span>
                    </button>
                  );
                })}
                <div className="h-4" />
              </div>
            </div>
          )}

          {/* ----- 가격 ----- 최소·최대 칸 + 미리 정한 칩(다시 누르면 해제) */}
          {activeTab === 'price' && (
            <div className="h-full overflow-y-auto px-5 pt-3">
              <div className="flex flex-col gap-2">
                <PriceScrubField label="최소" value={priceMin} onChange={setPriceMin} placeholder="0" />
                <PriceScrubField label="최대" value={priceMax} onChange={setPriceMax} placeholder="제한 없음" />
                <p className="px-1 text-[13px] text-[#B0B8C1]">칸을 꾹 누른 채 좌우로 밀면 5천 원씩 바뀌어요</p>
              </div>
            </div>
          )}

          {/* ----- 예약방법 ----- 하나만 */}
          {activeTab === 'booking' && (
            <div className="h-full overflow-y-auto px-5">
              {bookingMethods.map((m) => {
                const isChecked = selectedBooking === m;
                return (
                  <button key={m} type="button" onClick={() => setSelectedBooking(m)} className="flex w-full items-center gap-3 py-3.5 text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={BOOKING_ICONS[m]} alt="" width={22} height={22} className="shrink-0" />
                    <span className={`min-w-0 flex-1 text-[17px] transition-colors ${isChecked ? 'font-semibold text-[#2F6FE4]' : 'text-[#333D4B]'}`}>{m}</span>
                    {checkDot(isChecked)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 바닥 — 초기화 · 결과 보기(고르는 즉시 반영되고, 여기서는 닫기만) */}
        <div className="relative flex shrink-0 gap-2 bg-white px-5 pt-2" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 16px)' }}>
          {/* 선 대신 위로 흰 그라데이션 — 목록이 버튼 밑으로 녹아든다 */}
          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-gradient-to-b from-white/0 to-white" />
          <button type="button" onClick={resetAll} className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#F2F4F6] text-[17px] font-bold text-[#4E5968] transition-all active:scale-[0.98]">
            초기화
          </button>
          <button type="button" onClick={requestClose} className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98]">
            결과 보기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** 지역 시·도 다이얼 — 가운데(초점) 줄이 가장 진하고 크며, 멀어질수록 흐려지고 작아지고 살짝 눕는다(휠 피커).
 *  굴리다 멈추면 가운데 줄이 골라지고, 줄을 누르면 그 줄이 가운데로 굴러온다. 위아래 여백으로 첫·끝 줄도 가운데에 설 수 있다. */
function ProvinceDial({ provinces, active, onChange, marked }: { provinces: string[]; active: string; onChange: (p: string) => void; marked: (p: string) => boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ROW = 52;

  // 줄마다 가운데와의 거리로 투명도·크기·기울기·흐림을 바로 칠한다(렌더 없이)
  const paint = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const mid = el.scrollTop + el.clientHeight / 2;
    el.querySelectorAll<HTMLElement>('[data-dial-row]').forEach((row) => {
      const c = row.offsetTop + row.offsetHeight / 2;
      const d = Math.min(Math.abs(c - mid) / ROW, 4);
      row.style.opacity = String(Math.max(0.28, 1 - d * 0.22));
      row.style.transform = `perspective(400px) rotateX(${Math.max(-50, Math.min(50, ((mid - c) / ROW) * 14))}deg) scale(${1 - d * 0.07})`;
      row.style.filter = d > 0.6 ? `blur(${Math.min(1.6, (d - 0.6) * 0.7)}px)` : 'none';
    });
  }, []);

  // 고른 줄을 가운데로
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const i = provinces.indexOf(active);
    if (i < 0) return;
    const top = i * ROW;
    if (Math.abs(el.scrollTop - top) > 2) el.scrollTo({ top, behavior: 'smooth' });
    paint();
  }, [active, provinces, paint]);

  const onScroll = () => {
    paint();
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.max(0, Math.min(provinces.length - 1, Math.round(el.scrollTop / ROW)));
      if (provinces[i] !== active) {
        onChange(provinces[i]);
        navigator.vibrate?.(4);
      }
    }, 140);
  };

  return (
    <div className="relative w-[112px] shrink-0 bg-[#F9FAFB]">
      {/* 초점 줄 — 흰 알약 */}
      <span aria-hidden className="pointer-events-none absolute inset-x-2 top-1/2 h-[44px] -translate-y-1/2 rounded-[12px] bg-white shadow-[0_1px_6px_rgba(0,0,0,0.05)]" />
      <div
        ref={ref}
        onScroll={onScroll}
        className="relative h-full snap-y snap-mandatory overflow-y-auto hide-scrollbar"
      >
        {/* 위 여백 — 칸 높이의 반(첫 줄도 가운데에 선다) */}
        <div aria-hidden style={{ height: `calc(50% - ${ROW / 2}px)` }} />
        {provinces.map((prov) => {
          const on = prov === active;
          return (
            <button
              key={prov}
              data-dial-row
              type="button"
              onClick={() => onChange(prov)}
              className={`flex w-full snap-center items-center justify-center gap-1.5 text-[16.5px] transition-colors duration-200 ${on ? 'font-bold text-[#191F28]' : 'text-[#6B7684]'}`}
              style={{ height: ROW, transformOrigin: 'center', willChange: 'transform, opacity' }}
            >
              {prov}
              {marked(prov) && <span className="h-1.5 w-1.5 rounded-full bg-[#3180F7]" />}
            </button>
          );
        })}
        <div aria-hidden style={{ height: `calc(50% - ${ROW / 2}px)` }} />
      </div>
    </div>
  );
}

/** 가격 칸 — 누르면 숫자 입력, 꾹(0.35초) 누른 채 좌우로 밀면 5천 원씩 오르내린다(10px = 한 칸).
 *  밀기 중엔 칸이 연파랑으로 바뀌고 좌우 화살표가 보이며, 한 칸 바뀔 때마다 짧은 진동(지원 기기만). */
function PriceScrubField({ label, value, onChange, placeholder }: { label: string; value: number | null; onChange: (n: number | null) => void; placeholder: string }) {
  const [scrubbing, setScrubbing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const press = useRef<{ x: number; y: number; base: number; timer: ReturnType<typeof setTimeout> | null; active: boolean; last: number } | null>(null);

  const end = () => {
    if (press.current?.timer) clearTimeout(press.current.timer);
    const wasActive = press.current?.active;
    press.current = null;
    if (wasActive) setScrubbing(false);
    return wasActive;
  };

  return (
    <label
      className={`relative flex h-14 select-none items-center rounded-[14px] px-4 transition-all duration-200 ${scrubbing ? 'scale-[1.02] bg-[#EFF5FE] shadow-[0_0_0_2px_#2F6FE4_inset]' : 'bg-[#F2F4F6] focus-within:bg-[#EDEFF2]'}`}
      style={{ touchAction: 'pan-y', WebkitTouchCallout: 'none' }}
      onPointerDown={(e) => {
        end();
        const st = { x: e.clientX, y: e.clientY, base: value ?? 0, timer: null as ReturnType<typeof setTimeout> | null, active: false, last: 0 };
        st.timer = setTimeout(() => {
          st.active = true;
          setScrubbing(true);
          inputRef.current?.blur();
          navigator.vibrate?.(8);
        }, 350);
        press.current = st;
      }}
      onPointerMove={(e) => {
        const st = press.current;
        if (!st) return;
        if (!st.active) {
          // 꾹 누르기 전에 움직이면(스크롤 등) 밀기 취소
          if (Math.abs(e.clientX - st.x) > 8 || Math.abs(e.clientY - st.y) > 8) end();
          return;
        }
        e.preventDefault();
        const steps = Math.round((e.clientX - st.x) / 10);
        if (steps === st.last) return;
        st.last = steps;
        const next = Math.max(0, Math.min(PRICE_CAP, st.base + steps * PRICE_STEP));
        onChange(next === 0 && label === '최대' ? null : next);
        navigator.vibrate?.(3);
      }}
      onPointerUp={(e) => { if (end()) e.preventDefault(); }}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className={`mr-3 shrink-0 text-[15px] transition-colors ${scrubbing ? 'font-semibold text-[#2F6FE4]' : 'text-[#8B95A1]'}`}>{label}</span>
      {scrubbing && <ChevronLeft size={18} strokeWidth={2.4} className="scrub-hint-l shrink-0 text-[#2F6FE4]" />}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={value == null ? '' : value.toLocaleString()}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '');
          onChange(digits ? Number(digits) : null);
        }}
        placeholder={placeholder}
        readOnly={scrubbing}
        className={`min-w-0 flex-1 bg-transparent text-right text-[17px] font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-[#B0B8C1] ${scrubbing ? 'text-[#2F6FE4]' : 'text-[#191F28]'}`}
      />
      <span className={`ml-1.5 text-[16px] ${scrubbing ? 'text-[#2F6FE4]' : 'text-[#333D4B]'}`}>원</span>
      {scrubbing && <ChevronRight size={18} strokeWidth={2.4} className="scrub-hint-r ml-1 shrink-0 text-[#2F6FE4]" />}
    </label>
  );
}

/* ===================== List page filter section =====================
   Specialty category tabs (전체 + 치과/소아과/...) with sliding underline +
   slide-on-switch animation. Below: filter chips row (지역/시술/가격/예약방법/
   병원정보) + sub-row for the 앱결제 quick toggle and 추천순 sort. */
// 카테고리·검색 결과 거르기 — 최신 결(261029): 지역·가격·예약방법·앱결제 = 회색 칩(고르면 파랑), 아래 줄 = 상품 수 · 정렬.
//  진료과 고르기는 머리 햄버거 → 전체 카테고리 화면(AllCategoriesSheet)으로 옮겼다.
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
  setSelectedSort,
  onOpenRegion,
  onOpenPrice,
  onOpenBooking,
  count,
}: {
  categories: { id: string; name: string; icon?: string }[];
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
  setSelectedSort: (s: string) => void;
  count: number;
}) {
  const isAppPay = selectedBooking === '앱결제';
  const [sortOpen, setSortOpen] = useState(false);

  // 칩 — 상품 상세 순위 알약 결(261031): 모서리 8 · 회색 면 · 고르면 연파랑 면 + 파랑 글자
  const chip = (active: boolean) =>
    `inline-flex h-9 shrink-0 items-center gap-0.5 whitespace-nowrap rounded-[8px] pl-3 pr-2 text-[14.5px] font-semibold tracking-[-0.2px] transition-all active:scale-[0.97] ${
      active ? 'bg-[#EFF5FE] text-[#2F6FE4]' : 'bg-[#F2F4F6] text-[#333D4B] active:bg-[#E5E8EB]'
    }`;
  const caret = (active: boolean) => <ChevronDown size={16} strokeWidth={2.4} className={active ? 'text-[#2F6FE4]' : 'text-[#8B95A1]'} />;
  const regionOn = selectedRegions.length > 0;
  const bookingOn = selectedBooking !== '전체' && !isAppPay;

  return (
    <div className="bg-white">
      {/* 거르기 칩 — 지역 · 가격 · 예약방법 · 앱결제 */}
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar px-4 pb-1 pt-1">
        <button type="button" onClick={onOpenRegion} className={chip(regionOn)}>
          {regionOn ? regionLabel : '지역'}
          {caret(regionOn)}
        </button>
        <button type="button" onClick={onOpenPrice} className={chip(priceActive)}>
          {priceLabel}
          {caret(priceActive)}
        </button>
        <button type="button" onClick={onOpenBooking} className={chip(bookingOn)}>
          {bookingOn ? selectedBooking : '예약방법'}
          {caret(bookingOn)}
        </button>
        <button type="button" onClick={() => setSelectedBooking(isAppPay ? '전체' : '앱결제')} aria-pressed={isAppPay} className={`${chip(isAppPay)} !gap-1 !px-3`}>
          <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full transition-colors ${isAppPay ? 'bg-[#2F6FE4]' : 'border-[1.6px] border-[#C9CED6]'}`}>
            {isAppPay && <Check size={12} strokeWidth={3.4} className="text-white" />}
          </span>
          앱결제
        </button>
      </div>

      {/* 상품 수 · 정렬 */}
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <p className="text-[15px] text-[#6B7684]">
          상품 <b className="font-bold tabular-nums text-[#191F28]">{count}</b>개
        </p>
        {/* 정렬 — 프리티풀 툴팁 메뉴(.pop-menu: 작게 시작해 커지고 항목은 오른쪽→왼쪽 촤라락) */}
        <div className="relative">
          <button type="button" onClick={() => setSortOpen(v => !v)} aria-expanded={sortOpen} aria-haspopup="menu" className="flex items-center gap-0.5 text-[14.5px] font-semibold text-[#4E5968] transition-opacity active:opacity-60">
            {selectedSort}
            <ChevronDown size={16} strokeWidth={2.4} className="text-[#8B95A1] transition-transform duration-200" style={{ transform: sortOpen ? 'rotate(180deg)' : undefined }} />
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
              <div className="pop-menu absolute right-0 top-full z-50 mt-2 w-max min-w-[188px] overflow-hidden py-2" style={{ transformOrigin: 'calc(100% - 24px) 0' }} role="menu">
                {sortOptions.map((o, i) => {
                  const on = o === selectedSort;
                  return (
                    <button
                      key={o}
                      type="button"
                      role="menuitemradio"
                      aria-checked={on}
                      onClick={() => { setSelectedSort(o); setSortOpen(false); }}
                      className="pop-menu-item flex w-full items-center gap-3 py-[9px] pl-5 pr-6 text-left"
                      style={{ animationDelay: `${0.07 + i * 0.035}s` }}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                        {on && <Check size={20} strokeWidth={2.6} className="text-[#3180F7]" />}
                      </span>
                      <span className={`text-[17px] leading-[24px] ${on ? 'font-semibold text-[#191F28]' : 'text-[#333D4B]'}`}>{o}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
