'use client';

import { useState, useEffect } from 'react';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/common/Avatar';
import { ChevronDown, CircleHelp, MessageCircle, PenSquare, Search } from 'lucide-react';
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

  // DB에서 직접 게시글 로드 + store 동기화
  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const sb = createClient();
    sb.from('posts')
      .select('id, board_type, title, content, author_id, view_count, like_count, comment_count, tags, has_answer, answer_count, is_anonymous, anonymous_id, image_url, created_at, author:profiles!posts_author_id_fkey(name, is_doctor)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!data) return;
        const mapped = data.map((p: any) => ({
          id: p.id, boardType: p.board_type, title: p.title, content: p.content,
          authorName: p.author?.name ?? '익명', authorTitle: p.author?.is_doctor ? '의사' : undefined,
          authorId: p.author_id, isAnonymous: p.is_anonymous, anonymousId: p.anonymous_id ?? undefined,
          date: p.created_at ? new Date(p.created_at).toLocaleDateString('ko-KR') : '',
          viewCount: p.view_count ?? 0, likeCount: p.like_count ?? 0, commentCount: p.comment_count ?? 0,
          imageUrl: p.image_url && !p.image_url.startsWith('data:') ? p.image_url : undefined,
          tags: p.tags ?? [], hasAnswer: p.has_answer ?? false, answerCount: p.answer_count ?? 0,
        }));
        setDbPosts(mapped);
        // 상세 페이지 store miss 방지
        useStore.setState((s: any) => ({
          posts: [
            ...mapped,
            ...s.posts.filter((p: any) => !/^[0-9a-f]{8}-/.test(p.id)),
          ],
        }));
      });
  }, []);

  const changeCategory = (cat: string) => {
    setActiveCategory(cat);
  };

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
  const boardTitle = activeBoard === '질문게시판'
    ? '의사에게 질문게시판'
    : activeBoard === '자유게시판'
      ? '자유익명게시판'
      : '치과';
  const isQuestionBoard = activeBoard === '질문게시판';
  const isFreeBoard = activeBoard === '자유게시판';
  const isDepartmentBoard = activeBoard === '과별게시판';

  const writeHref = `/community/write?board=${boardType}`;

  return (
    <div className="partner-mobile-screen partner-community-screen">
      <header className="partner-community-head">
        <div className="partner-community-tabs" role="tablist" aria-label="커뮤니티 게시판">
          {boardTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeBoard === tab}
              onClick={() => { setActiveBoard(tab); setActiveCategory('전체'); }}
              className={activeBoard === tab ? 'is-active' : undefined}
            >
              {tab}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="partner-community-search"
          aria-label="커뮤니티 검색"
          onClick={() => router.push('/community/search')}
        >
          <Search size={20} strokeWidth={2.2} />
        </button>
      </header>

      <section className="partner-community-title-row">
        <h1>{boardTitle}</h1>
        <div className="partner-community-sort">
          <button
            type="button"
            onClick={() => setShowSortDropdown(!showSortDropdown)}
          >
            {sortBy}<ChevronDown size={14} />
          </button>
          {showSortDropdown && (
            <div className="partner-community-sort-menu">
              {sortOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={sortBy === opt ? 'is-active' : undefined}
                  onClick={() => { setSortBy(opt); setShowSortDropdown(false); }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {isQuestionBoard && (
        <div className="partner-community-category-shell">
          <div className="partner-community-categories hide-scrollbar">
            {questionCategories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => changeCategory(cat)}
                  className={isActive ? 'is-active' : undefined}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="partner-community-list">
        {dbPosts === null ? (
          <div>
            {[0,1,2,3,4].map((i) => (
              <div key={i} className="partner-community-skeleton">
                <div className="animate-pulse" />
                <div>
                  <span className="animate-pulse" />
                  <span className="animate-pulse" />
                  <span className="animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="partner-community-empty">
            <p>게시글이 없습니다.</p>
          </div>
        ) : (
          sortedPosts.map((post) => (
            <Link
              key={post.id}
              href={`/partner/community/${post.id}`}
              className={[
                'partner-community-post',
                isQuestionBoard ? 'is-question' : '',
                isFreeBoard ? 'is-free' : '',
                isDepartmentBoard ? 'is-department' : '',
              ].filter(Boolean).join(' ')}
            >
              <article>
                {isDepartmentBoard && (
                  <div className="partner-community-author-row">
                    <Avatar
                      seed={post.isAnonymous ? (post.anonymousId || post.id) : (post.authorId || post.id)}
                      role={post.authorTitle ? 'doctor' : 'user'}
                      size={48}
                    />
                    <div>
                      <strong>{post.authorName || '정준 대표원장'}</strong>
                      <p>{post.authorTitle ? '피부과 전문의·레셋피부과의원 강남' : '치과 전문의·파트너 병원'}</p>
                    </div>
                    <span>{post.date || '2026.04.14'}</span>
                  </div>
                )}

                {isFreeBoard && (
                  <p className="partner-community-anonymous">
                    익명 {post.anonymousId || post.id.slice(0, 7)}
                  </p>
                )}

                <h2>{post.title}</h2>
                <p className="partner-community-body">{post.content}</p>

                {isQuestionBoard && (
                  <div className="partner-community-question-meta">
                    {post.hasAnswer ? (
                      <>
                        <MessageCircle size={26} />
                        <strong>{post.answerCount}명 답변</strong>
                      </>
                    ) : (
                      <>
                        <CircleHelp size={30} fill="#2b313d" color="#2b313d" />
                        <strong>답변이 필요해요!</strong>
                      </>
                    )}
                    <span>{post.date || '2026.04.14'}</span>
                  </div>
                )}
              </article>
            </Link>
          ))
        )}
      </div>

      <div className="partner-community-write">
        <button
          onClick={() => router.push(writeHref)}
          type="button"
        >
          <span>
            <PenSquare size={16} />
          </span>
          글쓰기
        </button>
      </div>
    </div>
  );
}
