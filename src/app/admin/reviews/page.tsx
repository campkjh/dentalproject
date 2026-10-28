'use client';

import { useEffect, useMemo, useState } from 'react';
import { Star, Trash2, Eye, EyeOff, MessageSquare } from 'lucide-react';
import { useStore } from '@/store';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import {
  FilterChips, SearchInput, StatCard, StatRow, PillButton, StatusBadge, EmptyState,
  AdminListCard, Toolbar, Count, TableFoot, LoadingRows, AdminModal,
} from '@/components/admin/ui';

type Review = {
  id: string;
  rating: number;
  content: string;
  treatment_name: string;
  total_cost: number;
  hidden: boolean;
  created_at: string;
  author: string;
  hospital: string;
  product: string;
};

const PAGE_SIZE = 20;

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

// 별점 색(토스 주황)
const STAR = '#F46A00';

const FILTER_TABS = [
  { value: 'all', label: '전체' },
  { value: 'visible', label: '공개' },
  { value: 'hidden', label: '숨김' },
  { value: 'low_rating', label: '저평점' },
] as const;

export default function AdminReviewsPage() {
  const showAlert = useStore((s) => s.showAlert);
  const showConfirm = useStore((s) => s.showConfirm);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<typeof FILTER_TABS[number]['value']>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewReview, setViewReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reviews', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews ?? []);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    let list = reviews;
    if (filter === 'visible') list = list.filter((r) => !r.hidden);
    else if (filter === 'hidden') list = list.filter((r) => r.hidden);
    else if (filter === 'low_rating') list = list.filter((r) => r.rating <= 2);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        r.content.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q) ||
        r.hospital.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q)
      );
    }
    return list;
  }, [reviews, filter, search]);

  const { visibleCount, sentinelRef } = useInfiniteScroll(filtered.length, PAGE_SIZE);
  const pageData = filtered.slice(0, visibleCount);

  const counts = useMemo(() => ({
    total: reviews.length,
    visible: reviews.filter((r) => !r.hidden).length,
    hidden: reviews.filter((r) => r.hidden).length,
    lowRating: reviews.filter((r) => r.rating <= 2).length,
    avg: reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0,
  }), [reviews]);

  const handleHide = async (ids: string[], action: 'hide' | 'show') => {
    if (!ids.length) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showAlert(data?.error ?? '처리에 실패했습니다.');
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (ids: string[]) => {
    if (!ids.length) return;
    showConfirm(
      '리뷰 삭제',
      `${ids.length}개 리뷰를 삭제할까요? 되돌릴 수 없어요.`,
      async () => {
        setBusy(true);
        try {
          const res = await fetch('/api/admin/reviews', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showAlert(data?.error ?? '삭제에 실패했습니다.');
            return;
          }
          await load();
        } finally {
          setBusy(false);
        }
      },
      { confirmText: '삭제', cancelText: '취소' }
    );
  };

  const GRID = 'grid grid-cols-[36px_80px_1.6fr_1fr_1.2fr_0.8fr_1fr_auto] gap-4 items-center';
  const allSel = pageData.length > 0 && pageData.every((r) => selected.has(r.id));

  return (
    <div className="adm-stack">
      <StatRow cols={4}>
        <StatCard label="전체 리뷰" value={counts.total} suffix="개" />
        <StatCard label="평균 평점" value={counts.avg.toFixed(1)} suffix="점" accent="#F59E0B" />
        <StatCard label="숨김 처리" value={counts.hidden} suffix="개" accent="#F59E0B" />
        <StatCard label="저평점 (2점 이하)" value={counts.lowRating} suffix="개" accent="#E54848" />
      </StatRow>

      {selected.size > 0 && (
        <div className="adm-selbar">
          <span className="text-[14px] font-semibold">{selected.size}개 선택됨</span>
          <span className="grow" />
          <button type="button" className="adm-btn sm white" disabled={busy} onClick={() => handleHide(Array.from(selected), 'hide')}>
            <EyeOff size={14} /> 숨김
          </button>
          <button type="button" className="adm-btn sm white" disabled={busy} onClick={() => handleHide(Array.from(selected), 'show')}>
            <Eye size={14} /> 공개
          </button>
          <button type="button" className="adm-btn sm danger-solid" disabled={busy} onClick={() => handleDelete(Array.from(selected))}>
            <Trash2 size={14} /> 삭제
          </button>
        </div>
      )}

      <AdminListCard
        filter={
          <>
            <Toolbar>
              <SearchInput value={search} onChange={setSearch} placeholder="내용, 작성자, 병원, 상품 검색" width={300} />
              <span className="grow" />
              <Count n={filtered.length} unit="개" />
            </Toolbar>
            <Toolbar>
              <FilterChips
                value={filter}
                onChange={setFilter}
                options={FILTER_TABS.map((t) => ({ value: t.value, label: t.label }))}
                ariaLabel="리뷰 상태"
              />
            </Toolbar>
          </>
        }
      >
        {loading ? (
          <LoadingRows />
        ) : pageData.length === 0 ? (
          <EmptyState icon={<MessageSquare size={22} />} title="표시할 리뷰가 없어요" hint="검색어나 거르기를 바꿔 보세요." />
        ) : (
          <div className="adm-tscroll">
            <div className="adm-tscroll-in">
              <div className={`${GRID} adm-ghead`}>
                <CheckBox
                  checked={allSel}
                  ariaLabel="이 화면 리뷰 모두 고르기"
                  onClick={() => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (allSel) pageData.forEach((r) => next.delete(r.id));
                      else pageData.forEach((r) => next.add(r.id));
                      return next;
                    });
                  }}
                />
                <div>평점</div>
                <div>내용</div>
                <div>작성자</div>
                <div>병원</div>
                <div>상태</div>
                <div>작성일</div>
                <div className="text-right">관리</div>
              </div>
              {pageData.map((r) => {
                const isSel = selected.has(r.id);
                return (
                  <div key={r.id} className={`${GRID} adm-grow ${r.hidden ? 'off' : ''}`}>
                    <CheckBox
                      checked={isSel}
                      ariaLabel="리뷰 고르기"
                      onClick={() => setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(r.id)) next.delete(r.id); else next.add(r.id);
                        return next;
                      })}
                    />
                    <div className="flex items-center gap-1">
                      <Star size={14} fill={STAR} stroke={STAR} />
                      <span className="adm-num">{r.rating.toFixed(1)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="adm-cell-main truncate">{r.content}</p>
                      <p className="adm-cell-sub truncate">시술: {r.treatment_name}</p>
                    </div>
                    <div className="adm-cell truncate">{r.author}</div>
                    <div className="adm-cell truncate">{r.hospital}</div>
                    <div>
                      <StatusBadge tone={r.hidden ? 'orange' : 'green'}>{r.hidden ? '숨김' : '공개'}</StatusBadge>
                    </div>
                    <div className="adm-cell dim">{formatDateTime(r.created_at)}</div>
                    <div className="adm-actions">
                      <PillButton tone="blue" onClick={() => setViewReview(r)}>
                        상세
                      </PillButton>
                      <PillButton
                        tone={r.hidden ? 'green' : 'orange'}
                        disabled={busy}
                        onClick={() => handleHide([r.id], r.hidden ? 'show' : 'hide')}
                      >
                        {r.hidden ? '공개' : '숨김'}
                      </PillButton>
                      <PillButton tone="red" disabled={busy} onClick={() => handleDelete([r.id])}>
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

      {viewReview && (
        <AdminModal
          onClose={() => setViewReview(null)}
          width={560}
          title={
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={16} fill={viewReview.rating >= i + 1 ? STAR : 'none'} stroke={STAR} />
                ))}
              </span>
              {viewReview.rating.toFixed(1)}
            </span>
          }
          sub={<>{viewReview.author} · {viewReview.hospital} · {formatDateTime(viewReview.created_at)}</>}
          actions={<button type="button" className="adm-btn" onClick={() => setViewReview(null)}>닫기</button>}
        >
          <div className="adm-kvbox whitespace-pre-wrap py-4 text-[14px] leading-relaxed text-[#191F28]">
            {viewReview.content}
          </div>
          <div className="mt-2">
            <div className="adm-kv"><span>시술명</span><span>{viewReview.treatment_name}</span></div>
            <div className="adm-kv"><span>결제 금액</span><span className="adm-num">{viewReview.total_cost.toLocaleString()}원</span></div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

/** 표 칸 체크 상자(토스 파랑) */
function CheckBox({ checked, onClick, ariaLabel }: { checked: boolean; onClick: () => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onClick}
      className="flex h-5 w-5 items-center justify-center rounded-md border-[1.5px] transition-colors"
      style={{ background: checked ? '#3182F6' : '#FFFFFF', borderColor: checked ? '#3182F6' : '#D1D6DB' }}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8.5L6.5 12L13 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
