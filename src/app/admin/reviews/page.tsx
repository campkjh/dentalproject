'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Star, Trash2, Eye, EyeOff, X, MessageSquare } from 'lucide-react';
import { useStore } from '@/store';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';

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

function PillButton({
  children, onClick, tone = 'gray', disabled,
}: { children: React.ReactNode; onClick?: () => void; tone?: 'gray' | 'blue' | 'red' | 'orange' | 'green'; disabled?: boolean }) {
  const styles: Record<string, string> = {
    gray: 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]',
    blue: 'bg-[#E5F1FF] text-[#3182F6] hover:bg-[#D6E8FF]',
    red: 'bg-[#FEECEC] text-[#E54848] hover:bg-[#FCDCDC]',
    orange: 'bg-[#FFF4E5] text-[#F59E0B] hover:bg-[#FFE9CC]',
    green: 'bg-[#E8F8EE] text-[#1AB554] hover:bg-[#D6F1DF]',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center h-[28px] px-[10px] rounded-md text-[12px] font-semibold transition-colors disabled:opacity-50 ${styles[tone]}`}
    >
      {children}
    </button>
  );
}

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-[#191F28]">리뷰 관리</h1>
        <p className="text-[13px] text-[#8B95A1] mt-1.5">부적절한 리뷰를 숨김 처리하거나 삭제합니다.</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-[#E5E8EB] px-5 py-4">
          <p className="text-[12px] font-medium text-[#8B95A1]">전체 리뷰</p>
          <p className="text-[24px] font-bold tracking-tight mt-1 text-[#191F28]">
            {counts.total.toLocaleString()}<span className="text-[13px] font-medium text-[#8B95A1] ml-1">개</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E8EB] px-5 py-4">
          <p className="text-[12px] font-medium text-[#8B95A1]">평균 평점</p>
          <p className="text-[24px] font-bold tracking-tight mt-1 text-[#F59E0B] flex items-center gap-1">
            <Star size={18} fill="#F59E0B" stroke="#F59E0B" /> {counts.avg.toFixed(1)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E8EB] px-5 py-4">
          <p className="text-[12px] font-medium text-[#8B95A1]">숨김 처리</p>
          <p className="text-[24px] font-bold tracking-tight mt-1 text-[#F59E0B]">
            {counts.hidden.toLocaleString()}<span className="text-[13px] font-medium text-[#8B95A1] ml-1">개</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E8EB] px-5 py-4">
          <p className="text-[12px] font-medium text-[#8B95A1]">저평점 (2점 이하)</p>
          <p className="text-[24px] font-bold tracking-tight mt-1 text-[#E54848]">
            {counts.lowRating.toLocaleString()}<span className="text-[13px] font-medium text-[#8B95A1] ml-1">개</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {FILTER_TABS.map((t) => {
            const active = filter === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className="h-9 px-3.5 rounded-full text-[13px] font-semibold transition-colors border"
                style={
                  active
                    ? { background: '#191F28', color: '#FFFFFF', borderColor: '#191F28' }
                    : { background: '#FFFFFF', color: '#4E5968', borderColor: '#E5E8EB' }
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="relative w-[300px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B95A1]" />
          <input
            type="text"
            placeholder="내용, 작성자, 병원, 상품 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-[#E5E8EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/15 transition-all"
          />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-[#E5F1FF] border border-[#3182F6]/30 rounded-2xl px-4 py-3">
          <span className="text-[13px] text-[#3182F6] font-semibold">{selected.size}개 선택됨</span>
          <div className="flex items-center gap-2">
            <PillButton tone="orange" disabled={busy} onClick={() => handleHide(Array.from(selected), 'hide')}>
              숨김
            </PillButton>
            <PillButton tone="green" disabled={busy} onClick={() => handleHide(Array.from(selected), 'show')}>
              공개
            </PillButton>
            <PillButton tone="red" disabled={busy} onClick={() => handleDelete(Array.from(selected))}>
              삭제
            </PillButton>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        {loading ? (
          <div className="px-5 py-16 text-center text-[13px] text-[#8B95A1]">불러오는 중…</div>
        ) : pageData.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="w-12 h-12 mx-auto bg-[#F2F4F6] rounded-full flex items-center justify-center mb-3">
              <MessageSquare size={20} className="text-[#8B95A1]" />
            </div>
            <p className="text-[14px] font-semibold text-[#4E5968]">표시할 리뷰가 없어요</p>
            <p className="text-[12px] text-[#8B95A1] mt-1">검색어나 필터를 변경해 보세요.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[36px_80px_1.6fr_1fr_1.2fr_0.8fr_1fr_auto] gap-4 px-5 py-3 bg-[#FAFBFC] border-b border-[#F2F4F6] text-[11px] font-semibold text-[#8B95A1] uppercase tracking-wider">
              <button
                onClick={() => {
                  const allSel = pageData.every((r) => selected.has(r.id));
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (allSel) pageData.forEach((r) => next.delete(r.id));
                    else pageData.forEach((r) => next.add(r.id));
                    return next;
                  });
                }}
                className="w-5 h-5 rounded border flex items-center justify-center"
                style={{
                  background: pageData.every((r) => selected.has(r.id)) ? '#3182F6' : '#FFFFFF',
                  borderColor: pageData.every((r) => selected.has(r.id)) ? '#3182F6' : '#C9CDD2',
                }}
              >
                {pageData.every((r) => selected.has(r.id)) && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5L6.5 12L13 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <div>평점</div>
              <div>내용</div>
              <div>작성자</div>
              <div>병원</div>
              <div>상태</div>
              <div>작성일</div>
              <div className="text-right">관리</div>
            </div>
            {pageData.map((r, i) => {
              const isSel = selected.has(r.id);
              return (
                <div
                  key={r.id}
                  className={`grid grid-cols-[36px_80px_1.6fr_1fr_1.2fr_0.8fr_1fr_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors ${r.hidden ? 'opacity-60' : ''}`}
                  style={{ borderBottom: i === pageData.length - 1 ? 'none' : '1px solid #F2F4F6' }}
                >
                  <button
                    onClick={() => setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(r.id)) next.delete(r.id); else next.add(r.id);
                      return next;
                    })}
                    className="w-5 h-5 rounded border flex items-center justify-center"
                    style={{
                      background: isSel ? '#3182F6' : '#FFFFFF',
                      borderColor: isSel ? '#3182F6' : '#C9CDD2',
                    }}
                  >
                    {isSel && (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8.5L6.5 12L13 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <div className="flex items-center gap-1">
                    <Star size={13} fill="#F59E0B" stroke="#F59E0B" />
                    <span className="text-[14px] font-bold text-[#191F28]">{r.rating.toFixed(1)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] text-[#191F28] truncate">{r.content}</p>
                    <p className="text-[11px] text-[#8B95A1] mt-0.5 truncate">시술: {r.treatment_name}</p>
                  </div>
                  <div className="text-[13px] text-[#4E5968] truncate">{r.author}</div>
                  <div className="text-[13px] text-[#4E5968] truncate">{r.hospital}</div>
                  <div>
                    <span
                      className="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold"
                      style={
                        r.hidden
                          ? { background: '#FFF4E5', color: '#F59E0B' }
                          : { background: '#E8F8EE', color: '#1AB554' }
                      }
                    >
                      {r.hidden ? '숨김' : '공개'}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#8B95A1]">{formatDateTime(r.created_at)}</div>
                  <div className="flex items-center gap-1.5 justify-end">
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

      {viewReview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setViewReview(null)}>
          <div className="bg-white rounded-3xl w-full max-w-xl p-7 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={16} fill={viewReview.rating >= i + 1 ? '#F59E0B' : 'none'} stroke="#F59E0B" />
                  ))}
                </div>
                <span className="text-[18px] font-bold text-[#191F28] ml-1">{viewReview.rating.toFixed(1)}</span>
              </div>
              <button onClick={() => setViewReview(null)} className="p-1 -m-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-[#8B95A1]" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[#8B95A1] mb-4">
              <span className="font-semibold text-[#4E5968]">{viewReview.author}</span>
              <span>·</span>
              <span>{viewReview.hospital}</span>
              <span>·</span>
              <span>{formatDateTime(viewReview.created_at)}</span>
            </div>
            <div className="text-[14px] text-[#191F28] whitespace-pre-wrap leading-relaxed bg-[#FAFBFC] rounded-xl p-4 border border-[#F2F4F6]">
              {viewReview.content}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <p className="text-[11px] text-[#8B95A1] mb-1">시술명</p>
                <p className="text-[13px] font-semibold text-[#191F28]">{viewReview.treatment_name}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#8B95A1] mb-1">결제 금액</p>
                <p className="text-[13px] font-semibold text-[#191F28]">{viewReview.total_cost.toLocaleString()}원</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
