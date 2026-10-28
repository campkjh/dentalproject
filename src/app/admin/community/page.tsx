'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { Trash2, Eye, MessageSquare, ThumbsUp } from 'lucide-react';
import {
  FilterChips, SearchInput, StatCard, StatRow, PillButton, StatusBadge, EmptyState,
  AdminListCard, Toolbar, Count, TableFoot, LoadingRows, AdminModal,
} from '@/components/admin/ui';

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
const boardTone: Record<BoardType, 'blue' | 'green' | 'orange'> = {
  question: 'blue', free: 'green', dental: 'orange',
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

  const GRID = 'grid grid-cols-[36px_100px_1.8fr_1fr_140px_140px_auto] gap-4 items-center';
  const allSel = pageData.length > 0 && pageData.every((p) => selected.has(p.id));

  // 제목·설명은 레이아웃이 '게시글 · 신고' 제목 탭과 함께 그린다
  return (
    <div className="adm-stack">
      <StatRow cols={4}>
        <StatCard label="전체 게시글" value={counts.total} suffix="개" />
        <StatCard label="오늘 작성" value={counts.today} suffix="개" accent="#1AB554" />
        <StatCard label="질문게시판" value={counts.question} suffix="개" accent="#3182F6" />
        <StatCard label="자유/치과" value={counts.others} suffix="개" />
      </StatRow>

      {selected.size > 0 && (
        <div className="adm-selbar">
          <span className="text-[14px] font-semibold">{selected.size}개 선택됨</span>
          <span className="grow" />
          <button type="button" className="adm-btn sm danger-solid" disabled={busy} onClick={() => handleDelete(Array.from(selected))}>
            <Trash2 size={14} /> 선택 삭제
          </button>
        </div>
      )}

      <AdminListCard
        filter={
          <>
            <Toolbar>
              <SearchInput value={search} onChange={setSearch} placeholder="제목, 내용, 작성자 검색" width={300} />
              <span className="grow" />
              <Count n={filtered.length} unit="개" />
            </Toolbar>
            <Toolbar>
              <FilterChips
                value={activeBoard}
                onChange={setActiveBoard}
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'question', label: '질문' },
                  { value: 'free', label: '자유' },
                  { value: 'dental', label: '치과' },
                ]}
                ariaLabel="게시판"
              />
            </Toolbar>
          </>
        }
      >
        {loading ? (
          <LoadingRows />
        ) : pageData.length === 0 ? (
          <EmptyState icon={<MessageSquare size={22} />} title="표시할 게시글이 없어요" hint="검색어나 거르기를 바꿔 보세요." />
        ) : (
          <div className="adm-tscroll">
            <div className="adm-tscroll-in">
              <div className={`${GRID} adm-ghead`}>
                <CheckBox
                  checked={allSel}
                  ariaLabel="이 화면 게시글 모두 고르기"
                  onClick={() => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (allSel) pageData.forEach((p) => next.delete(p.id));
                      else pageData.forEach((p) => next.add(p.id));
                      return next;
                    });
                  }}
                />
                <div>게시판</div>
                <div>제목</div>
                <div>작성자</div>
                <div>통계</div>
                <div>작성일</div>
                <div className="text-right">관리</div>
              </div>
              {pageData.map((p) => {
                const isSel = selected.has(p.id);
                return (
                  <div key={p.id} className={`${GRID} adm-grow`}>
                    <CheckBox
                      checked={isSel}
                      ariaLabel="게시글 고르기"
                      onClick={() => setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                        return next;
                      })}
                    />
                    <div>
                      <StatusBadge tone={boardTone[p.board_type]}>{boardLabel[p.board_type]}</StatusBadge>
                    </div>
                    <div className="adm-cell-main truncate">{p.title}</div>
                    <div className="adm-cell truncate">{p.author}</div>
                    <div className="adm-cell dim flex items-center gap-2.5">
                      <span className="flex items-center gap-1"><Eye size={13} />{p.views}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={13} />{p.comments}</span>
                      <span className="flex items-center gap-1"><ThumbsUp size={13} />{p.likes}</span>
                    </div>
                    <div className="adm-cell dim">{formatDate(p.created_at)}</div>
                    <div className="adm-actions">
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
            </div>
          </div>
        )}
        {!loading && <TableFoot total={filtered.length} shown={visibleCount} sentinelRef={sentinelRef} />}
      </AdminListCard>

      {viewPost && (
        <AdminModal
          onClose={() => setViewPost(null)}
          width={640}
          title={viewPost.title}
          sub={<>{viewPost.author} · {formatDate(viewPost.created_at)}</>}
          actions={<button type="button" className="adm-btn" onClick={() => setViewPost(null)}>닫기</button>}
        >
          <div className="mb-3">
            <StatusBadge tone={boardTone[viewPost.board_type]}>{boardLabel[viewPost.board_type]}</StatusBadge>
          </div>
          <div className="adm-kvbox whitespace-pre-wrap py-4 text-[14px] leading-relaxed text-[#191F28]">
            {viewPost.content || '(내용 없음)'}
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
