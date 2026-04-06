'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Star,
  Eye,
  Ban,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
} from 'lucide-react';

// ---------- Types ----------
type ProductStatus = 'active' | 'inactive' | 'pending';

interface Product {
  id: number;
  name: string;
  hospital: string;
  category: string;
  originalPrice: number;
  discountPrice: number;
  rating: number;
  reviews: number;
  status: ProductStatus;
  createdAt: string;
}

// ---------- Mock Data ----------
const mockProducts: Product[] = [
  { id: 1, name: '원데이 치아미백 3회', hospital: '참포도나무치과의원', category: '치과', originalPrice: 90000, discountPrice: 55000, rating: 4.9, reviews: 328, status: 'active', createdAt: '2026-03-15' },
  { id: 2, name: '무삭제 라미네이트 1개', hospital: '레브치과의원', category: '치과', originalPrice: 950000, discountPrice: 759000, rating: 5.0, reviews: 214, status: 'active', createdAt: '2026-03-12' },
  { id: 3, name: '올타이트 리프팅 100샷', hospital: '온리프성형외과의원', category: '성형외과', originalPrice: 290000, discountPrice: 195900, rating: 4.8, reviews: 176, status: 'active', createdAt: '2026-03-10' },
  { id: 4, name: '프리미엄 스케일링', hospital: '아이디치과', category: '치과', originalPrice: 80000, discountPrice: 45000, rating: 4.7, reviews: 542, status: 'active', createdAt: '2026-03-08' },
  { id: 5, name: '인비절라인 교정 패키지', hospital: '바른이치과', category: '치과', originalPrice: 5500000, discountPrice: 4200000, rating: 4.9, reviews: 89, status: 'active', createdAt: '2026-02-28' },
  { id: 6, name: '보톡스 이마 + 미간', hospital: '에이블피부과', category: '피부과', originalPrice: 180000, discountPrice: 120000, rating: 4.6, reviews: 231, status: 'active', createdAt: '2026-02-25' },
  { id: 7, name: '라식 양안 수술', hospital: '밝은눈안과', category: '안과', originalPrice: 2200000, discountPrice: 1650000, rating: 4.8, reviews: 67, status: 'inactive', createdAt: '2026-02-20' },
  { id: 8, name: '임플란트 1개 (오스템)', hospital: '참포도나무치과의원', category: '치과', originalPrice: 1500000, discountPrice: 990000, rating: 4.9, reviews: 412, status: 'active', createdAt: '2026-02-18' },
  { id: 9, name: '필러 애교살 (쥬비덤)', hospital: '온리프성형외과의원', category: '성형외과', originalPrice: 350000, discountPrice: 245000, rating: 4.5, reviews: 198, status: 'pending', createdAt: '2026-04-05' },
  { id: 10, name: '레이저 토닝 10회', hospital: '에이블피부과', category: '피부과', originalPrice: 500000, discountPrice: 350000, rating: 4.7, reviews: 156, status: 'active', createdAt: '2026-01-30' },
  { id: 11, name: '디데이 치아미백 11', hospital: '레브치과의원', category: '치과', originalPrice: 1100000, discountPrice: 759000, rating: 4.8, reviews: 97, status: 'pending', createdAt: '2026-04-04' },
  { id: 12, name: '코필러 (레스틸렌)', hospital: '온리프성형외과의원', category: '성형외과', originalPrice: 280000, discountPrice: 195000, rating: 4.4, reviews: 83, status: 'inactive', createdAt: '2026-01-15' },
  { id: 13, name: '라섹 양안 수술', hospital: '밝은눈안과', category: '안과', originalPrice: 1800000, discountPrice: 1350000, rating: 4.9, reviews: 45, status: 'active', createdAt: '2026-01-10' },
];

const categories = ['전체', '치과', '성형외과', '피부과', '안과', '한의원', '내과'];

type SortKey = 'id' | 'name' | 'hospital' | 'category' | 'discountPrice' | 'rating' | 'reviews' | 'createdAt';
type SortDir = 'asc' | 'desc';

const statusConfig: Record<ProductStatus, { label: string; className: string }> = {
  active: { label: '활성', className: 'bg-green-100 text-green-700' },
  inactive: { label: '비활성', className: 'bg-gray-100 text-gray-600' },
  pending: { label: '검수대기', className: 'bg-yellow-100 text-yellow-700' },
};

function formatPrice(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

const PAGE_SIZE = 10;

export default function AdminProductsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkAction, setShowBulkAction] = useState<'deactivate' | 'delete' | null>(null);

  // ---- Filter & Sort ----
  const filtered = useMemo(() => {
    let list = [...mockProducts];
    if (categoryFilter !== '전체') list = list.filter((p) => p.category === categoryFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.hospital.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [search, categoryFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const totalCount = mockProducts.length;
  const activeCount = mockProducts.filter((p) => p.status === 'active').length;
  const inactiveCount = mockProducts.filter((p) => p.status === 'inactive').length;
  const pendingCount = mockProducts.filter((p) => p.status === 'pending').length;

  // ---- Handlers ----
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (pageData.every((p) => selected.has(p.id))) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageData.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        pageData.forEach((p) => next.add(p.id));
        return next;
      });
    }
  }

  const allPageSelected = pageData.length > 0 && pageData.every((p) => selected.has(p.id));

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown size={14} className="text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp size={14} className="text-[#7C3AED]" /> : <ChevronDown size={14} className="text-[#7C3AED]" />;
  }

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">상품 관리</h2>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:bg-[#6D28D9] transition-colors">
          <Plus size={16} /> 상품 등록
        </button>
      </div>

      {/* ---------- Stats ---------- */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '전체 상품', value: '856', color: 'text-gray-900' },
          { label: '활성 상품', value: '742', color: 'text-green-600' },
          { label: '비활성 상품', value: '89', color: 'text-gray-500' },
          { label: '검수대기', value: '25', color: 'text-yellow-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ---------- Filters ---------- */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[280px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="상품명 또는 병원명 검색..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/30"
            />
          </div>

          {/* Category */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED] bg-white"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ---------- Bulk Actions ---------- */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
          <span className="text-sm text-[#7C3AED] font-medium">{selected.size}개 선택됨</span>
          <button
            onClick={() => setShowBulkAction('deactivate')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <Ban size={14} /> 비활성화
          </button>
          <button
            onClick={() => setShowBulkAction('delete')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} /> 삭제
          </button>
        </div>
      )}

      {/* ---------- Table ---------- */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED]"
                  />
                </th>
                {(
                  [
                    ['id', '번호', 'w-16'],
                    ['name', '상품명', 'min-w-[200px]'],
                    ['hospital', '병원명', 'min-w-[160px]'],
                    ['category', '카테고리', 'w-24'],
                    ['discountPrice', '가격', 'w-36'],
                    ['rating', '평점', 'w-20'],
                    ['reviews', '리뷰수', 'w-20'],
                    [null, '상태', 'w-24'],
                    ['createdAt', '등록일', 'w-28'],
                    [null, '관리', 'w-36'],
                  ] as [SortKey | null, string, string][]
                ).map(([key, label, width]) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase ${width} ${key ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
                    onClick={() => key && handleSort(key)}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {key && <SortIcon col={key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageData.map((product) => {
                const discount = Math.round((1 - product.discountPrice / product.originalPrice) * 100);
                const st = statusConfig[product.status];
                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED]"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{product.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.hospital}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-1.5 py-0.5 bg-purple-50 text-[#7C3AED] text-xs font-medium rounded">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">{formatPrice(product.discountPrice)}</span>
                        <span className="text-xs text-gray-400 line-through">{formatPrice(product.originalPrice)}</span>
                      </div>
                      <span className="text-xs text-red-500 font-medium">{discount}% OFF</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-0.5 text-sm">
                        <Star size={12} fill="#FBBF24" stroke="#FBBF24" />
                        {product.rating}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.reviews.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{product.createdAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-gray-400 hover:text-[#7C3AED] hover:bg-purple-50 rounded-lg transition-colors" title="상세">
                          <Eye size={15} />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="비활성화">
                          <Ban size={15} />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="삭제">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400 text-sm">검색 결과가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ---------- Pagination ---------- */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            총 <span className="font-medium text-gray-900">{filtered.length}</span>개 중{' '}
            <span className="font-medium text-gray-900">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  n === page ? 'bg-[#7C3AED] text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Bulk Action Confirmation Modal ---------- */}
      {showBulkAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {showBulkAction === 'deactivate' ? '상품 비활성화' : '상품 삭제'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              선택한 <span className="font-medium text-gray-900">{selected.size}개</span> 상품을{' '}
              {showBulkAction === 'deactivate' ? '비활성화' : '삭제'}하시겠습니까?
              {showBulkAction === 'delete' && (
                <span className="block mt-1 text-red-500">이 작업은 되돌릴 수 없습니다.</span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkAction(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => { setSelected(new Set()); setShowBulkAction(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                  showBulkAction === 'deactivate' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {showBulkAction === 'deactivate' ? '비활성화' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
