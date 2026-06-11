'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Save, X, Megaphone } from 'lucide-react';
import { useStore } from '@/store';
import { PageHeader, SearchInput, EmptyState, PrimaryCTA } from '@/components/admin/ui';

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
    <div className="space-y-6">
      <PageHeader
        title="검색 추천 상품"
        subtitle='검색 화면 "인기검색어" 상단의 "추천(AD)" 슬롯에 노출할 상품을 선택합니다.'
        right={
          <PrimaryCTA onClick={handleSave} disabled={!dirty || saving}>
            {saving ? '저장 중…' : '저장'}
          </PrimaryCTA>
        }
      />

      {(productsError || promoError) && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <AlertCircle size={14} /> 데이터를 가져오지 못했어요
          </div>
          {productsError && <div className="text-[12px]">· {productsError}</div>}
          {promoError && <div className="text-[12px]">· {promoError}</div>}
        </div>
      )}

      {/* Current selection card */}
      <section>
        <div className="flex items-end justify-between mb-3 px-1">
          <h2 className="text-[17px] font-bold text-[#191F28] tracking-tight">현재 노출 중</h2>
          {selectedId && (
            <button
              onClick={() => setSelectedId(null)}
              className="inline-flex items-center gap-1 h-7 px-2.5 text-[12px] font-semibold text-[#4E5968] bg-[#F2F4F6] rounded-md hover:bg-[#E5E8EB]"
            >
              해제
            </button>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
          {display ? (
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center justify-center rounded-md flex-shrink-0"
                style={{ background: '#E5F1FF', color: '#3182F6', fontSize: 12, fontWeight: 700, height: 28, padding: '0 10px' }}
              >
                추천
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-[#191F28] truncate">{display.name}</p>
                <p className="text-[12px] text-[#8B95A1] truncate mt-0.5">{display.sub}</p>
              </div>
              <span className="text-[12px] font-medium text-[#C9CDD2]">AD</span>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-10 h-10 mx-auto bg-[#F2F4F6] rounded-full flex items-center justify-center mb-2">
                <Megaphone size={16} className="text-[#8B95A1]" />
              </div>
              <p className="text-[13px] text-[#8B95A1]">선택된 상품이 없어요. 아래에서 선택해 주세요.</p>
            </div>
          )}
        </div>
      </section>

      {/* Product picker */}
      <section>
        <div className="flex items-end justify-between mb-3 px-1">
          <h2 className="text-[17px] font-bold text-[#191F28] tracking-tight">상품 선택</h2>
          <span className="text-[12px] text-[#8B95A1]">
            {loading ? '불러오는 중…' : `${filtered.length} / ${products.length}개`}
          </span>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
          <div className="border-b border-[#F2F4F6] p-3">
            <SearchInput value={search} onChange={setSearch} placeholder="상품명, 병원명, 카테고리 검색" width={undefined as any} />
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="px-5 py-10 text-center text-[13px] text-[#8B95A1]">불러오는 중…</div>
            ) : products.length === 0 ? (
              <EmptyState title="등록된 상품이 없어요" hint="상품 관리에서 등록한 뒤 다시 시도해 주세요." />
            ) : filtered.length === 0 ? (
              <div className="px-5 py-10 text-center text-[13px] text-[#8B95A1]">검색 결과가 없어요</div>
            ) : (
              filtered.map((p, i) => {
                const isSelected = selectedId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors"
                    style={{
                      background: isSelected ? '#E5F1FF' : 'transparent',
                      borderBottom: i === filtered.length - 1 ? 'none' : '1px solid #F2F4F6',
                    }}
                  >
                    <span
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border"
                      style={{
                        background: isSelected ? '#3182F6' : '#FFFFFF',
                        borderColor: isSelected ? '#3182F6' : '#C9CDD2',
                      }}
                    >
                      {isSelected && <Check size={12} className="text-white" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#191F28] truncate">{p.name || '(이름 없음)'}</p>
                      <p className="text-[12px] text-[#8B95A1] truncate mt-0.5">
                        {p.hospital || '병원 미지정'} · {p.category || '카테고리 미지정'}
                      </p>
                    </div>
                    <div className="text-[13px] font-semibold text-[#4E5968] flex-shrink-0">
                      {p.discountPrice ? `${p.discountPrice.toLocaleString('ko-KR')}원` : '-'}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
