'use client';

import { useEffect, useState } from 'react';
import { FileText, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/store';
import { PageHeader, PrimaryCTA, EmptyState } from '@/components/admin/ui';

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
    <div className="space-y-6">
      <PageHeader
        title="약관 관리"
        subtitle="약관 본문을 편집합니다. 저장 즉시 사용자 페이지에 반영됩니다."
        right={active && (
          <PrimaryCTA onClick={save} disabled={busy}>
            {savedFlash ? '저장됨' : busy ? '저장 중…' : '저장'}
          </PrimaryCTA>
        )}
      />

      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700 flex items-center gap-2">
          <AlertCircle size={14} /> {loadError}
        </div>
      )}

      <div className="rounded-2xl border border-[#D6E8FF] bg-[#F1F7FF] p-4 text-[12px] text-[#1B64DA] flex items-start gap-2">
        <FileText size={14} className="mt-0.5 flex-shrink-0" />
        <div>
          약관 본문은 Vercel Blob (<code className="bg-white/70 px-1 py-0.5 rounded text-[11px] font-mono">terms/index.json</code>)에 저장됩니다.
          본문이 비어있는 약관은 기존 정적 페이지 콘텐츠가 그대로 표시돼요.
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-6">
        {/* Sidebar */}
        <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden h-fit">
          <div className="px-4 py-3 border-b border-[#F2F4F6] text-[11px] font-semibold text-[#8B95A1] uppercase tracking-wider">
            약관 목록
          </div>
          {loading ? (
            <div className="px-4 py-6 text-[13px] text-[#8B95A1] text-center">불러오는 중…</div>
          ) : (
            terms.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{
                  background: activeId === t.id ? '#E5F1FF' : 'transparent',
                  borderBottom: i === terms.length - 1 ? 'none' : '1px solid #F2F4F6',
                }}
                onMouseEnter={(e) => {
                  if (activeId !== t.id) e.currentTarget.style.background = '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  if (activeId !== t.id) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  className="text-[14px] font-semibold truncate"
                  style={{ color: activeId === t.id ? '#3182F6' : '#191F28' }}
                >
                  {t.title}
                </div>
                <div className="text-[11px] text-[#8B95A1] mt-0.5 flex items-center gap-1.5">
                  <span
                    className="inline-flex h-[18px] px-1.5 rounded font-semibold items-center"
                    style={{ background: t.content ? '#E8F8EE' : '#F2F4F6', color: t.content ? '#1AB554' : '#8B95A1' }}
                  >
                    {t.content ? '편집됨' : '기본'}
                  </span>
                  {t.updatedAt && <span>{new Date(t.updatedAt).toLocaleDateString('ko-KR')}</span>}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Editor */}
        {active ? (
          <div className="bg-white rounded-2xl border border-[#E5E8EB] p-6">
            <div className="mb-5">
              <p className="text-[11px] font-mono text-[#8B95A1] mb-1.5">{active.id}</p>
              <input
                value={active.title}
                onChange={(e) => updateActive({ title: e.target.value })}
                className="text-[20px] font-bold tracking-tight text-[#191F28] border-b-2 border-transparent hover:border-[#E5E8EB] focus:border-[#3182F6] focus:outline-none w-full pb-1 transition-colors"
              />
            </div>

            <label className="block text-[12px] font-semibold text-[#4E5968] mb-2">본문</label>
            <textarea
              value={active.content}
              onChange={(e) => updateActive({ content: e.target.value })}
              rows={22}
              placeholder="약관 본문을 입력하세요. 비워두면 기존 정적 페이지가 표시됩니다."
              className="w-full px-4 py-3 border border-[#E5E8EB] rounded-[10px] text-[13px] font-mono text-[#191F28] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/15 resize-y leading-relaxed transition-all"
            />

            {active.updatedAt && (
              <p className="text-[12px] text-[#8B95A1] mt-3">
                마지막 수정: {new Date(active.updatedAt).toLocaleString('ko-KR')}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E5E8EB]">
            <EmptyState icon={<FileText size={20} className="text-[#8B95A1]" />} title="왼쪽에서 약관을 선택해 주세요" />
          </div>
        )}
      </div>
    </div>
  );
}
