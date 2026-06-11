'use client';

import { useEffect, useMemo, useState } from 'react';
import { Megaphone, Plus, Edit3, Trash2, Eye, X, AlertCircle, Send, Bell } from 'lucide-react';
import { useStore } from '@/store';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { PageHeader, SearchInput, StatCard, PillButton, StatusBadge, EmptyState, PrimaryCTA, SecondaryCTA } from '@/components/admin/ui';

type Announcement = {
  id: string;
  title: string;
  content: string | null;
  published_at: string;
  created_at: string;
};

const PAGE_SIZE = 20;

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}
function toLocalInput(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
function fromLocalInput(value: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function AdminNotificationsPage() {
  const showAlert = useStore((s) => s.showAlert);
  const showConfirm = useStore((s) => s.showConfirm);

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewItem, setViewItem] = useState<Announcement | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', publishedAt: '' });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [pushConfigured, setPushConfigured] = useState<boolean | null>(null);
  const [showPush, setShowPush] = useState(false);
  const [pushForm, setPushForm] = useState({ title: '', body: '' });
  const [pushBusy, setPushBusy] = useState(false);
  const [pushResult, setPushResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);

  const inputCls = 'w-full h-12 px-4 border border-[#E5E8EB] rounded-[10px] text-[14px] text-[#191F28] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/15 bg-white transition-all';

  const refreshPushStatus = async () => {
    try {
      const r = await fetch('/api/admin/push', { cache: 'no-store' });
      if (r.ok) { const data = await r.json(); setPushConfigured(!!data.configured); }
    } catch { setPushConfigured(false); }
  };
  useEffect(() => { void refreshPushStatus(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.announcements ?? []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return items;
    return items.filter((a) => a.title.includes(q) || (a.content ?? '').includes(q));
  }, [items, search]);

  const { visibleCount, sentinelRef } = useInfiniteScroll(filtered.length, PAGE_SIZE);
  const pageData = filtered.slice(0, visibleCount);

  const now = Date.now();
  const scheduledCount = items.filter((a) => new Date(a.published_at).getTime() > now).length;
  const publishedCount = items.length - scheduledCount;

  const openCreate = () => {
    setEditId(null);
    setForm({ title: '', content: '', publishedAt: '' });
    setFormError(null);
    setShowForm(true);
  };
  const openEdit = (a: Announcement) => {
    setEditId(a.id);
    setForm({ title: a.title, content: a.content ?? '', publishedAt: toLocalInput(a.published_at) });
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError('제목은 필수입니다.'); return; }
    setBusy(true);
    setFormError(null);
    try {
      const payload = {
        ...(editId ? { id: editId } : {}),
        title: form.title.trim(),
        content: form.content,
        ...(form.publishedAt ? { published_at: fromLocalInput(form.publishedAt) } : {}),
      };
      const res = await fetch('/api/admin/announcements', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data?.error ?? '저장에 실패했습니다.');
        return;
      }
      setShowForm(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (a: Announcement) => {
    showConfirm(
      '공지 삭제',
      `"${a.title}" 공지를 삭제할까요?`,
      async () => {
        const res = await fetch('/api/admin/announcements', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: a.id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          showAlert(data?.error ?? '삭제 실패');
          return;
        }
        await load();
      },
      { confirmText: '삭제', cancelText: '취소' }
    );
  };

  const handleSendPush = async () => {
    if (!pushForm.title.trim() || !pushForm.body.trim()) return;
    setPushBusy(true);
    setPushResult(null);
    try {
      const res = await fetch('/api/admin/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: pushForm.title.trim(), body: pushForm.body.trim(), target: 'all' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPushResult({ sent: 0, failed: 0, errors: [data?.error ?? '발송 실패'] });
        return;
      }
      setPushResult({ sent: data.sent ?? 0, failed: data.failed ?? 0, errors: data.errors ?? [] });
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="알림 · 공지"
        subtitle="앱 내 공지사항을 작성하고 푸시알림을 발송합니다."
        right={
          <>
            {pushConfigured && (
              <SecondaryCTA onClick={() => { setShowPush(true); setPushForm({ title: '', body: '' }); setPushResult(null); }}>
                푸시 발송
              </SecondaryCTA>
            )}
            <PrimaryCTA onClick={openCreate}>새 공지 작성</PrimaryCTA>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="전체 공지" value={items.length} suffix="개" />
        <StatCard label="게시 중" value={publishedCount} suffix="개" accent="#1AB554" />
        <StatCard label="예약" value={scheduledCount} suffix="개" accent="#3182F6" />
      </div>

      <div className="flex justify-end">
        <SearchInput value={search} onChange={setSearch} placeholder="제목, 내용 검색" />
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        {loading ? (
          <div className="px-5 py-16 text-center text-[13px] text-[#8B95A1]">불러오는 중…</div>
        ) : pageData.length === 0 ? (
          <EmptyState icon={<Bell size={20} className="text-[#8B95A1]" />} title="공지가 없어요" hint='우측 상단 "새 공지 작성"으로 시작해 보세요.' />
        ) : (
          <>
            <div className="grid grid-cols-[48px_1fr_180px_100px_auto] gap-4 px-5 py-3 bg-[#FAFBFC] border-b border-[#F2F4F6] text-[11px] font-semibold text-[#8B95A1] uppercase tracking-wider">
              <div>번호</div>
              <div>제목</div>
              <div>게시일시</div>
              <div>상태</div>
              <div className="text-right">관리</div>
            </div>
            {pageData.map((a, i) => {
              const scheduled = new Date(a.published_at).getTime() > Date.now();
              return (
                <div
                  key={a.id}
                  className="grid grid-cols-[48px_1fr_180px_100px_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors"
                  style={{ borderBottom: i === pageData.length - 1 ? 'none' : '1px solid #F2F4F6' }}
                >
                  <div className="text-[12px] text-[#8B95A1]">{i + 1}</div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#191F28] truncate">{a.title}</p>
                    {a.content && <p className="text-[12px] text-[#8B95A1] mt-0.5 truncate">{a.content.slice(0, 80)}</p>}
                  </div>
                  <div className="text-[12px] text-[#8B95A1]">{formatDateTime(a.published_at)}</div>
                  <div>
                    <StatusBadge tone={scheduled ? 'blue' : 'green'}>{scheduled ? '예약' : '게시중'}</StatusBadge>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <PillButton tone="blue" onClick={() => setViewItem(a)}>
                      미리보기
                    </PillButton>
                    <PillButton tone="gray" onClick={() => openEdit(a)}>
                      수정
                    </PillButton>
                    <PillButton tone="red" onClick={() => handleDelete(a)}>
                      삭제
                    </PillButton>
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

      {pushConfigured === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Megaphone size={16} className="text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-[12px] text-amber-900">
            푸시알림 발송 기능은 비활성 상태입니다. Vercel 환경변수에{' '}
            <code className="bg-amber-100 px-1 rounded">FCM_PROJECT_ID</code>,{' '}
            <code className="bg-amber-100 px-1 rounded">FCM_CLIENT_EMAIL</code>,{' '}
            <code className="bg-amber-100 px-1 rounded">FCM_PRIVATE_KEY</code>를 추가해 주세요.
          </div>
          <button onClick={refreshPushStatus} className="flex-shrink-0 h-8 px-3 bg-white border border-amber-300 rounded-lg text-[11px] font-semibold text-amber-800 hover:bg-amber-100">
            재확인
          </button>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-xl p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold text-[#191F28]">{editId ? '공지 수정' : '새 공지 작성'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 -m-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-[#8B95A1]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">제목 *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="공지 제목" className={inputCls} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">내용</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={7}
                  placeholder="공지 본문을 입력하세요"
                  className="w-full px-4 py-3 border border-[#E5E8EB] rounded-[10px] text-[14px] text-[#191F28] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/15 bg-white resize-y leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">게시 일시</label>
                <input type="datetime-local" value={form.publishedAt} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })} className={inputCls} />
                <p className="text-[11px] text-[#8B95A1] mt-1">비워두면 즉시 게시돼요.</p>
              </div>
            </div>
            {formError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{formError}</div>
            )}
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowForm(false)} disabled={busy} className="flex-1 h-11 border border-[#E5E8EB] rounded-[10px] text-[14px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB] disabled:opacity-50">취소</button>
              <button onClick={handleSave} disabled={busy} className="flex-1 h-11 bg-[#3182F6] text-white rounded-[10px] text-[14px] font-semibold hover:bg-[#1B64DA] disabled:opacity-50">
                {busy ? '저장 중…' : editId ? '수정' : '게시'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Push modal */}
      {showPush && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setShowPush(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold text-[#191F28]">푸시알림 발송</h3>
              <button onClick={() => setShowPush(false)} className="p-1 -m-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-[#8B95A1]" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">제목 *</label>
                <input value={pushForm.title} onChange={(e) => setPushForm({ ...pushForm, title: e.target.value })} placeholder="앱 푸시 제목" className={inputCls} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">본문 *</label>
                <textarea
                  value={pushForm.body}
                  onChange={(e) => setPushForm({ ...pushForm, body: e.target.value })}
                  rows={4}
                  placeholder="앱 푸시 본문"
                  className="w-full px-4 py-3 border border-[#E5E8EB] rounded-[10px] text-[14px] text-[#191F28] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/15 bg-white resize-y"
                />
              </div>
            </div>
            <p className="text-[12px] text-[#8B95A1] mt-3">전체 회원의 등록 디바이스로 발송됩니다.</p>
            {pushResult && (
              <div
                className="mt-3 rounded-lg border px-3 py-2 text-[12px]"
                style={
                  pushResult.failed === 0
                    ? { borderColor: '#A7E5C0', background: '#E8F8EE', color: '#0D7C3A' }
                    : { borderColor: '#FED38A', background: '#FFF4E5', color: '#9A5C00' }
                }
              >
                <p className="font-semibold">성공 {pushResult.sent}건 · 실패 {pushResult.failed}건</p>
                {pushResult.errors.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 space-y-0.5">
                    {pushResult.errors.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowPush(false)} disabled={pushBusy} className="flex-1 h-11 border border-[#E5E8EB] rounded-[10px] text-[14px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB] disabled:opacity-50">닫기</button>
              <button onClick={handleSendPush} disabled={pushBusy || !pushForm.title.trim() || !pushForm.body.trim()} className="flex-1 h-11 bg-[#3182F6] text-white rounded-[10px] text-[14px] font-semibold hover:bg-[#1B64DA] disabled:opacity-50">
                {pushBusy ? '발송 중…' : '발송'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setViewItem(null)}>
          <div className="bg-white rounded-3xl w-full max-w-xl p-7 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[18px] font-bold text-[#191F28]">{viewItem.title}</h3>
              <button onClick={() => setViewItem(null)} className="p-1 -m-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-[#8B95A1]" />
              </button>
            </div>
            <p className="text-[12px] text-[#8B95A1] mb-4">{formatDateTime(viewItem.published_at)}</p>
            <div className="text-[14px] text-[#191F28] whitespace-pre-wrap leading-relaxed bg-[#FAFBFC] rounded-xl p-4 border border-[#F2F4F6]">
              {viewItem.content || '(내용 없음)'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
