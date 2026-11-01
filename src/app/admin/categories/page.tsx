'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Image as ImageIcon, ArrowLeft, LayoutGrid } from 'lucide-react';
import { useStore } from '@/store';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { useDragSort } from '@/components/admin/useDragSort';
import {
  PageHeader, StatCard, StatRow, PillButton, EmptyState, LoadingRows, Switch, SectionCard,
} from '@/components/admin/ui';

type Category = {
  id: string;
  name: string;
  icon: string | null;
  popular: boolean;
  sort_order: number;
};

type ViewMode = 'list' | 'form';

// 손잡이 ⠿(점 6개)
function GripIcon() {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="4" r="1.8" /><circle cx="10" cy="4" r="1.8" />
      <circle cx="4" cy="10" r="1.8" /><circle cx="10" cy="10" r="1.8" />
      <circle cx="4" cy="16" r="1.8" /><circle cx="10" cy="16" r="1.8" />
    </svg>
  );
}

function FieldRow({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="adm-field">
      <label className="adm-label">
        {label} {required && <span style={{ color: '#F04452' }}>*</span>}
      </label>
      {children}
      {hint && <p className="adm-hint">{hint}</p>}
    </div>
  );
}

export default function AdminCategoriesPage() {
  const showAlert = useStore((s) => s.showAlert);
  const showConfirm = useStore((s) => s.showConfirm);
  const showToast = useStore((s) => s.showToast);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<ViewMode>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ id: '', name: '', icon: '', popular: false });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);


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
    setForm({ id: '', name: '', icon: '', popular: false });
    setFormError(null);
    setMode('form');
  };

  const openEdit = (cat: Category) => {
    setEditId(cat.id);
    setForm({ id: cat.id, name: cat.name, icon: cat.icon ?? '', popular: cat.popular });
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
          // 새 카테고리는 맨 뒤에 붙는다(순서는 목록에서 끌어서 바꾼다)
          ...(editId ? {} : { sort_order: categories.reduce((m, c) => Math.max(m, c.sort_order), 0) + 10 }),
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

  // 노출 순서 — 끌어서 놓으면 바로 저장(실패하면 되돌림)
  const saveOrder = useCallback(async (next: Category[]) => {
    setCategories(next.map((c, i) => ({ ...c, sort_order: (i + 1) * 10 })));
    const res = await fetch('/api/admin/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: next.map((c) => c.id) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showAlert(data?.error ?? '순서를 저장하지 못했어요.');
      void loadCategories(); // 저장된 순서로 되돌린다
      return;
    }
    if (Array.isArray(data.categories)) setCategories(data.categories);
    showToast('노출 순서를 바꿨어요');
  }, [showAlert, showToast]);

  const sort = useDragSort(categories, saveOrder);

  // ---------- 추가·수정 폼 ----------
  if (mode === 'form') {
    return (
      <div className="adm-stack max-w-[760px]">
        {/* 폼 머리 — 뒤로 · 제목 · 저장 */}
        <section className="adm-card">
          <div className="adm-card-head">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" className="adm-btn icon" aria-label="목록으로" onClick={() => setMode('list')}>
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <h2 className="adm-card-title">{editId ? '카테고리 수정' : '카테고리 추가하기'}</h2>
                <p className="adm-card-sub">카테고리 정보</p>
              </div>
            </div>
            <button
              type="button"
              className="adm-btn primary"
              onClick={handleSave}
              disabled={busy || !form.id.trim() || !form.name.trim()}
            >
              {busy ? '저장 중…' : editId ? '수정하기' : '추가하기'}
            </button>
          </div>

          {formError && <p className="adm-note red mb-4">{formError}</p>}

          <FieldRow label="카테고리 ID" required hint="영문 소문자/하이픈만 사용 (예: dental, korean-medicine). 수정 불가">
            <input
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              placeholder="예: dental"
              disabled={!!editId}
              className="adm-input font-mono"
            />
          </FieldRow>
          <FieldRow label="카테고리 이름" required>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: 치과, 성형외과"
              className="adm-input"
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
        </section>

        {/* 노출 설정 */}
        <section className="adm-card">
          <div className="adm-card-head">
            <h2 className="adm-card-title">노출 설정</h2>
          </div>
          <FieldRow label="인기 카테고리로 노출" hint="홈 화면의 인기 카테고리 영역에 표시됩니다.">
            <Switch
              checked={form.popular}
              onChange={(v) => setForm((f) => ({ ...f, popular: v }))}
              ariaLabel="인기 카테고리로 노출"
            />
          </FieldRow>
        </section>

        {/* 연결된 상품 */}
        <SectionCard title="연결된 상품">
          <EmptyState icon={<ImageIcon size={22} />} title="연결된 상품이 없어요" hint="상품 관리에서 카테고리를 연결할 수 있어요." />
        </SectionCard>
      </div>
    );
  }

  // ---------- 목록 ----------
  const GRID = 'grid grid-cols-[26px_60px_1fr_1fr_64px_100px_auto] gap-4 items-center';

  return (
    <div className="adm-stack">
      <PageHeader
        right={
          <button type="button" className="adm-btn primary" onClick={openCreate}>
            <Plus size={16} /> 카테고리 추가
          </button>
        }
      />

      {loadError && <p className="adm-note red">{loadError}</p>}

      <StatRow cols={2}>
        <StatCard label="전체 카테고리" value={categories.length} suffix="개" />
        <StatCard label="인기 카테고리" value={categories.filter((c) => c.popular).length} suffix="개" accent="#4A82EE" />
      </StatRow>

      <div className="adm-listcard">
        {!loading && categories.length > 1 && (
          <p className="adm-sort-hint">
            <GripIcon /> 손잡이를 끌어서 놓으면 앱에 보이는 순서가 바로 바뀌어요
          </p>
        )}
        {loading ? (
          <LoadingRows />
        ) : categories.length === 0 ? (
          <EmptyState icon={<LayoutGrid size={22} />} title="카테고리가 없어요" hint="오른쪽 위 '카테고리 추가'로 시작해 보세요." />
        ) : (
          <>
            <div className={`${GRID} adm-ghead`}>
              <div />
              <div>아이콘</div>
              <div>ID</div>
              <div>이름</div>
              <div>순서</div>
              <div>인기</div>
              <div className="text-right">관리</div>
            </div>
            {categories.map((cat, i) => (
              <div
                key={cat.id}
                ref={sort.rowRef(cat.id)}
                className={`${GRID} adm-grow ${sort.rowClass(cat.id)}`}
                style={sort.rowStyle(cat.id, i)}
              >
                <button type="button" className="adm-grip" aria-label={`${cat.name} 순서 바꾸기(위아래 화살표로도 옮겨요)`} {...sort.handleProps(i)}>
                  <GripIcon />
                </button>
                <div className="adm-thumb flex items-center justify-center">
                  {cat.icon ? (
                    <img
                      src={cat.icon}
                      alt={cat.name}
                      className="w-6 h-6"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <ImageIcon size={16} color="#B0B8C1" />
                  )}
                </div>
                <div className="adm-mono truncate">{cat.id}</div>
                <div className="adm-cell-main">{cat.name}</div>
                <div className="adm-num">{i + 1}</div>
                <div>
                  <Switch checked={cat.popular} onChange={() => togglePopular(cat)} ariaLabel={`${cat.name} 인기 노출`} />
                </div>
                <div className="adm-actions">
                  <PillButton tone="blue" onClick={() => openEdit(cat)}>수정</PillButton>
                  <PillButton tone="red" onClick={() => handleDelete(cat)}>삭제</PillButton>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
