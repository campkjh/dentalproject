'use client';

import { useEffect, useMemo, useState } from 'react';
import { Megaphone, Plus, Send, Bell } from 'lucide-react';
import { useStore } from '@/store';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import {
  PageHeader, SearchInput, StatCard, StatRow, PillButton, StatusBadge, EmptyState, PrimaryCTA, SecondaryCTA,
  AdminListCard, Toolbar, Count, TableFoot, LoadingRows, AdminModal,
} from '@/components/admin/ui';

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

  const GRID = 'grid grid-cols-[48px_1fr_180px_100px_auto] gap-4 items-center';

  return (
    <div className="adm-stack">
      <PageHeader
        right={
          <>
            {pushConfigured && (
              <SecondaryCTA onClick={() => { setShowPush(true); setPushForm({ title: '', body: '' }); setPushResult(null); }}>
                <Send size={16} /> 푸시 발송
              </SecondaryCTA>
            )}
            <PrimaryCTA onClick={openCreate}><Plus size={16} /> 새 공지 작성</PrimaryCTA>
          </>
        }
      />

      {pushConfigured === false && (
        <div className="adm-note flex items-start gap-3">
          <Megaphone size={16} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            푸시알림 발송 기능은 비활성 상태입니다. Vercel 환경변수에{' '}
            <code className="adm-mono">FCM_PROJECT_ID</code>,{' '}
            <code className="adm-mono">FCM_CLIENT_EMAIL</code>,{' '}
            <code className="adm-mono">FCM_PRIVATE_KEY</code>를 추가해 주세요.
          </div>
          <button type="button" onClick={refreshPushStatus} className="adm-btn sm white flex-shrink-0">
            재확인
          </button>
        </div>
      )}

      <StatRow cols={3}>
        <StatCard label="전체 공지" value={items.length} suffix="개" />
        <StatCard label="게시 중" value={publishedCount} suffix="개" accent="#1AB554" />
        <StatCard label="예약" value={scheduledCount} suffix="개" accent="#3182F6" />
      </StatRow>

      <AdminListCard
        filter={
          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="제목, 내용 검색" width={300} />
            <span className="grow" />
            <Count n={filtered.length} unit="개" />
          </Toolbar>
        }
      >
        {loading ? (
          <LoadingRows />
        ) : pageData.length === 0 ? (
          <EmptyState icon={<Bell size={22} />} title="공지가 없어요" hint='오른쪽 위 "새 공지 작성"으로 시작해 보세요.' />
        ) : (
          <div className="adm-tscroll">
            <div className="adm-tscroll-in">
              <div className={`${GRID} adm-ghead`}>
                <div>번호</div>
                <div>제목</div>
                <div>게시일시</div>
                <div>상태</div>
                <div className="text-right">관리</div>
              </div>
              {pageData.map((a, i) => {
                const scheduled = new Date(a.published_at).getTime() > Date.now();
                return (
                  <div key={a.id} className={`${GRID} adm-grow`}>
                    <div className="adm-num text-[#8B95A1]">{i + 1}</div>
                    <div className="min-w-0">
                      <p className="adm-cell-main truncate">{a.title}</p>
                      {a.content && <p className="adm-cell-sub truncate">{a.content.slice(0, 80)}</p>}
                    </div>
                    <div className="adm-cell dim">{formatDateTime(a.published_at)}</div>
                    <div>
                      <StatusBadge tone={scheduled ? 'blue' : 'green'}>{scheduled ? '예약' : '게시중'}</StatusBadge>
                    </div>
                    <div className="adm-actions">
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
            </div>
          </div>
        )}
        {!loading && <TableFoot total={filtered.length} shown={visibleCount} sentinelRef={sentinelRef} />}
      </AdminListCard>

      {/* 공지 작성·수정 */}
      {showForm && (
        <AdminModal
          onClose={() => setShowForm(false)}
          busy={busy}
          width={560}
          title={editId ? '공지 수정' : '새 공지 작성'}
          actions={
            <>
              <button type="button" onClick={() => setShowForm(false)} disabled={busy} className="adm-btn">취소</button>
              <button type="button" onClick={handleSave} disabled={busy} className="adm-btn primary">
                {busy ? '저장 중…' : editId ? '수정' : '게시'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="adm-label">제목 *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="공지 제목" className="adm-input" />
            </div>
            <div>
              <label className="adm-label">내용</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={7}
                placeholder="공지 본문을 입력하세요"
                className="adm-input adm-textarea"
              />
            </div>
            <div>
              {/* 시각까지 고르는 칸이라 AdminDatePop(날짜만) 대신 datetime-local 그대로 */}
              <label className="adm-label">게시 일시</label>
              <input type="datetime-local" value={form.publishedAt} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })} className="adm-input" />
              <p className="adm-hint">비워두면 즉시 게시돼요.</p>
            </div>
          </div>
          {formError && <p className="adm-note red mt-4">{formError}</p>}
        </AdminModal>
      )}

      {/* 푸시 발송 */}
      {showPush && (
        <AdminModal
          onClose={() => setShowPush(false)}
          busy={pushBusy}
          icon={<span className="adm-modal-ic"><Send size={20} /></span>}
          title="푸시알림 발송"
          sub="전체 회원의 등록 디바이스로 발송됩니다."
          actions={
            <>
              <button type="button" onClick={() => setShowPush(false)} disabled={pushBusy} className="adm-btn">닫기</button>
              <button
                type="button"
                onClick={handleSendPush}
                disabled={pushBusy || !pushForm.title.trim() || !pushForm.body.trim()}
                className="adm-btn primary"
              >
                {pushBusy ? '발송 중…' : '발송'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="adm-label">제목 *</label>
              <input value={pushForm.title} onChange={(e) => setPushForm({ ...pushForm, title: e.target.value })} placeholder="앱 푸시 제목" className="adm-input" />
            </div>
            <div>
              <label className="adm-label">본문 *</label>
              <textarea
                value={pushForm.body}
                onChange={(e) => setPushForm({ ...pushForm, body: e.target.value })}
                rows={4}
                placeholder="앱 푸시 본문"
                className="adm-input adm-textarea"
              />
            </div>
          </div>
          {pushResult && (
            <div className={`adm-note mt-4 ${pushResult.failed === 0 ? 'blue' : ''}`}>
              <p>성공 {pushResult.sent}건 · 실패 {pushResult.failed}건</p>
              {pushResult.errors.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 font-medium">
                  {pushResult.errors.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </AdminModal>
      )}

      {/* 미리보기 */}
      {viewItem && (
        <AdminModal
          onClose={() => setViewItem(null)}
          width={560}
          title={viewItem.title}
          sub={formatDateTime(viewItem.published_at)}
          actions={<button type="button" className="adm-btn" onClick={() => setViewItem(null)}>닫기</button>}
        >
          <div className="adm-kvbox whitespace-pre-wrap py-4 text-[14px] leading-relaxed text-[#191F28]">
            {viewItem.content || '(내용 없음)'}
          </div>
        </AdminModal>
      )}
    </div>
  );
}
