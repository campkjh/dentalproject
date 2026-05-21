'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/common/Avatar';
import { ChevronDown, ChevronRight, PenSquare } from 'lucide-react';
import { useStore } from '@/store';
import { Post } from '@/types';

const boardTabs = ['질문게시판', '자유게시판', '과별게시판'] as const;
const sortOptions = ['최신순', '인기순', '댓글순'];
const questionCategories = ['전체', '임플란트', '교정', '치아미백', '사랑니', '스케일링', '일반진료'];

const boardTypeMap: Record<string, Post['boardType']> = {
  '질문게시판': 'question',
  '자유게시판': 'free',
  '과별게시판': 'dental',
};

export default function PartnerCommunityPage() {
  const router = useRouter();
  const { posts: storePosts } = useStore();
  const [dbPosts, setDbPosts] = useState<typeof storePosts | null>(null);
  const posts = dbPosts ?? storePosts;
  const [activeBoard, setActiveBoard] = useState<typeof boardTabs[number]>('질문게시판');
  const [sortBy, setSortBy] = useState('최신순');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [categoryDir, setCategoryDir] = useState<'left' | 'right'>('right');
  const prevCategoryIdxRef = useRef(0);
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const categoryBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [categoryIndicator, setCategoryIndicator] = useState({ left: 0, width: 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // DB에서 직접 게시글 로드
  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const sb = createClient();
    sb.from('posts')
      .select('id, board_type, title, content, author_id, view_count, like_count, comment_count, tags, has_answer, answer_count, is_anonymous, anonymous_id, created_at, author:profiles!posts_author_id_fkey(name, is_doctor)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!data) return;
        setDbPosts(data.map((p: any) => ({
          id: p.id, boardType: p.board_type, title: p.title, content: p.content,
          authorName: p.author?.name ?? '익명', authorTitle: p.author?.is_doctor ? '의사' : undefined,
          authorId: p.author_id, isAnonymous: p.is_anonymous, anonymousId: p.anonymous_id ?? undefined,
          date: p.created_at ? new Date(p.created_at).toLocaleDateString('ko-KR') : '',
          viewCount: p.view_count ?? 0, likeCount: p.like_count ?? 0, commentCount: p.comment_count ?? 0,
          tags: p.tags ?? [], hasAnswer: p.has_answer ?? false, answerCount: p.answer_count ?? 0,
        })));
      });
  }, []);

  const changeCategory = (cat: string) => {
    const nextIdx = questionCategories.indexOf(cat);
    setCategoryDir(nextIdx >= prevCategoryIdxRef.current ? 'right' : 'left');
    prevCategoryIdxRef.current = nextIdx;
    setActiveCategory(cat);
  };

  useLayoutEffect(() => {
    const btn = categoryBtnRefs.current[questionCategories.indexOf(activeCategory)];
    if (!btn) return;
    setCategoryIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeCategory, activeBoard]);

  const boardType = boardTypeMap[activeBoard];
  const filteredPosts = posts.filter((p) => p.boardType === boardType);
  const categoryFilteredPosts = activeBoard === '질문게시판' && activeCategory !== '전체'
    ? filteredPosts.filter((p) => p.tags?.includes(activeCategory))
    : filteredPosts;
  const sortedPosts = [...categoryFilteredPosts].sort((a, b) => {
    if (sortBy === '인기순') return b.viewCount - a.viewCount;
    if (sortBy === '댓글순') return b.commentCount - a.commentCount;
    return 0;
  });

  const writeHref = `/community/write?board=${boardType}`;

  return (
    <div className="partner-mobile-screen" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 게시판 탭 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
        <div style={{ display: 'flex' }}>
          {boardTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveBoard(tab); setActiveCategory('전체'); }}
              style={{
                flex: 1, padding: '14px 0', fontSize: 14, fontWeight: 600,
                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                borderBottom: activeBoard === tab ? '2px solid #3182F6' : '2px solid transparent',
                color: activeBoard === tab ? '#3182F6' : '#9CA3AF',
                background: 'none', cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 정렬 + 게시판 헤더 */}
      <div style={{ background: '#fff', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
          {activeBoard === '질문게시판' ? '의사에게 질문게시판' : activeBoard === '자유게시판' ? '자유익명게시판' : '과별게시판'}
        </span>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#6B7280', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {sortBy}<ChevronDown size={14} />
          </button>
          {showSortDropdown && (
            <div style={{ position: 'absolute', right: 0, top: 28, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 20, overflow: 'hidden' }}>
              {sortOptions.map((opt) => (
                <button key={opt} onClick={() => { setSortBy(opt); setShowSortDropdown(false); }}
                  style={{ display: 'block', width: '100%', padding: '10px 16px', fontSize: 13, textAlign: 'left', color: sortBy === opt ? '#3182F6' : '#374151', background: sortBy === opt ? '#EFF6FF' : 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 질문게시판 카테고리 탭 */}
      {activeBoard === '질문게시판' && (
        <div style={{ background: '#fff', padding: '4px 12px 8px', flexShrink: 0 }}>
          <div ref={categoryTabsRef} style={{ position: 'relative', display: 'flex', gap: 8, overflowX: 'auto' }} className="hide-scrollbar">
            <span aria-hidden style={{
              position: 'absolute', top: 0, bottom: 0, borderRadius: 9999, background: '#3182F6', pointerEvents: 'none',
              left: categoryIndicator.left, width: categoryIndicator.width,
              transition: 'left 420ms cubic-bezier(0.22, 1, 0.36, 1), width 420ms cubic-bezier(0.22, 1, 0.36, 1)',
            }} />
            {questionCategories.map((cat, i) => {
              const isActive = activeCategory === cat;
              return (
                <button key={cat} ref={(el) => { categoryBtnRefs.current[i] = el; }} onClick={() => changeCategory(cat)}
                  style={{ position: 'relative', zIndex: 1, padding: '6px 12px', borderRadius: 9999, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: isActive ? '#fff' : '#6B7280', border: `1px solid ${isActive ? 'transparent' : '#E5E7EB'}`, background: 'transparent', cursor: 'pointer' }}>
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 게시글 목록 */}
      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {sortedPosts.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 14, color: '#9CA3AF' }}>게시글이 없습니다.</p>
          </div>
        ) : (
          sortedPosts.map((post, index) => (
            <Link key={post.id} href={`/partner/community/${post.id}`} style={{ display: 'block', textDecoration: 'none' }}>
              <div style={{ padding: '16px 12px', borderBottom: index < sortedPosts.length - 1 ? '1px solid #F3F4F6' : 'none', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Avatar
                    seed={post.isAnonymous ? (post.anonymousId || post.id) : (post.authorId || post.id)}
                    role={post.boardType === 'dental' ? 'doctor' : 'user'}
                    size={34}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>
                      {post.isAnonymous ? `익명 ${post.anonymousId}` : post.authorName}
                      {post.authorTitle && <span style={{ marginLeft: 6, fontSize: 11, color: '#3182F6', fontWeight: 600 }}>의사</span>}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {post.title}
                    </p>
                    <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {post.content}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{post.date}</span>
                      {post.boardType === 'question' && (post.hasAnswer ? (
                        <span style={{ fontSize: 11, color: '#3852FF', background: '#EEF1FF', padding: '2px 8px', borderRadius: 9999, fontWeight: 600 }}>
                          {post.answerCount}명 답변
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#B88700', background: '#FFF8E1', padding: '2px 8px', borderRadius: 9999, fontWeight: 600 }}>
                          답변필요
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* 글쓰기 플로팅 버튼 */}
      <div style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 30 }}>
        <button
          onClick={() => router.push(writeHref)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 16px 0 4px', borderRadius: 9999, background: '#9255FD', boxShadow: '0 6px 20px rgba(146,85,253,0.4)', border: 'none', cursor: 'pointer' }}
        >
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#DECBFF', border: '1.5px solid #843DFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PenSquare size={16} color="#6C19FF" />
          </div>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>글쓰기</span>
        </button>
      </div>
    </div>
  );
}
