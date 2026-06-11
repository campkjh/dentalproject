'use client';

import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { Star, Eye, Trash2, Ban, X, Package, Check, Info } from 'lucide-react';
import { PageHeader, SearchInput, StatCard, PillButton, StatusBadge, EmptyState } from '@/components/admin/ui';

type DbProductStatus = 'active' | 'paused' | 'removed' | 'pending';
type ProductApprovalStatus = 'approved' | 'pending_create' | 'pending_update' | 'pending_delete' | 'rejected';

interface Product {
  id: string;
  name: string;
  hospital: string;
  category: string;
  originalPrice: number;
  discountPrice: number;
  rating: number;
  reviews: number;
  status: DbProductStatus;
  approvalStatus: ProductApprovalStatus;
  pendingChanges?: Record<string, unknown> | null;
  createdAt: string;
}

const PAGE_SIZE = 20;

const approvalLabel: Record<ProductApprovalStatus, { label: string; tone: 'green' | 'orange' | 'blue' | 'red' | 'gray' }> = {
  approved: { label: '승인완료', tone: 'green' },
  pending_create: { label: '추가요청', tone: 'orange' },
  pending_update: { label: '수정요청', tone: 'blue' },
  pending_delete: { label: '삭제요청', tone: 'red' },
  rejected: { label: '반려', tone: 'gray' },
};
const dbStatusLabel: Record<DbProductStatus, { label: string; tone: 'green' | 'gray' | 'orange' }> = {
  active: { label: '활성', tone: 'green' },
  paused: { label: '비활성', tone: 'gray' },
  removed: { label: '삭제', tone: 'gray' },
  pending: { label: '검수대기', tone: 'orange' },
};

function statusOf(p: Product) {
  if (p.approvalStatus && p.approvalStatus !== 'approved') return approvalLabel[p.approvalStatus];
  return dbStatusLabel[p.status] ?? dbStatusLabel.paused;
}

function formatPrice(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export default function AdminProductsPage() {
  const showAlert = useStore((s) => s.showAlert);
  const showConfirm = useStore((s) => s.showConfirm);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('전체');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyProductId, setBusyProductId] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setProducts(data.products ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadProducts(); }, []);

  const categories = useMemo(
    () => ['전체', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))],
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = categoryFilter === '전체' || p.category === categoryFilter;
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.hospital.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, search, categoryFilter]);

  const { visibleCount, sentinelRef } = useInfiniteScroll(filtered.length, PAGE_SIZE);
  const pageData = filtered.slice(0, visibleCount);

  const counts = {
    total: products.length,
    active: products.filter((p) => p.status === 'active').length,
    inactive: products.filter((p) => p.status === 'paused' || p.status === 'removed').length,
    pending: products.filter((p) => p.approvalStatus?.startsWith('pending_')).length,
  };

  async function handleApproval(product: Product, action: 'approve' | 'reject') {
    setBusyProductId(product.id);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showAlert('처리 실패', data.error || '처리에 실패했어요.');
        return;
      }
      await loadProducts();
    } finally {
      setBusyProductId(null);
    }
  }

  const handleSingleAction = (p: Product, action: 'deactivate' | 'activate' | 'delete') => {
    const labels = { deactivate: '비활성화', activate: '활성화', delete: '삭제' };
    const targetLabel = labels[action];
    showConfirm(
      `상품 ${targetLabel}`,
      `"${p.name}"을(를) ${targetLabel}할까요?${action === 'delete' ? '\n되돌릴 수 없어요.' : ''}`,
      async () => {
        setBusyProductId(p.id);
        try {
          const method = action === 'delete' ? 'DELETE' : 'PATCH';
          const res = await fetch('/api/admin/products', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action === 'delete' ? { id: p.id } : { id: p.id, action }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showAlert('처리 실패', data.error || '실패');
            return;
          }
          await loadProducts();
        } finally {
          setBusyProductId(null);
        }
      },
      { confirmText: targetLabel, cancelText: '취소' }
    );
  };

  const handleBulkAction = (action: 'deactivate' | 'delete') => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const labels = { deactivate: '비활성화', delete: '삭제' };
    showConfirm(
      `${labels[action]}`,
      `선택한 ${ids.length}개 상품을 ${labels[action]}할까요?${action === 'delete' ? '\n되돌릴 수 없어요.' : ''}`,
      async () => {
        try {
          const res =
            action === 'delete'
              ? await fetch('/api/admin/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
              : await fetch('/api/admin/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, action: 'deactivate' }) });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showAlert('처리 실패', data.error || '실패');
            return;
          }
          setSelected(new Set());
          await loadProducts();
        } catch (err) {
          showAlert('처리 실패', err instanceof Error ? err.message : '네트워크 오류');
        }
      },
      { confirmText: labels[action], cancelText: '취소' }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="상품 관리"
        subtitle="병원이 등록한 상품을 승인하고 노출 상태를 관리합니다."
        right={
          <button
            type="button"
            onClick={() => showAlert('상품 등록', '상품 등록은 병원(파트너) 계정에서 진행합니다. 관리자는 승인·비활성화·삭제만 수행할 수 있어요.')}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-white border border-[#E5E8EB] rounded-[10px] text-[13px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB]"
          >
            <Info size={14} /> 상품 등록 안내
          </button>
        }
      />

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="전체 상품" value={counts.total} suffix="개" />
        <StatCard label="활성" value={counts.active} suffix="개" accent="#1AB554" />
        <StatCard label="비활성" value={counts.inactive} suffix="개" accent="#8B95A1" />
        <StatCard label="검수대기" value={counts.pending} suffix="개" accent="#F59E0B" />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.slice(0, 8).map((c) => {
            const active = categoryFilter === c;
            return (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className="h-9 px-3.5 rounded-full text-[13px] font-semibold transition-colors border"
                style={
                  active
                    ? { background: '#191F28', color: '#FFFFFF', borderColor: '#191F28' }
                    : { background: '#FFFFFF', color: '#4E5968', borderColor: '#E5E8EB' }
                }
              >
                {c}
              </button>
            );
          })}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="상품명, 병원명 검색" />
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-[#E5F1FF] border border-[#3182F6]/30 rounded-2xl px-4 py-3">
          <span className="text-[13px] text-[#3182F6] font-semibold">{selected.size}개 선택됨</span>
          <div className="flex items-center gap-2">
            <PillButton tone="orange" onClick={() => handleBulkAction('deactivate')}>
              일괄 비활성화
            </PillButton>
            <PillButton tone="red" onClick={() => handleBulkAction('delete')}>
              일괄 삭제
            </PillButton>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        {loading ? (
          <div className="px-5 py-16 text-center text-[13px] text-[#8B95A1]">불러오는 중…</div>
        ) : pageData.length === 0 ? (
          <EmptyState icon={<Package size={20} className="text-[#8B95A1]" />} title="표시할 상품이 없어요" hint="검색어나 필터를 변경해 보세요." />
        ) : (
          <>
            <div className="grid grid-cols-[36px_1.8fr_1.1fr_100px_140px_140px_100px_auto] gap-4 px-5 py-3 bg-[#FAFBFC] border-b border-[#F2F4F6] text-[11px] font-semibold text-[#8B95A1] uppercase tracking-wider">
              <button
                onClick={() => {
                  const allSel = pageData.every((p) => selected.has(p.id));
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (allSel) pageData.forEach((p) => next.delete(p.id));
                    else pageData.forEach((p) => next.add(p.id));
                    return next;
                  });
                }}
                className="w-5 h-5 rounded border flex items-center justify-center"
                style={{
                  background: pageData.every((p) => selected.has(p.id)) ? '#3182F6' : '#FFFFFF',
                  borderColor: pageData.every((p) => selected.has(p.id)) ? '#3182F6' : '#C9CDD2',
                }}
              >
                {pageData.every((p) => selected.has(p.id)) && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5L6.5 12L13 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <div>상품</div>
              <div>병원</div>
              <div>카테고리</div>
              <div>가격</div>
              <div>평점</div>
              <div>상태</div>
              <div className="text-right">관리</div>
            </div>
            {pageData.map((p, i) => {
              const isSel = selected.has(p.id);
              const st = statusOf(p);
              const isPendingApproval = p.approvalStatus?.startsWith('pending_');
              const discount = p.originalPrice > 0 ? Math.max(0, Math.round((1 - p.discountPrice / p.originalPrice) * 100)) : 0;
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[36px_1.8fr_1.1fr_100px_140px_140px_100px_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors"
                  style={{ borderBottom: i === pageData.length - 1 ? 'none' : '1px solid #F2F4F6' }}
                >
                  <button
                    onClick={() => setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                      return next;
                    })}
                    className="w-5 h-5 rounded border flex items-center justify-center"
                    style={{
                      background: isSel ? '#3182F6' : '#FFFFFF',
                      borderColor: isSel ? '#3182F6' : '#C9CDD2',
                    }}
                  >
                    {isSel && (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8.5L6.5 12L13 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#191F28] truncate">{p.name}</p>
                    <p className="text-[11px] text-[#8B95A1] mt-0.5 font-mono">{p.id.slice(0, 8)}</p>
                  </div>
                  <div className="text-[13px] text-[#4E5968] truncate">{p.hospital}</div>
                  <div>
                    <span className="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold bg-[#E5F1FF] text-[#3182F6]">
                      {p.category}
                    </span>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#191F28]">{formatPrice(p.discountPrice)}</p>
                    {p.originalPrice > p.discountPrice && (
                      <p className="text-[11px] text-[#8B95A1]">
                        <span className="line-through">{formatPrice(p.originalPrice)}</span>{' '}
                        <span className="text-[#E54848] font-semibold">{discount}%</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Star size={11} fill="#F59E0B" stroke="#F59E0B" />
                    <span className="text-[13px] font-semibold text-[#191F28]">{p.rating.toFixed(1)}</span>
                    <span className="text-[11px] text-[#8B95A1] ml-1">({p.reviews})</span>
                  </div>
                  <div><StatusBadge tone={st.tone}>{st.label}</StatusBadge></div>
                  <div className="flex items-center gap-1.5 justify-end">
                    {isPendingApproval ? (
                      <>
                        <PillButton tone="green" disabled={busyProductId === p.id} onClick={() => handleApproval(p, 'approve')}>
                          승인
                        </PillButton>
                        <PillButton tone="red" disabled={busyProductId === p.id} onClick={() => handleApproval(p, 'reject')}>
                          반려
                        </PillButton>
                        <a href={`/product/${p.id}`} target="_blank" rel="noreferrer">
                          <PillButton tone="blue">상세</PillButton>
                        </a>
                      </>
                    ) : (
                      <>
                        <a href={`/product/${p.id}`} target="_blank" rel="noreferrer">
                          <PillButton tone="blue">상세</PillButton>
                        </a>
                        <PillButton
                          tone="orange"
                          disabled={busyProductId === p.id}
                          onClick={() => handleSingleAction(p, p.status === 'active' ? 'deactivate' : 'activate')}
                        >
                          {p.status === 'active' ? '비활성' : '활성'}
                        </PillButton>
                        <PillButton tone="red" disabled={busyProductId === p.id} onClick={() => handleSingleAction(p, 'delete')}>
                          삭제
                        </PillButton>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div className="px-5 py-4 border-t border-[#F2F4F6]">
          <p className="text-[12px] text-[#8B95A1] text-center">
            전체 <span className="font-semibold text-[#191F28]">{filtered.length.toLocaleString()}</span>개 중{' '}
            <span className="font-semibold text-[#191F28]">{Math.min(visibleCount, filtered.length)}</span>개 표시
          </p>
          {visibleCount < filtered.length && (
            <div ref={sentinelRef} className="h-10 flex items-center justify-center text-[11px] text-[#8B95A1]">
              스크롤하면 더 불러옵니다…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
