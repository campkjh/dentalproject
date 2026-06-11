'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Flag, X, XCircle, ExternalLink } from 'lucide-react';
import { useStore } from '@/store';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { PageHeader, FilterChips, SearchInput, StatCard, PillButton, StatusBadge, EmptyState } from '@/components/admin/ui';

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

  return (
    <div className="space-y-6">
      <PageHeader title="신고 관리" subtitle="사용자가 신고한 게시글을 검토하고 처리합니다." />

      {migrationRequired && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[13px] text-amber-900">
          <p className="font-semibold mb-2 flex items-center gap-2"><AlertCircle size={14} /> 신고 테이블이 아직 생성되지 않았어요</p>
          <p className="text-[12px]">
            Supabase SQL Editor에서{' '}
            <code className="px-1.5 py-0.5 bg-amber-100 rounded text-amber-800">supabase/migrations/0012_post_reports.sql</code>{' '}
            을 실행한 후 새로고침하면 활성화돼요.
          </p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="전체 신고" value={counts.total} suffix="건" />
        <StatCard label="대기 중" value={counts.pending} suffix="건" accent="#F59E0B" />
        <StatCard label="처리완료" value={counts.resolved} suffix="건" accent="#1AB554" />
        <StatCard label="기각" value={counts.rejected} suffix="건" accent="#8B95A1" />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'pending', label: '대기' },
            { value: 'resolved', label: '처리완료' },
            { value: 'rejected', label: '기각' },
            { value: 'all', label: '전체' },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="게시글, 신고자, 사유 검색" />
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        {loading ? (
          <div className="px-5 py-16 text-center text-[13px] text-[#8B95A1]">불러오는 중…</div>
        ) : pageData.length === 0 ? (
          <EmptyState
            icon={<Flag size={20} className="text-[#8B95A1]" />}
            title={migrationRequired ? '마이그레이션 적용 후 표시돼요' : '신고가 없어요'}
            hint={migrationRequired ? undefined : '필터를 변경해 보세요.'}
          />
        ) : (
          <>
            <div className="grid grid-cols-[80px_1.8fr_1fr_1fr_100px_140px_auto] gap-4 px-5 py-3 bg-[#FAFBFC] border-b border-[#F2F4F6] text-[11px] font-semibold text-[#8B95A1] uppercase tracking-wider">
              <div>게시판</div>
              <div>신고된 게시글</div>
              <div>신고 사유</div>
              <div>신고자</div>
              <div>상태</div>
              <div>신고일</div>
              <div className="text-right">관리</div>
            </div>
            {pageData.map((r, i) => (
              <div
                key={r.id}
                className="grid grid-cols-[80px_1.8fr_1fr_1fr_100px_140px_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors"
                style={{ borderBottom: i === pageData.length - 1 ? 'none' : '1px solid #F2F4F6' }}
              >
                <div className="text-[12px] text-[#4E5968]">{r.post_board ? boardLabel[r.post_board] : '-'}</div>
                <div className="text-[14px] font-semibold text-[#191F28] truncate">{r.post_title}</div>
                <div className="text-[13px] text-[#4E5968] truncate">{r.reason}</div>
                <div className="text-[13px] text-[#4E5968] truncate">{r.reporter}</div>
                <div>
                  <StatusBadge
                    tone={r.status === 'pending' ? 'orange' : r.status === 'resolved' ? 'green' : 'gray'}
                  >
                    {r.status === 'pending' ? '대기' : r.status === 'resolved' ? '처리완료' : '기각'}
                  </StatusBadge>
                </div>
                <div className="text-[12px] text-[#8B95A1]">{formatDateTime(r.created_at)}</div>
                <div className="flex items-center gap-1.5 justify-end">
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
                  <a href={`/community/post/${r.post_id}`} target="_blank" rel="noreferrer">
                    <PillButton tone="blue">
                      보기
                    </PillButton>
                  </a>
                </div>
              </div>
            ))}
          </>
        )}
        <div className="px-5 py-4 border-t border-[#F2F4F6]">
          <p className="text-[12px] text-[#8B95A1] text-center">
            전체 <span className="font-semibold text-[#191F28]">{filtered.length.toLocaleString()}</span>건 중{' '}
            <span className="font-semibold text-[#191F28]">{Math.min(visibleCount, filtered.length)}</span>건 표시
          </p>
          {visibleCount < filtered.length && (
            <div ref={sentinelRef} className="h-10 flex items-center justify-center text-[11px] text-[#8B95A1]">
              스크롤하면 더 불러옵니다…
            </div>
          )}
        </div>
      </div>

      {actionTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setActionTarget(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: actionTarget.action === 'resolve' ? '#E8F8EE' : '#F2F4F6' }}
                >
                  {actionTarget.action === 'resolve'
                    ? <CheckCircle2 size={18} className="text-[#1AB554]" />
                    : <XCircle size={18} className="text-[#8B95A1]" />}
                </div>
                <h3 className="text-[18px] font-bold text-[#191F28]">
                  {actionTarget.action === 'resolve' ? '신고 처리' : '신고 기각'}
                </h3>
              </div>
              <button onClick={() => setActionTarget(null)} className="p-1 -m-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-[#8B95A1]" />
              </button>
            </div>

            <div className="bg-[#FAFBFC] rounded-xl p-3 mb-4 space-y-1.5 text-[12px] border border-[#F2F4F6]">
              <div className="flex justify-between"><span className="text-[#8B95A1]">사유</span><span className="text-[#191F28] font-semibold">{actionTarget.report.reason}</span></div>
              <div className="flex justify-between gap-3"><span className="text-[#8B95A1] flex-shrink-0">게시글</span><span className="text-[#191F28] text-right truncate">{actionTarget.report.post_title}</span></div>
              <div className="flex justify-between"><span className="text-[#8B95A1]">신고자</span><span className="text-[#191F28]">{actionTarget.report.reporter}</span></div>
            </div>

            <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">처리 메모 (선택)</label>
            <textarea
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              rows={3}
              placeholder={actionTarget.action === 'resolve' ? '예: 부적절한 의료 정보 — 게시글 삭제 완료' : '예: 신고 사유가 명확하지 않아 기각'}
              className="w-full px-3.5 py-2.5 border border-[#E5E8EB] rounded-[10px] text-[14px] text-[#191F28] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/15 resize-y"
            />

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setActionTarget(null)}
                disabled={busy}
                className="flex-1 h-11 border border-[#E5E8EB] rounded-[10px] text-[14px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleAction}
                disabled={busy}
                className="flex-1 h-11 rounded-[10px] text-[14px] font-semibold text-white disabled:opacity-50 transition-colors"
                style={{ background: actionTarget.action === 'resolve' ? '#1AB554' : '#4E5968' }}
              >
                {busy ? '처리 중…' : actionTarget.action === 'resolve' ? '처리완료' : '기각'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
