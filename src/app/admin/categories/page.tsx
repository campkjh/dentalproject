'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { useStore } from '@/store';
import { ImageUploader } from '@/components/admin/ImageUploader';

type Category = {
  id: string;
  name: string;
  icon: string | null;
  popular: boolean;
  sort_order: number;
};

type ViewMode = 'list' | 'form';

function PillButton({
  children, onClick, tone = 'gray',
}: { children: React.ReactNode; onClick?: () => void; tone?: 'gray' | 'blue' | 'red' }) {
  const styles: Record<string, string> = {
    gray: 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]',
    blue: 'bg-[#E5F1FF] text-[#3182F6] hover:bg-[#D6E8FF]',
    red: 'bg-[#FEECEC] text-[#E54848] hover:bg-[#FCDCDC]',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center h-[28px] px-[10px] rounded-md text-[12px] font-semibold transition-colors ${styles[tone]}`}
    >
      {children}
    </button>
  );
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-3 px-1">
        <h2 className="text-[17px] font-bold text-[#191F28] tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E8EB] p-6">{children}</div>
    </section>
  );
}

function FieldRow({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <label className="block text-[13px] font-semibold text-[#4E5968] mb-2">
        {label} {required && <span className="text-[#E54848]">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[12px] text-[#8B95A1]">{hint}</p>}
    </div>
  );
}

export default function AdminCategoriesPage() {
  const showAlert = useStore((s) => s.showAlert);
  const showConfirm = useStore((s) => s.showConfirm);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<ViewMode>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ id: '', name: '', icon: '', popular: false, sortOrder: 0 });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const inputCls =
    'w-full h-12 px-4 border border-[#E5E8EB] rounded-[10px] text-[14px] text-[#191F28] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/15 bg-white transition-all placeholder:text-[#C9CDD2]';

  const loadCategories = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoadError(data?.error ?? `카테고리 불러오기 실패 (HTTP ${res.status})`);
        return;
      }
      const data = await res.json();
      setCategories(data.categories ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadCategories(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ id: '', name: '', icon: '', popular: false, sortOrder: 0 });
    setFormError(null);
    setMode('form');
  };

  const openEdit = (cat: Category) => {
    setEditId(cat.id);
    setForm({ id: cat.id, name: cat.name, icon: cat.icon ?? '', popular: cat.popular, sortOrder: cat.sort_order });
    setFormError(null);
    setMode('form');
  };

  const handleSave = async () => {
    if (!form.id.trim() || !form.name.trim()) {
      setFormError('ID와 이름은 필수입니다.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch('/api/admin/categories', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id.trim(),
          name: form.name.trim(),
          icon: form.icon.trim() || `/icons/${form.id.trim()}.svg`,
          popular: form.popular,
          sort_order: form.sortOrder,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data?.error ?? '저장에 실패했습니다.');
        return;
      }
      setMode('list');
      await loadCategories();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (cat: Category) => {
    showConfirm(
      '카테고리 삭제',
      `"${cat.name}" 카테고리를 삭제하시겠습니까? 연결된 상품의 카테고리가 빈 값이 됩니다.`,
      async () => {
        const res = await fetch('/api/admin/categories', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cat.id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          showAlert(data?.error ?? '삭제 실패');
          return;
        }
        await loadCategories();
      },
      { confirmText: '삭제', cancelText: '취소' }
    );
  };

  const togglePopular = async (cat: Category) => {
    // optimistic update
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, popular: !c.popular } : c)));
    const res = await fetch('/api/admin/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cat.id, popular: !cat.popular }),
    });
    if (!res.ok) {
      // revert on failure
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, popular: cat.popular } : c)));
      const data = await res.json().catch(() => ({}));
      showAlert(data?.error ?? '인기 설정 변경에 실패했어요.');
    }
  };

  // ---------- FORM VIEW ----------
  if (mode === 'form') {
    return (
      <div className="max-w-[760px] mx-auto space-y-6">
        {/* Header — like 카테고리 추가하기 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('list')}
              className="p-2 -ml-2 hover:bg-[#F2F4F6] rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-[#191F28]" />
            </button>
            <h1 className="text-[22px] font-bold tracking-tight text-[#191F28]">
              {editId ? '카테고리 수정' : '카테고리 추가하기'}
            </h1>
          </div>
          <button
            onClick={handleSave}
            disabled={busy || !form.id.trim() || !form.name.trim()}
            className="inline-flex items-center gap-1.5 h-10 px-5 bg-[#3182F6] text-white rounded-[10px] text-[14px] font-semibold hover:bg-[#1B64DA] disabled:opacity-50 transition-colors"
          >
            {busy ? '저장 중…' : editId ? '수정하기' : '추가하기'}
          </button>
        </div>

        {formError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{formError}</div>
        )}

        {/* Section: Category info */}
        <SectionCard title="카테고리 정보">
          <FieldRow label="카테고리 ID" required hint="영문 소문자/하이픈만 사용 (예: dental, korean-medicine). 수정 불가">
            <input
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              placeholder="예: dental"
              disabled={!!editId}
              className={`${inputCls} font-mono disabled:bg-[#F9FAFB] disabled:text-[#8B95A1]`}
            />
          </FieldRow>
          <FieldRow label="카테고리 이름" required>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: 치과, 성형외과"
              className={inputCls}
            />
          </FieldRow>
          <FieldRow label="아이콘 이미지" hint="권장 사이즈 64×64. 업로드하지 않으면 기본 아이콘이 사용됩니다.">
            <div className="max-w-[160px]">
              <ImageUploader
                value={form.icon}
                onChange={(url) => setForm({ ...form, icon: url })}
                folder="category-icons"
                aspect="1/1"
                placeholder="아이콘 업로드"
              />
            </div>
          </FieldRow>
        </SectionCard>

        {/* Section: 노출 설정 */}
        <SectionCard title="노출 설정">
          <FieldRow label="인기 카테고리로 노출" hint="홈 화면의 인기 카테고리 영역에 표시됩니다.">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, popular: !f.popular }))}
              className="relative inline-flex items-center w-12 h-7 rounded-full transition-colors"
              style={{ background: form.popular ? '#3182F6' : '#E5E8EB' }}
            >
              <span
                className="absolute w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{ left: form.popular ? '24px' : '4px' }}
              />
            </button>
          </FieldRow>
          <FieldRow label="정렬 순서" hint="숫자가 작을수록 위에 표시됩니다.">
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
              className={`${inputCls} max-w-[160px]`}
            />
          </FieldRow>
        </SectionCard>

        {/* Section: Connected products — like 연결된 상품 */}
        <SectionCard title="연결된 상품">
          <div className="text-center py-10">
            <div className="w-12 h-12 mx-auto bg-[#F2F4F6] rounded-2xl flex items-center justify-center mb-3">
              <ImageIcon size={20} className="text-[#C9CDD2]" />
            </div>
            <p className="text-[14px] font-semibold text-[#4E5968]">연결된 상품이 없어요</p>
            <p className="text-[12px] text-[#8B95A1] mt-1">상품 관리에서 카테고리를 연결할 수 있어요.</p>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ---------- LIST VIEW ----------
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#191F28]">카테고리 관리</h1>
          <p className="text-[13px] text-[#8B95A1] mt-1.5">검색·상품 분류에 사용되는 카테고리를 관리합니다.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 h-10 px-4 bg-[#3182F6] text-white rounded-[10px] text-[13px] font-semibold hover:bg-[#1B64DA]"
        >
          카테고리 추가
        </button>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{loadError}</div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-[#E5E8EB] px-5 py-4">
          <p className="text-[12px] font-medium text-[#8B95A1]">전체 카테고리</p>
          <p className="text-[24px] font-bold tracking-tight text-[#191F28] mt-1">
            {categories.length.toLocaleString()}
            <span className="text-[13px] font-medium text-[#8B95A1] ml-1">개</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E8EB] px-5 py-4">
          <p className="text-[12px] font-medium text-[#8B95A1]">인기 카테고리</p>
          <p className="text-[24px] font-bold tracking-tight text-[#3182F6] mt-1">
            {categories.filter((c) => c.popular).length.toLocaleString()}
            <span className="text-[13px] font-medium text-[#8B95A1] ml-1">개</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        {loading ? (
          <div className="px-5 py-16 text-center text-[13px] text-[#8B95A1]">불러오는 중…</div>
        ) : categories.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-[14px] font-semibold text-[#4E5968]">카테고리가 없어요</p>
            <p className="text-[12px] text-[#8B95A1] mt-1">우측 상단의 "카테고리 추가"로 시작해 보세요.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[60px_1fr_1fr_80px_100px_auto] gap-4 px-5 py-3 bg-[#FAFBFC] border-b border-[#F2F4F6] text-[11px] font-semibold text-[#8B95A1] uppercase tracking-wider">
              <div>아이콘</div>
              <div>ID</div>
              <div>이름</div>
              <div>정렬</div>
              <div>인기</div>
              <div className="text-right">관리</div>
            </div>
            {categories.map((cat, i) => (
              <div
                key={cat.id}
                className="grid grid-cols-[60px_1fr_1fr_80px_100px_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors"
                style={{ borderBottom: i === categories.length - 1 ? 'none' : '1px solid #F2F4F6' }}
              >
                <div className="w-10 h-10 bg-[#F2F4F6] rounded-lg flex items-center justify-center">
                  {cat.icon ? (
                    <img
                      src={cat.icon}
                      alt={cat.name}
                      className="w-6 h-6"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <ImageIcon size={14} className="text-[#C9CDD2]" />
                  )}
                </div>
                <div className="text-[12px] text-[#8B95A1] font-mono truncate">{cat.id}</div>
                <div className="text-[14px] font-semibold text-[#191F28] truncate">{cat.name}</div>
                <div className="text-[13px] text-[#4E5968]">{cat.sort_order}</div>
                <div>
                  <button
                    onClick={() => togglePopular(cat)}
                    className="inline-flex items-center h-[24px] px-2.5 rounded-md text-[11px] font-semibold transition-colors"
                    style={
                      cat.popular
                        ? { background: '#E5F1FF', color: '#3182F6' }
                        : { background: '#F2F4F6', color: '#8B95A1' }
                    }
                  >
                    {cat.popular ? '인기' : '일반'}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <PillButton tone="blue" onClick={() => openEdit(cat)}>
                    수정
                  </PillButton>
                  <PillButton tone="red" onClick={() => handleDelete(cat)}>
                    삭제
                  </PillButton>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
