'use client';

import { useState, useRef, useEffect, useLayoutEffect, Suspense } from 'react';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Avatar from '@/components/common/Avatar';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import {
  IconArrowUp,
} from '@/components/icons/AppIcons';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import { Post } from '@/types';

const boardTabs = ['질문게시판', '자유게시판', '치과게시판'];
const sortOptions = ['최신순', '인기순', '댓글순'];
const questionCategories = ['전체', '임플란트', '교정', '치아미백', '사랑니', '스케일링', '일반진료'];

const boardTypeMap: Record<string, Post['boardType']> = {
  '질문게시판': 'question',
  '자유게시판': 'free',
  '치과게시판': 'dental',
};

type CommunityPostRow = {
  id: string;
  board_type: Post['boardType'];
  title: string;
  content: string;
  author_id: string;
  view_count?: number | null;
  like_count?: number | null;
  comment_count?: number | null;
  tags?: string[] | null;
  has_answer?: boolean | null;
  answer_count?: number | null;
  is_anonymous?: boolean | null;
  anonymous_id?: string | null;
  image_url?: string | null;
  created_at?: string | null;
  author?: {
    name?: string | null;
    is_doctor?: boolean | null;
  } | null;
};

function CommunityPageInner() {
  const searchParams = useSearchParams();
  const { isDoctor, posts: storePosts, catalogHydrated } = useStore();
  const [dbPosts, setDbPosts] = useState<typeof storePosts | null>(null);
  const posts = dbPosts ?? storePosts;
  const [activeBoard, setActiveBoard] = useState('질문게시판');
  const [sortBy, setSortBy] = useState('최신순');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Question category sub-tabs — URL ?category= 파라미터로 초기화
  const [activeCategory, setActiveCategory] = useState(() => {
    const cat = searchParams.get('category');
    return cat && questionCategories.includes(cat) ? cat : '전체';
  });
  const [categoryDir, setCategoryDir] = useState<'left' | 'right'>('right');
  const prevCategoryIdxRef = useRef(0);
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const categoryBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [categoryIndicator, setCategoryIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const sb = createClient();
    sb.from('posts')
      .select('id, board_type, title, content, author_id, view_count, like_count, comment_count, tags, has_answer, answer_count, is_anonymous, anonymous_id, image_url, created_at, author:profiles!posts_author_id_fkey(name, is_doctor)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!data) return;
        const mapped: Post[] = (data as CommunityPostRow[]).map((p) => ({
          id: p.id,
          boardType: p.board_type,
          title: p.title,
          content: p.content,
          authorName: p.author?.name ?? '익명',
          authorTitle: p.author?.is_doctor ? '의사' : undefined,
          authorId: p.author_id,
          isAnonymous: p.is_anonymous ?? undefined,
          anonymousId: p.anonymous_id ?? undefined,
          date: p.created_at ? new Date(p.created_at).toLocaleDateString('ko-KR') : '',
          viewCount: p.view_count ?? 0,
          likeCount: p.like_count ?? 0,
          commentCount: p.comment_count ?? 0,
          // base64 URL은 제외 (용량 이슈)
          imageUrl: p.image_url && !p.image_url.startsWith('data:') ? p.image_url : undefined,
          tags: p.tags ?? [],
          hasAnswer: p.has_answer ?? false,
          answerCount: p.answer_count ?? 0,
        }));
        setDbPosts(mapped);
        // ★ 상세 페이지에서 store miss 없도록 Zustand store도 동기화
        useStore.setState((s: { posts: Post[] }) => ({
          posts: [
            ...mapped,
            // store에만 있는 임시 포스트(UUID 아닌 것) 유지
            ...s.posts.filter((p) => !/^[0-9a-f]{8}-/.test(p.id)),
          ],
        }));
      });
  }, []);

  const changeCategory = (cat: string) => {
    const nextIdx = questionCategories.indexOf(cat);
    setCategoryDir(nextIdx >= prevCategoryIdxRef.current ? 'right' : 'left');
    prevCategoryIdxRef.current = nextIdx;
    setActiveCategory(cat);
  };

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
  }, [searchOpen]);

  const activeCategoryIdx = questionCategories.indexOf(activeCategory);
  const visiblePosts = isDoctor
    ? posts
    : posts.filter((p) => p.boardType === 'question');
  const effectiveActiveBoard = isDoctor ? activeBoard : '질문게시판';

  useLayoutEffect(() => {
    const btn = categoryBtnRefs.current[activeCategoryIdx];
    if (!btn) return;
    setCategoryIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeCategoryIdx, effectiveActiveBoard]);

  const boardType = boardTypeMap[effectiveActiveBoard];
  const filteredPosts = visiblePosts.filter((p) => p.boardType === boardType);

  const categoryFilteredPosts =
    effectiveActiveBoard === '질문게시판' && activeCategory !== '전체'
      ? filteredPosts.filter((p) => p.tags?.includes(activeCategory))
      : filteredPosts;
  const searchTerm = searchQuery.trim().toLowerCase();
  const searchedPosts = searchTerm
    ? categoryFilteredPosts.filter((post) => {
        const haystack = [
          post.title,
          post.content,
          post.authorName,
          post.anonymousId,
          post.authorHospital,
          ...(post.tags ?? []),
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(searchTerm);
      })
    : categoryFilteredPosts;

  const sortedPosts = [...searchedPosts].sort((a, b) => {
    if (sortBy === '인기순') return b.viewCount - a.viewCount;
    if (sortBy === '댓글순') return b.commentCount - a.commentCount;
    return 0; // default: 최신순 (already in order)
  });
  const isSearching = searchTerm.length > 0;

  // Popular posts (top 5 by view count from all posts)
  const popularPosts = [...visiblePosts]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 5);

  // Recent questions for live Q&A ticker (stop-and-go)
  const liveQuestions = visiblePosts
    .filter((p) => p.boardType === 'question')
    .slice(0, 8);
  const ITEM_HEIGHT = 92; // px per card incl. gap
  const DWELL_MS = 2400; // pause on each card
  const [tickerIdx, setTickerIdx] = useState(0);
  const [tickerAnim, setTickerAnim] = useState(true);
  const tickerItems = liveQuestions.length > 0
    ? [...liveQuestions, liveQuestions[0]] // append first to allow seamless wrap
    : [];

  useEffect(() => {
    if (effectiveActiveBoard !== '질문게시판' || liveQuestions.length === 0) return;
    const id = setInterval(() => {
      setTickerAnim(true);
      setTickerIdx((i) => i + 1);
    }, DWELL_MS);
    return () => clearInterval(id);
  }, [effectiveActiveBoard, liveQuestions.length]);

  const handleTickerTransitionEnd = () => {
    if (tickerIdx >= liveQuestions.length) {
      setTickerAnim(false);
      setTickerIdx(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setTickerAnim(true));
      });
    }
  };

  const categoryEmoji: Record<string, string> = {
    '임플란트': '🦷',
    '치아교정': '💠',
    '사랑니': '🪥',
    '라미네이트': '✨',
    '치아미백': '🤍',
    '스케일링': '🫧',
    '충치치료': '🩹',
    '턱관절': '💊',
  };
  const pickCategory = (post: Post) =>
    post.tags?.find((t) => categoryEmoji[t]) || post.tags?.[0] || '치과 상담';

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setShowScrollTop(scrollContainerRef.current.scrollTop > 300);
    }
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const boardHeader = () => {
    if (effectiveActiveBoard === '질문게시판') return '의사에게 질문게시판';
    if (effectiveActiveBoard === '자유게시판') return '자유익명게시판';
    return '방금 올라온 글';
  };

  const writeButtonLabel = effectiveActiveBoard === '질문게시판' ? '질문하기' : '글쓰기';

  return (
    <div className="h-[100dvh] flex flex-col bg-white lg:h-auto lg:min-h-screen">
      <TopBar
        title="커뮤니티"
        showBack={false}
        rightContent={
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full"
            aria-label="커뮤니티 검색"
            aria-expanded={searchOpen}
          >
            <Search size={20} strokeWidth={2.2} className="text-gray-900" />
          </button>
        }
      />

      <div
        className={`bg-white px-2.5 overflow-hidden transition-all duration-300 ease-out ${
          searchOpen ? 'max-h-[64px] pb-3 opacity-100' : 'max-h-0 pb-0 opacity-0'
        }`}
        aria-hidden={!searchOpen}
      >
        <div className="flex h-11 items-center gap-2 rounded-[14px] bg-[#F2F3F5] px-3 text-[#A4ABBA]">
          <Search size={18} strokeWidth={2.2} className="flex-shrink-0" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="커뮤니티 글 검색"
            aria-label="커뮤니티 글 검색"
            disabled={!searchOpen}
            className="min-w-0 flex-1 bg-transparent text-[16px] font-medium leading-6 text-[#2B313D] outline-none placeholder:text-[#A4ABBA] focus:outline-none focus:ring-0"
          />
          {(searchQuery || searchOpen) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchOpen(false);
              }}
              className="flex-shrink-0 text-[14px] font-bold text-[#51535C]"
            >
              취소
            </button>
          )}
        </div>
      </div>

      {/* Board tabs */}
      {isDoctor && (
        <div className="bg-white border-b border-gray-200">
          <div className="flex">
            {boardTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveBoard(tab)}
                className={`flex-1 py-3.5 text-[15px] font-semibold border-b-2 transition-colors ${
                  effectiveActiveBoard === tab
                    ? 'border-[#8037FF] text-[#8037FF]'
                    : 'border-transparent text-gray-400'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-6 page-enter"
        style={{ paddingBottom: 86 }}
      >
        {/* Skeleton */}
        {!catalogHydrated && posts.length === 0 && <CommunitySkeleton />}

        {/* Popular posts - horizontal scroll */}
        {!isSearching && popularPosts.length > 0 && (
          <div className="bg-white px-2.5 py-4 mb-2">
            <h3 className="text-[17px] font-bold text-gray-900 mb-3">
              인기글
            </h3>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-x-visible">
              {popularPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/community/${post.id}`}
                  className="flex-shrink-0 w-52 bg-gray-50 rounded-xl p-3.5"
                >
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-0.5">
                      <img src="/icons/community-views.svg" alt="" width={14} height={14} />
                      {post.viewCount}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <img src="/icons/community-comments.svg" alt="" width={14} height={14} />
                      {post.commentCount}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Live doctor Q&A - question board only */}
        {!isSearching && effectiveActiveBoard === '질문게시판' && tickerItems.length > 0 && (
          <div className="bg-white px-2.5 py-4 mb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <img src="/icons/community-live-doctor-v2.svg" alt="" width={22} height={22} />
                <h3 className="text-[17px] font-bold text-gray-900">실시간 의사에게 질문</h3>
              </div>
              <Link href={`/community/write?board=question`} className="text-[13px] text-[#8037FF] font-semibold">
                질문하기
              </Link>
            </div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
              <p className="text-xs text-gray-500">방금 올라온 질문 · 방금 전</p>
            </div>

            <div
              className="relative overflow-hidden"
              style={{ height: ITEM_HEIGHT }}
            >
              <div
                onTransitionEnd={handleTickerTransitionEnd}
                style={{
                  transform: `translateY(-${tickerIdx * ITEM_HEIGHT}px)`,
                  transition: tickerAnim
                    ? 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)'
                    : 'none',
                }}
              >
                {tickerItems.map((post, i) => {
                  const cat = pickCategory(post);
                  return (
                    <div
                      key={`${post.id}-${i}`}
                      style={{ height: ITEM_HEIGHT, padding: '6px 4px', boxSizing: 'border-box' }}
                    >
                      <Link
                        href={`/community/${post.id}`}
                        className="flex items-center gap-3 bg-white h-full w-full px-3 border border-gray-100"
                        style={{
                          borderRadius: 12,
                        }}
                      >
                        <Avatar role={post.authorTitle ? 'doctor' : 'user'} seed={post.authorId || post.id} size={40} className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {post.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-gray-600 bg-gray-100 rounded px-1.5 py-0.5 flex-shrink-0 font-medium">
                              {cat}
                            </span>
                            <p className="text-xs text-gray-500 truncate">
                              {post.content}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1 mt-2.5">
              {liveQuestions.map((_, i) => (
                <span
                  key={i}
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: i === tickerIdx % liveQuestions.length ? 14 : 4,
                    backgroundColor:
                      i === tickerIdx % liveQuestions.length ? '#8037FF' : '#E5E7EB',
                  }}
                />
              ))}
            </div>

            <Link
              href={`/community/live`}
              className="mt-3 flex items-center justify-between w-full px-3 py-3 rounded-xl border border-gray-200 text-gray-700"
            >
              <span className="text-sm font-medium">질문 전체 보기</span>
              <ChevronRight size={16} className="text-gray-400" />
            </Link>
          </div>
        )}

        {/* Board header + sort */}
        <div className="bg-white px-2.5 py-3 flex items-center justify-between mb-px">
          <div className="flex items-center gap-2">
            {effectiveActiveBoard === '질문게시판' && (
              <img src="/icons/community-doctor-board-v2.svg" alt="" width={22} height={22} />
            )}
            <h3 className="text-[17px] font-bold text-gray-900">{boardHeader()}</h3>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-1 text-sm text-gray-500 font-medium"
            >
              {sortBy}
              <ChevronDown size={16} />
            </button>
            {showSortDropdown && (
              <div className="absolute right-0 top-7 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                {sortOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setSortBy(option);
                      setShowSortDropdown(false);
                    }}
                    className={`block w-full px-3 py-2.5 text-sm text-left whitespace-nowrap ${
                      sortBy === option
                        ? 'text-[#8037FF] bg-[#F4EFFF]'
                        : 'text-gray-600'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Question category sub-tabs */}
        {effectiveActiveBoard === '질문게시판' && (
          <div className="bg-white px-2.5 pb-2 pt-0.5">
            <div
              ref={categoryTabsRef}
              className="relative flex gap-2 overflow-x-auto hide-scrollbar"
            >
              <span
                aria-hidden
                className="absolute top-0 bottom-0 rounded-full bg-[#8037FF] pointer-events-none"
                style={{
                  left: categoryIndicator.left,
                  width: categoryIndicator.width,
                  transition:
                    'left 420ms cubic-bezier(0.22, 1, 0.36, 1), width 420ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
              {questionCategories.map((cat, i) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    ref={(el) => {
                      categoryBtnRefs.current[i] = el;
                    }}
                    onClick={() => changeCategory(cat)}
                    className={`pill-tab relative z-10 px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap ${
                      isActive ? 'text-white' : 'text-gray-500'
                    }`}
                    style={{
                      transition: 'color 420ms cubic-bezier(0.22, 1, 0.36, 1)',
                      border: `1px solid ${isActive ? 'transparent' : '#E5E7EB'}`,
                      background: 'transparent',
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Post list */}
        <div
          key={`${effectiveActiveBoard}-${activeCategory}`}
          className={`bg-white lg:bg-white lg:rounded-2xl lg:shadow-sm lg:p-6 stagger-children ${
            effectiveActiveBoard === '질문게시판'
              ? categoryDir === 'right'
                ? 'tab-slide-right'
                : 'tab-slide-left'
              : ''
          }`}
        >
          {dbPosts === null ? (
            /* 로딩 스켈레톤 */
            <div>
              {[0,1,2,3,4,5].map((i) => (
                <div key={i} className="px-2.5 py-4 border-b border-gray-100 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 w-24 bg-gray-100 rounded mb-2" />
                      <div className="h-4 w-full bg-gray-100 rounded mb-1.5" />
                      <div className="h-3 w-4/5 bg-gray-100 rounded mb-1.5" />
                      <div className="h-3 w-2/5 bg-gray-100 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : sortedPosts.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-gray-400">
                {isSearching ? '검색 결과가 없습니다.' : '게시글이 없습니다.'}
              </p>
            </div>
          ) : (
            sortedPosts.map((post, index) => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="block"
              >
                <div
                  className={`px-2.5 py-4 hover-lift ${
                    index < sortedPosts.length - 1
                      ? 'border-b border-gray-100'
                      : ''
                  }`}
                >
                  {/* Question board style */}
                  {post.boardType === 'question' && (
                    <>
                      <div className="flex items-start gap-3">
                        <Avatar role={post.authorTitle ? 'doctor' : 'user'} seed={post.authorId || post.id} size={36} className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-500 mb-1">
                            {post.authorName || '익명'}
                          </p>
                          <p className="text-[15px] font-bold text-gray-900 line-clamp-2 leading-snug">
                            {post.title}
                          </p>
                          <p className="text-[13px] text-gray-500 mt-1 line-clamp-2 leading-snug">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-400">
                              {post.date}
                            </span>
                            {post.hasAnswer && post.answerCount && post.answerCount > 0 ? (
                              <span className="inline-flex items-center gap-1 pl-1 pr-2 py-0.5 bg-[#EEF1FF] text-[#3852FF] text-[12px] rounded-full font-semibold">
                                <img src="/icons/community-answer.svg" alt="" width={18} height={18} />
                                {post.answerCount}명이 답변했어요
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 pl-1 pr-2 py-0.5 bg-[#FFF8E1] text-[#B88700] text-[12px] rounded-full font-semibold">
                                <img src="/icons/community-need-answer.svg" alt="" width={18} height={18} />
                                답변이 필요해요!
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Free board style */}
                  {post.boardType === 'free' && (
                    <>
                      <div className="flex items-start gap-3">
                        <Avatar seed={post.anonymousId || post.authorId || post.id} size={36} className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-500 mb-1">
                            익명 {post.anonymousId}
                          </p>
                          <p className="text-[15px] font-bold text-gray-900 line-clamp-2 leading-snug">
                            {post.title}
                          </p>
                          <p className="text-[13px] text-gray-500 mt-1 line-clamp-2 leading-snug">
                            {post.content}
                          </p>
                          <span className="text-xs text-gray-400 mt-2 block">
                            {post.date}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Dental board style */}
                  {post.boardType === 'dental' && (
                    <>
                      <div className="flex items-start gap-3">
                        <Avatar role="doctor" seed={post.authorId || post.id} size={36} className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-500 mb-1">
                            {post.authorName}
                            {post.authorHospital && (
                              <span className="text-gray-300 mx-1">|</span>
                            )}
                            <span className="text-gray-400">
                              {post.authorHospital}
                            </span>
                          </p>
                          <p className="text-[15px] font-bold text-gray-900 line-clamp-2 leading-snug">
                            {post.title}
                          </p>
                          <p className="text-[13px] text-gray-500 mt-1 line-clamp-2 leading-snug">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-400">
                              {post.date}
                            </span>
                            <span className="flex items-center gap-0.5 text-xs text-gray-400">
                              <img src="/icons/community-views.svg" alt="" width={14} height={14} />
                              {post.viewCount}
                            </span>
                            <span className="flex items-center gap-0.5 text-xs text-gray-400">
                              <img src="/icons/community-comments.svg" alt="" width={14} height={14} />
                              {post.commentCount}
                            </span>
                          </div>
                          {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {post.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[11px] rounded-full font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {post.imageUrl && (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 relative">
                            <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-100 flex items-center justify-center"><span className="text-gray-400 text-xs">IMG</span></div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Floating write button — circle→pill expand + train border animation */}
      <FloatingAskButton label={writeButtonLabel} href={`/community/write?board=${boardType}`} scrollContainer={scrollContainerRef} />

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-40 right-4 z-30 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center"
          style={{ right: 'calc(50% - 215px + 16px)' }}
        >
          <IconArrowUp size={20} />
        </button>
      )}

    </div>
  );
}

/* ===================== Floating Ask Button ===================== */

function PillBorderTrain({ w, h }: { w: number; h: number }) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path || w === 0) return;
    const perimeter = path.getTotalLength();
    const trainLen = perimeter * 0.12;
    path.setAttribute('stroke-dasharray', `${trainLen} ${perimeter - trainLen}`);
    path.style.animation = `pillDash ${Math.max(3.5, perimeter / 45)}s linear infinite`;
  }, [w, h]);

  if (w === 0) return null;
  const inset = 1;
  const radius = (h - inset * 2) / 2;
  const left = inset;
  const top = inset;
  const right = w - inset;
  const bottom = h - inset;
  const d = `M ${left + radius},${top} L ${right - radius},${top} A ${radius},${radius} 0 0 1 ${right - radius},${bottom} L ${left + radius},${bottom} A ${radius},${radius} 0 0 1 ${left + radius},${top} Z`;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      style={{ overflow: 'visible' }}
    >
      <path
        ref={pathRef}
        d={d}
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{
          filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.6)) drop-shadow(0 0 6px rgba(255,255,255,0.3))',
        }}
      />
    </svg>
  );
}

function FloatingAskButton({
  label,
  href,
  scrollContainer,
}: {
  label: string;
  href: string;
  scrollContainer: React.RefObject<HTMLDivElement | null>;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const lastScrollY = useRef(0);

  // 2초 후 원형→알약 확장
  useEffect(() => {
    const t = setTimeout(() => setExpanded(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // 스크롤 방향 감지 — 실제 스크롤 컨테이너에 바인딩
  useEffect(() => {
    const el = scrollContainer.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = el.scrollTop;
        const delta = y - lastScrollY.current;
        if (delta > 15) {
          setExpanded(false);
        } else if (delta < -15) {
          setExpanded(true);
        }
        lastScrollY.current = y;
        ticking = false;
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollContainer]);

  // 사이즈 측정 — getBoundingClientRect로 padding 포함 실제 크기
  useEffect(() => {
    if (!btnRef.current) return;
    const measure = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0) {
        setSize({ w: rect.width, h: rect.height });
      }
    };
    const ro = new ResizeObserver(measure);
    ro.observe(btnRef.current);
    return () => ro.disconnect();
  }, []);

  const isPill = expanded;

  return (
    <div
      className="fixed z-30"
      style={{ bottom: 96, right: 16 }}
    >
      <button
        ref={btnRef}
        onClick={() => router.push(href)}
        className="relative inline-flex items-center active:scale-95"
        style={{
          borderRadius: 9999,
          height: 44,
          paddingLeft: 4,
          paddingRight: isPill ? 16 : 4,
          gap: isPill ? 8 : 0,
          backgroundColor: '#9255FD',
          boxShadow: '0 6px 20px rgba(146,85,253,0.4)',
          transition: 'padding 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), gap 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transformOrigin: 'right center',
        }}
      >
        {isPill && size.w > 0 && <PillBorderTrain w={size.w} h={size.h} />}

        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: '#DECBFF',
            border: '1.5px solid #843DFF',
          }}
        >
          <span style={{ color: '#6C19FF', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>?</span>
        </div>

        <span
          className="text-white font-semibold whitespace-nowrap overflow-hidden"
          style={{
            fontSize: 14,
            maxWidth: isPill ? 80 : 0,
            opacity: isPill ? 1 : 0,
            transform: isPill ? 'translateX(0)' : 'translateX(-6px)',
            transition: 'max-width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease 0.15s, transform 0.35s ease 0.15s',
          }}
        >
          {label}
        </span>
      </button>
    </div>
  );
}

function CommunitySkeleton() {
  return (
    <div className="px-2.5 py-4 space-y-5">
      {/* 인기글 skeleton */}
      <div>
        <div className="skeleton h-5 w-16 mb-3" />
        <div className="flex gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-52 bg-gray-50 rounded-xl p-3.5 space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2 mt-2" />
            </div>
          ))}
        </div>
      </div>

      {/* 라이브 Q&A skeleton */}
      <div className="skeleton h-24 rounded-xl" />

      {/* 게시글 리스트 skeleton */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="skeleton h-5 w-32" />
          <div className="skeleton h-4 w-16 rounded-full" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="py-4 border-b border-gray-50 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="skeleton w-6 h-6 rounded-full" />
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-3 w-12" />
            </div>
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton h-3 w-2/5 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={null}>
      <CommunityPageInner />
    </Suspense>
  );
}
