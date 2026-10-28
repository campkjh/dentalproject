'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Megaphone, Save, Search as SearchIc } from 'lucide-react';
import { useStore } from '@/store';
import { PageHeader, SearchInput, EmptyState, PrimaryCTA, SectionCard, StatusBadge, LoadingRows, Toolbar, Count } from '@/components/admin/ui';

type AdminProduct = {
  id: string;
  name: string;
  hospital: string;
  category: string;
  discountPrice: number;
};

export default function AdminSearchPromoPage() {
  const showAlert = useStore((s) => s.showAlert);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTitleFallback, setSelectedTitleFallback] = useState<string | null>(null);
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [productsRes, promoRes] = await Promise.all([
          fetch('/api/admin/products', { cache: 'no-store' }),
          fetch('/api/admin/search-promo', { cache: 'no-store' }),
        ]);
        if (!cancelled) {
          if (productsRes.ok) {
            const data = await productsRes.json();
            setProducts(Array.isArray(data.products) ? data.products : []);
          } else {
            const data = await productsRes.json().catch(() => ({}));
            setProductsError(data?.error ?? `상품 목록 불러오기 실패 (HTTP ${productsRes.status})`);
          }
          if (promoRes.ok) {
            const data = await promoRes.json();
            setSelectedId(data?.promo?.productId ?? null);
            setOriginalId(data?.promo?.productId ?? null);
            setSelectedTitleFallback(data?.promo?.title ?? null);
          } else {
            const data = await promoRes.json().catch(() => ({}));
            setPromoError(data?.error ?? `현재 추천 상품 불러오기 실패 (HTTP ${promoRes.status})`);
          }
        }
      } catch (err) {
        if (!cancelled) setProductsError(err instanceof Error ? err.message : '네트워크 오류');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.hospital.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  const selectedProduct = products.find((p) => p.id === selectedId) ?? null;
  const display = selectedId
    ? selectedProduct
      ? { name: selectedProduct.name, sub: `${selectedProduct.hospital} · ${selectedProduct.category}` }
      : selectedTitleFallback
        ? { name: selectedTitleFallback, sub: '목록에 없는 상품 (비활성/삭제 가능성)' }
        : { name: `상품 ID: ${selectedId.slice(0, 8)}`, sub: '상세 정보를 불러올 수 없어요' }
    : null;
  const dirty = selectedId !== originalId;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/search-promo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showAlert(data?.error ?? '저장에 실패했어요.');
        return;
      }
      setOriginalId(selectedId);
      const picked = products.find((p) => p.id === selectedId);
      if (picked) setSelectedTitleFallback(picked.name);
      showAlert('저장 완료', '검색 화면에 즉시 반영됩니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-stack">
      <PageHeader
        right={
          <PrimaryCTA onClick={handleSave} disabled={!dirty || saving}>
            <Save size={16} /> {saving ? '저장 중…' : '저장'}
          </PrimaryCTA>
        }
      />

      {(productsError || promoError) && (
        <div className="adm-note red">
          <p className="flex items-center gap-2"><AlertCircle size={16} /> 데이터를 가져오지 못했어요</p>
          {productsError && <p className="font-medium">· {productsError}</p>}
          {promoError && <p className="font-medium">· {promoError}</p>}
        </div>
      )}

      {/* 현재 노출 중 */}
      <SectionCard
        title="현재 노출 중"
        sub='검색 화면 "인기검색어" 위 "추천(AD)" 칸에 보여요'
        action={selectedId ? (
          <button type="button" className="adm-btn sm" onClick={() => setSelectedId(null)}>해제</button>
        ) : undefined}
      >
        {display ? (
          <div className="flex items-center gap-3 px-6 pb-6">
            <StatusBadge tone="blue">추천</StatusBadge>
            <div className="flex-1 min-w-0">
              <p className="adm-cell-main truncate">{display.name}</p>
              <p className="adm-cell-sub truncate">{display.sub}</p>
            </div>
            <span className="adm-cell dim">AD</span>
          </div>
        ) : (
          <EmptyState icon={<Megaphone size={22} />} title="선택된 상품이 없어요" hint="아래에서 선택해 주세요." />
        )}
      </SectionCard>

      {/* 상품 고르기 */}
      <div className="adm-listcard">
        <div className="adm-filter">
          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="상품명, 병원명, 카테고리" width={320} />
            <span className="grow" />
            {!loading && <Count n={filtered.length} unit={`개 / ${products.length}개`} />}
          </Toolbar>
        </div>
        <div className="max-h-[60vh] overflow-y-auto" role="radiogroup" aria-label="추천 상품">
          {loading ? (
            <LoadingRows />
          ) : products.length === 0 ? (
            <EmptyState icon={<Megaphone size={22} />} title="등록된 상품이 없어요" hint="상품 관리에서 등록한 뒤 다시 시도해 주세요." />
          ) : filtered.length === 0 ? (
            <EmptyState icon={<SearchIc size={22} />} title="검색 결과가 없어요" hint="다른 검색어로 찾아보세요." />
          ) : (
            filtered.map((p) => {
              const isSelected = selectedId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedId(p.id)}
                  className={`adm-grow clickable flex w-full items-center gap-3 text-left ${isSelected ? '!bg-[#E8F3FF]' : ''}`}
                >
                  {/* 라디오 점(.adm-radio-dot 결) */}
                  <span
                    aria-hidden="true"
                    className="relative h-5 w-5 flex-shrink-0 rounded-full bg-white transition-shadow"
                    style={{ boxShadow: `inset 0 0 0 2px ${isSelected ? '#3182F6' : '#D1D6DB'}` }}
                  >
                    {isSelected && <span className="absolute inset-[5px] rounded-full bg-[#3182F6]" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="adm-cell-main truncate">{p.name || '(이름 없음)'}</p>
                    <p className="adm-cell-sub truncate">
                      {p.hospital || '병원 미지정'} · {p.category || '카테고리 미지정'}
                    </p>
                  </div>
                  <div className="adm-num flex-shrink-0">
                    {p.discountPrice ? `${p.discountPrice.toLocaleString('ko-KR')}원` : '-'}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
