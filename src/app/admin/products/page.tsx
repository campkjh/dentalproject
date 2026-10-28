'use client';

import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { Star, Package, Check, Info } from 'lucide-react';
import {
  PageHeader, SearchInput, StatCard, StatRow, PillButton, StatusBadge, EmptyState, FilterChips,
  AdminListCard, Toolbar, Count, TableFoot, LoadingRows,
} from '@/components/admin/ui';

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

  const GRID = 'grid grid-cols-[36px_1.8fr_1.1fr_100px_140px_140px_100px_auto] gap-4 items-center';
  const allSel = pageData.length > 0 && pageData.every((p) => selected.has(p.id));

  // 고르기 네모(파랑 채움)
  const checkBox = (on: boolean, onClick: () => void, label: string) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      className="w-5 h-5 rounded-md border flex items-center justify-center"
      style={{ background: on ? '#3182F6' : '#FFFFFF', borderColor: on ? '#3182F6' : '#C9CDD2' }}
    >
      {on && <Check size={13} color="#fff" strokeWidth={3} />}
    </button>
  );

  return (
    <div className="adm-stack">
      <PageHeader
        right={
          <button
            type="button"
            className="adm-btn"
            onClick={() => showAlert('상품 등록', '상품 등록은 병원(파트너) 계정에서 진행합니다. 관리자는 승인·비활성화·삭제만 수행할 수 있어요.')}
          >
            <Info size={16} /> 상품 등록 안내
          </button>
        }
      />

      <StatRow cols={4}>
        <StatCard label="전체 상품" value={counts.total} suffix="개" />
        <StatCard label="활성" value={counts.active} suffix="개" accent="#1AB554" />
        <StatCard label="비활성" value={counts.inactive} suffix="개" accent="#8B95A1" />
        <StatCard label="검수대기" value={counts.pending} suffix="개" accent="#F59E0B" />
      </StatRow>

      {selected.size > 0 && (
        <div className="adm-selbar">
          <span className="text-[14px] font-semibold">{selected.size}개 선택됨</span>
          <span className="grow" />
          <button type="button" className="adm-btn sm warn" onClick={() => handleBulkAction('deactivate')}>
            일괄 비활성화
          </button>
          <button type="button" className="adm-btn sm danger-solid" onClick={() => handleBulkAction('delete')}>
            일괄 삭제
          </button>
        </div>
      )}

      <AdminListCard
        filter={
          <>
            <Toolbar>
              <SearchInput value={search} onChange={setSearch} placeholder="상품명, 병원명 검색" width={300} />
              <span className="grow" />
              <Count n={filtered.length} unit="개" />
            </Toolbar>
            <Toolbar>
              <FilterChips
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={categories.slice(0, 8).map((c) => ({ value: c, label: c }))}
                ariaLabel="카테고리"
              />
            </Toolbar>
          </>
        }
      >
        {loading ? (
          <LoadingRows />
        ) : pageData.length === 0 ? (
          <EmptyState icon={<Package size={22} />} title="표시할 상품이 없어요" hint="검색어나 거르기를 바꿔 보세요." />
        ) : (
          <div className="adm-tscroll">
            <div className="adm-tscroll-in">
              <div className={`${GRID} adm-ghead`}>
                {checkBox(allSel, () => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (allSel) pageData.forEach((p) => next.delete(p.id));
                    else pageData.forEach((p) => next.add(p.id));
                    return next;
                  });
                }, '이 페이지 모두 고르기')}
                <div>상품</div>
                <div>병원</div>
                <div>카테고리</div>
                <div>가격</div>
                <div>평점</div>
                <div>상태</div>
                <div className="text-right">관리</div>
              </div>
              {pageData.map((p) => {
                const isSel = selected.has(p.id);
                const st = statusOf(p);
                const isPendingApproval = p.approvalStatus?.startsWith('pending_');
                const discount = p.originalPrice > 0 ? Math.max(0, Math.round((1 - p.discountPrice / p.originalPrice) * 100)) : 0;
                return (
                  <div key={p.id} className={`${GRID} adm-grow`}>
                    {checkBox(isSel, () => setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                      return next;
                    }), `${p.name} 고르기`)}
                    <div className="min-w-0">
                      <span className="adm-cell-main">{p.name}</span>
                      <span className="adm-cell-sub adm-mono">{p.id.slice(0, 8)}</span>
                    </div>
                    <div className="adm-cell">{p.hospital}</div>
                    <div><StatusBadge tone="blue">{p.category}</StatusBadge></div>
                    <div className="min-w-0">
                      <span className="adm-num block">{formatPrice(p.discountPrice)}</span>
                      {p.originalPrice > p.discountPrice && (
                        <span className="adm-cell-sub">
                          <span className="line-through">{formatPrice(p.originalPrice)}</span>{' '}
                          <span className="font-semibold" style={{ color: '#F04452' }}>{discount}%</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={13} fill="#F46A00" stroke="#F46A00" />
                      <span className="adm-num">{p.rating.toFixed(1)}</span>
                      <span className="adm-cell dim">({p.reviews})</span>
                    </div>
                    <div><StatusBadge tone={st.tone}>{st.label}</StatusBadge></div>
                    <div className="adm-actions">
                      {isPendingApproval ? (
                        <>
                          <PillButton tone="green" disabled={busyProductId === p.id} onClick={() => handleApproval(p, 'approve')}>
                            승인
                          </PillButton>
                          <PillButton tone="red" disabled={busyProductId === p.id} onClick={() => handleApproval(p, 'reject')}>
                            반려
                          </PillButton>
                          <a href={`/product/${p.id}`} target="_blank" rel="noreferrer" className="adm-btn sm weak">상세</a>
                        </>
                      ) : (
                        <>
                          <a href={`/product/${p.id}`} target="_blank" rel="noreferrer" className="adm-btn sm weak">상세</a>
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
            </div>
          </div>
        )}
        {!loading && <TableFoot total={filtered.length} shown={visibleCount} sentinelRef={sentinelRef} />}
      </AdminListCard>
    </div>
  );
}
