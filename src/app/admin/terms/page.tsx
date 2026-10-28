'use client';

import { useEffect, useState } from 'react';
import { FileText, AlertCircle, Save } from 'lucide-react';
import { useStore } from '@/store';
import { PageHeader, PrimaryCTA, EmptyState, StatusBadge, LoadingRows } from '@/components/admin/ui';

type TermsDoc = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
};

export default function AdminTermsPage() {
  const showAlert = useStore((s) => s.showAlert);
  const [terms, setTerms] = useState<TermsDoc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/terms', { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoadError(data?.error ?? `약관 불러오기 실패 (HTTP ${res.status})`);
        return;
      }
      const data = await res.json();
      setTerms(data.terms ?? []);
      if (!activeId && data.terms?.length) setActiveId(data.terms[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const active = terms.find((t) => t.id === activeId) ?? null;
  const updateActive = (patch: Partial<TermsDoc>) => {
    if (!active) return;
    setTerms((prev) => prev.map((t) => (t.id === active.id ? { ...t, ...patch } : t)));
  };

  const save = async () => {
    if (!active) return;
    setBusy(true);
    setSavedFlash(false);
    try {
      const res = await fetch('/api/admin/terms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: active.id, title: active.title, content: active.content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showAlert(data?.error ?? '저장 실패');
        return;
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-stack">
      <PageHeader
        right={active && (
          <PrimaryCTA onClick={save} disabled={busy}>
            <Save size={16} /> {savedFlash ? '저장됨' : busy ? '저장 중…' : '저장'}
          </PrimaryCTA>
        )}
      />

      {loadError && (
        <p className="adm-note red flex items-center gap-2">
          <AlertCircle size={16} /> {loadError}
        </p>
      )}

      <div className="adm-note blue flex items-start gap-2">
        <FileText size={16} className="mt-0.5 flex-shrink-0" />
        <div>
          약관 본문은 Vercel Blob(<code className="adm-mono">terms/index.json</code>)에 저장되고, 저장 즉시 사용자 페이지에 반영돼요.
          본문이 비어 있는 약관은 기존 정적 페이지 콘텐츠가 그대로 표시돼요.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
        {/* 약관 목록 */}
        <section className="adm-card flush h-fit">
          <div className="adm-card-head">
            <h2 className="adm-card-title">약관 목록</h2>
          </div>
          {loading ? (
            <LoadingRows rows={4} />
          ) : (
            terms.map((t) => {
              const on = activeId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={`adm-grow clickable block w-full text-left ${on ? '!bg-[#E8F3FF]' : ''}`}
                  aria-current={on ? 'true' : undefined}
                >
                  <div className={`adm-cell-main truncate ${on ? '!text-[#3182F6]' : ''}`}>{t.title}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <StatusBadge tone={t.content ? 'green' : 'gray'}>{t.content ? '편집됨' : '기본'}</StatusBadge>
                    {t.updatedAt && <span className="adm-cell dim">{new Date(t.updatedAt).toLocaleDateString('ko-KR')}</span>}
                  </div>
                </button>
              );
            })
          )}
        </section>

        {/* 편집 */}
        {active ? (
          <section className="adm-card">
            <div className="mb-5">
              <p className="adm-mono mb-1.5">{active.id}</p>
              <label className="adm-label" htmlFor="terms-title">제목</label>
              <input
                id="terms-title"
                value={active.title}
                onChange={(e) => updateActive({ title: e.target.value })}
                className="adm-input"
              />
            </div>

            <label className="adm-label" htmlFor="terms-body">본문</label>
            <textarea
              id="terms-body"
              value={active.content}
              onChange={(e) => updateActive({ content: e.target.value })}
              rows={22}
              placeholder="약관 본문을 입력하세요. 비워두면 기존 정적 페이지가 표시됩니다."
              className="adm-input adm-textarea font-mono !text-[14px]"
            />

            {active.updatedAt && (
              <p className="adm-hint">
                마지막 수정: {new Date(active.updatedAt).toLocaleString('ko-KR')}
              </p>
            )}
          </section>
        ) : (
          <section className="adm-card flush">
            <EmptyState icon={<FileText size={22} />} title="왼쪽에서 약관을 선택해 주세요" />
          </section>
        )}
      </div>
    </div>
  );
}
