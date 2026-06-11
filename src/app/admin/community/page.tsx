'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { Trash2, Eye, MessageSquare, ThumbsUp, X } from 'lucide-react';
import { PageHeader, FilterChips, SearchInput, StatCard, PillButton, StatusBadge, EmptyState } from '@/components/admin/ui';

type BoardType = 'question' | 'free' | 'dental';

type Post = {
  id: string;
  title: string;
  content: string;
  board_type: BoardType;
  author: string;
  views: number;
  comments: number;
  likes: number;
  created_at: string;
};

const boardLabel: Record<BoardType, string> = {
  question: '질문게시판', free: '자유게시판', dental: '치과게시판',
};
const boardTone: Record<BoardType, 'blue' | 'green' | 'purple'> = {
  question: 'blue', free: 'green', dental: 'purple',
};

const PAGE_SIZE = 20;

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminCommunityPage() {
  const showAlert = useStore((s) => s.showAlert);
  const showConfirm = useStore((s) => s.showConfirm);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBoard, setActiveBoard] = useState<'all' | BoardType>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewPost, setViewPost] = useState<Post | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/community/posts', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setPosts(data.posts ?? []);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      const matchesBoard = activeBoard === 'all' || p.board_type === activeBoard;
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        (p.content ?? '').toLowerCase().includes(q);
      return matchesBoard && matchesSearch;
    });
  }, [posts, activeBoard, search]);

  const { visibleCount, sentinelRef } = useInfiniteScroll(filtered.length, PAGE_SIZE);
  const pageData = filtered.slice(0, visibleCount);

  const counts = useMemo(() => ({
    total: posts.length,
    today: posts.filter((p) => {
      const d = new Date(p.created_at); const n = new Date();
      return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
    }).length,
    question: posts.filter((p) => p.board_type === 'question').length,
    others: posts.filter((p) => p.board_type !== 'question').length,
  }), [posts]);

  const handleDelete = (ids: string[]) => {
    if (!ids.length) return;
    showConfirm(
      '게시글 삭제',
      `${ids.length}개 게시글을 삭제할까요? 되돌릴 수 없어요.`,
      async () => {
        setBusy(true);
        try {
          const res = await fetch('/api/admin/community/posts', {
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
      <PageHeader title="커뮤니티 관리" subtitle="게시글을 조회하고 삭제합니다." />

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="전체 게시글" value={counts.total} suffix="개" />
        <StatCard label="오늘 작성" value={counts.today} suffix="개" accent="#1AB554" />
        <StatCard label="질문게시판" value={counts.question} suffix="개" accent="#3182F6" />
        <StatCard label="자유/치과" value={counts.others} suffix="개" accent="#7B61FF" />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <FilterChips
          value={activeBoard}
          onChange={setActiveBoard}
          options={[
            { value: 'all', label: '전체' },
            { value: 'question', label: '질문' },
            { value: 'free', label: '자유' },
            { value: 'dental', label: '치과' },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="제목, 내용, 작성자 검색" />
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-[#FEECEC] border border-[#E54848]/30 rounded-2xl px-4 py-3">
          <span className="text-[13px] text-[#E54848] font-semibold">{selected.size}개 선택됨</span>
          <PillButton tone="red" disabled={busy} onClick={() => handleDelete(Array.from(selected))}>
            선택 삭제
          </PillButton>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        {loading ? (
          <div className="px-5 py-16 text-center text-[13px] text-[#8B95A1]">불러오는 중…</div>
        ) : pageData.length === 0 ? (
          <EmptyState icon={<MessageSquare size={20} className="text-[#8B95A1]" />} title="표시할 게시글이 없어요" hint="검색어나 필터를 변경해 보세요." />
        ) : (
          <>
            <div className="grid grid-cols-[36px_100px_1.8fr_1fr_140px_140px_auto] gap-4 px-5 py-3 bg-[#FAFBFC] border-b border-[#F2F4F6] text-[11px] font-semibold text-[#8B95A1] uppercase tracking-wider">
              <button
                onClick={() => {
                  const allSel = pageData.every((p) => selected.has(p.id));
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (allSel) pageData.forEach((p) => next.delete(p.id));
                    else pageData.forEach((p) => next.add(p.id));
                    return next;
                  });
                }}
                className="w-5 h-5 rounded border flex items-center justify-center"
                style={{
                  background: pageData.every((p) => selected.has(p.id)) ? '#3182F6' : '#FFFFFF',
                  borderColor: pageData.every((p) => selected.has(p.id)) ? '#3182F6' : '#C9CDD2',
                }}
              >
                {pageData.every((p) => selected.has(p.id)) && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5L6.5 12L13 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <div>게시판</div>
              <div>제목</div>
              <div>작성자</div>
              <div>통계</div>
              <div>작성일</div>
              <div className="text-right">관리</div>
            </div>
            {pageData.map((p, i) => {
              const isSel = selected.has(p.id);
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[36px_100px_1.8fr_1fr_140px_140px_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors"
                  style={{ borderBottom: i === pageData.length - 1 ? 'none' : '1px solid #F2F4F6' }}
                >
                  <button
                    onClick={() => setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
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
                  <div>
                    <StatusBadge tone={boardTone[p.board_type]}>{boardLabel[p.board_type]}</StatusBadge>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#191F28] truncate">{p.title}</p>
                  </div>
                  <div className="text-[13px] text-[#4E5968] truncate">{p.author}</div>
                  <div className="flex items-center gap-2.5 text-[12px] text-[#8B95A1]">
                    <span className="flex items-center gap-0.5"><Eye size={11} />{p.views}</span>
                    <span className="flex items-center gap-0.5"><MessageSquare size={11} />{p.comments}</span>
                    <span className="flex items-center gap-0.5"><ThumbsUp size={11} />{p.likes}</span>
                  </div>
                  <div className="text-[12px] text-[#8B95A1]">{formatDate(p.created_at)}</div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <PillButton tone="blue" onClick={() => setViewPost(p)}>
                      보기
                    </PillButton>
                    <PillButton tone="red" disabled={busy} onClick={() => handleDelete([p.id])}>
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

      <div className="bg-[#FAFBFC] border border-[#F2F4F6] rounded-2xl px-5 py-3.5 text-[13px] text-[#4E5968]">
        사용자 신고는{' '}
        <a href="/admin/community/reports" className="text-[#3182F6] font-semibold hover:underline">
          신고 관리
        </a>
        에서 처리합니다.
      </div>

      {viewPost && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setViewPost(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl p-7 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <StatusBadge tone={boardTone[viewPost.board_type]}>{boardLabel[viewPost.board_type]}</StatusBadge>
                <h3 className="text-[18px] font-bold text-[#191F28] mt-2">{viewPost.title}</h3>
              </div>
              <button onClick={() => setViewPost(null)} className="p-1 -m-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-[#8B95A1]" />
              </button>
            </div>
            <p className="text-[12px] text-[#8B95A1] mb-4">
              <span className="font-semibold text-[#4E5968]">{viewPost.author}</span> · {formatDate(viewPost.created_at)}
            </p>
            <div className="text-[14px] text-[#191F28] whitespace-pre-wrap leading-relaxed bg-[#FAFBFC] rounded-xl p-4 border border-[#F2F4F6]">
              {viewPost.content || '(내용 없음)'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
