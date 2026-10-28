'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Flag, XCircle, ExternalLink } from 'lucide-react';
import { useStore } from '@/store';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import {
  FilterChips, SearchInput, StatCard, StatRow, PillButton, StatusBadge, EmptyState,
  AdminListCard, Toolbar, Count, TableFoot, LoadingRows, AdminModal,
} from '@/components/admin/ui';

type Report = {
  id: string;
  post_id: string;
  post_title: string;
  post_board: 'question' | 'free' | 'dental' | null;
  reporter: string;
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
};

const boardLabel: Record<string, string> = { question: '질문', free: '자유', dental: '치과' };
const PAGE_SIZE = 20;

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminCommunityReportsPage() {
  const showAlert = useStore((s) => s.showAlert);
  const [reports, setReports] = useState<Report[]>([]);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [actionTarget, setActionTarget] = useState<{ report: Report; action: 'resolve' | 'reject' } | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setMigrationRequired(false);
    try {
      const res = await fetch('/api/admin/community/reports', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.migration_required) {
        setMigrationRequired(true);
        setReports([]);
        return;
      }
      setReports(data.reports ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = reports;
    if (filter !== 'all') list = list.filter((r) => r.status === filter);
    if (q) {
      list = list.filter((r) =>
        r.post_title.toLowerCase().includes(q) ||
        r.reporter.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    }
    return list;
  }, [reports, filter, search]);

  const { visibleCount, sentinelRef } = useInfiniteScroll(filtered.length, PAGE_SIZE);
  const pageData = filtered.slice(0, visibleCount);

  const counts = {
    total: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
    rejected: reports.filter((r) => r.status === 'rejected').length,
  };

  const handleAction = async () => {
    if (!actionTarget) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/community/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: actionTarget.report.id,
          action: actionTarget.action,
          resolution: resolutionText.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showAlert(data?.error ?? '처리 실패');
        return;
      }
      setActionTarget(null);
      setResolutionText('');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const GRID = 'grid grid-cols-[80px_1.8fr_1fr_1fr_100px_140px_auto] gap-4 items-center';

  // 제목·설명은 레이아웃이 '게시글 · 신고' 제목 탭과 함께 그린다
  return (
    <div className="adm-stack">
      {migrationRequired && (
        <div className="adm-note">
          <p className="mb-1 flex items-center gap-2"><AlertCircle size={16} /> 신고 테이블이 아직 생성되지 않았어요</p>
          <p className="font-medium">
            Supabase SQL Editor에서 <code className="adm-mono">supabase/migrations/0012_post_reports.sql</code> 을 실행한 후 새로고침하면 활성화돼요.
          </p>
        </div>
      )}

      <StatRow cols={4}>
        <StatCard label="전체 신고" value={counts.total} suffix="건" />
        <StatCard label="대기 중" value={counts.pending} suffix="건" accent="#F59E0B" />
        <StatCard label="처리완료" value={counts.resolved} suffix="건" accent="#1AB554" />
        <StatCard label="기각" value={counts.rejected} suffix="건" accent="#8B95A1" />
      </StatRow>

      <AdminListCard
        filter={
          <>
            <Toolbar>
              <SearchInput value={search} onChange={setSearch} placeholder="게시글, 신고자, 사유 검색" width={300} />
              <span className="grow" />
              <Count n={filtered.length} />
            </Toolbar>
            <Toolbar>
              <FilterChips
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'pending', label: '대기' },
                  { value: 'resolved', label: '처리완료' },
                  { value: 'rejected', label: '기각' },
                  { value: 'all', label: '전체' },
                ]}
                ariaLabel="신고 상태"
              />
            </Toolbar>
          </>
        }
      >
        {loading ? (
          <LoadingRows />
        ) : pageData.length === 0 ? (
          <EmptyState
            icon={<Flag size={22} />}
            title={migrationRequired ? '마이그레이션 적용 후 표시돼요' : '신고가 없어요'}
            hint={migrationRequired ? undefined : '거르기를 바꿔 보세요.'}
          />
        ) : (
          <div className="adm-tscroll">
            <div className="adm-tscroll-in">
              <div className={`${GRID} adm-ghead`}>
                <div>게시판</div>
                <div>신고된 게시글</div>
                <div>신고 사유</div>
                <div>신고자</div>
                <div>상태</div>
                <div>신고일</div>
                <div className="text-right">관리</div>
              </div>
              {pageData.map((r) => (
                <div key={r.id} className={`${GRID} adm-grow`}>
                  <div className="adm-cell">{r.post_board ? boardLabel[r.post_board] : '-'}</div>
                  <div className="adm-cell-main truncate">{r.post_title}</div>
                  <div className="adm-cell truncate">{r.reason}</div>
                  <div className="adm-cell truncate">{r.reporter}</div>
                  <div>
                    <StatusBadge
                      tone={r.status === 'pending' ? 'orange' : r.status === 'resolved' ? 'green' : 'gray'}
                    >
                      {r.status === 'pending' ? '대기' : r.status === 'resolved' ? '처리완료' : '기각'}
                    </StatusBadge>
                  </div>
                  <div className="adm-cell dim">{formatDateTime(r.created_at)}</div>
                  <div className="adm-actions">
                    {r.status === 'pending' && (
                      <>
                        <PillButton tone="green" onClick={() => { setActionTarget({ report: r, action: 'resolve' }); setResolutionText(''); }}>
                          처리
                        </PillButton>
                        <PillButton tone="gray" onClick={() => { setActionTarget({ report: r, action: 'reject' }); setResolutionText(''); }}>
                          기각
                        </PillButton>
                      </>
                    )}
                    <a href={`/community/post/${r.post_id}`} target="_blank" rel="noreferrer" className="adm-btn sm weak">
                      보기 <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && <TableFoot total={filtered.length} shown={visibleCount} sentinelRef={sentinelRef} />}
      </AdminListCard>

      {actionTarget && (
        <AdminModal
          onClose={() => setActionTarget(null)}
          busy={busy}
          icon={
            <span className={`adm-modal-ic ${actionTarget.action === 'resolve' ? 'green' : ''}`}>
              {actionTarget.action === 'resolve' ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
            </span>
          }
          title={actionTarget.action === 'resolve' ? '신고 처리' : '신고 기각'}
          actions={
            <>
              <button type="button" className="adm-btn" onClick={() => setActionTarget(null)} disabled={busy}>
                취소
              </button>
              <button type="button" className="adm-btn primary" onClick={handleAction} disabled={busy}>
                {busy ? '처리 중…' : actionTarget.action === 'resolve' ? '처리완료' : '기각'}
              </button>
            </>
          }
        >
          <div className="adm-kvbox mb-4">
            <div className="adm-kv"><span>사유</span><span>{actionTarget.report.reason}</span></div>
            <div className="adm-kv"><span>게시글</span><span className="truncate">{actionTarget.report.post_title}</span></div>
            <div className="adm-kv"><span>신고자</span><span>{actionTarget.report.reporter}</span></div>
          </div>

          <label className="adm-label">처리 메모 (선택)</label>
          <textarea
            value={resolutionText}
            onChange={(e) => setResolutionText(e.target.value)}
            rows={3}
            placeholder={actionTarget.action === 'resolve' ? '예: 부적절한 의료 정보 — 게시글 삭제 완료' : '예: 신고 사유가 명확하지 않아 기각'}
            className="adm-input adm-textarea"
          />
        </AdminModal>
      )}
    </div>
  );
}
