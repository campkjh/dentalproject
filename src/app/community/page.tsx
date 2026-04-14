'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Link from 'next/link';
import Avatar from '@/components/common/Avatar';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  IconSearch,
  IconPencil,
  IconArrowUp,
  IconEye,
  IconChat,
  IconStethoscope,
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

export default function CommunityPage() {
  const { isLoggedIn, posts } = useStore();
  const [activeBoard, setActiveBoard] = useState('질문게시판');
  const [sortBy, setSortBy] = useState('최신순');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Question category sub-tabs (only shown when 질문게시판)
  const [activeCategory, setActiveCategory] = useState('전체');
  const [categoryDir, setCategoryDir] = useState<'left' | 'right'>('right');
  const prevCategoryIdxRef = useRef(0);
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const categoryBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [categoryIndicator, setCategoryIndicator] = useState({ left: 0, width: 0 });

  const changeCategory = (cat: string) => {
    const nextIdx = questionCategories.indexOf(cat);
    setCategoryDir(nextIdx >= prevCategoryIdxRef.current ? 'right' : 'left');
    prevCategoryIdxRef.current = nextIdx;
    setActiveCategory(cat);
  };

  const activeCategoryIdx = questionCategories.indexOf(activeCategory);

  useLayoutEffect(() => {
    const btn = categoryBtnRefs.current[activeCategoryIdx];
    if (!btn) return;
    setCategoryIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeCategoryIdx, activeBoard]);

  const boardType = boardTypeMap[activeBoard];
  const filteredPosts = posts.filter((p) => p.boardType === boardType);

  const categoryFilteredPosts =
    activeBoard === '질문게시판' && activeCategory !== '전체'
      ? filteredPosts.filter((p) => p.tags?.includes(activeCategory))
      : filteredPosts;

  const sortedPosts = [...categoryFilteredPosts].sort((a, b) => {
    if (sortBy === '인기순') return b.viewCount - a.viewCount;
    if (sortBy === '댓글순') return b.commentCount - a.commentCount;
    return 0; // default: 최신순 (already in order)
  });

  // Popular posts (top 5 by view count from all posts)
  const popularPosts = [...posts]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 5);

  // Recent questions for live Q&A ticker (stop-and-go)
  const liveQuestions = posts
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
    if (activeBoard !== '질문게시판' || liveQuestions.length === 0) return;
    const id = setInterval(() => {
      setTickerAnim(true);
      setTickerIdx((i) => i + 1);
    }, DWELL_MS);
    return () => clearInterval(id);
  }, [activeBoard, liveQuestions.length]);

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
    if (activeBoard === '질문게시판') return '의사에게 질문게시판';
    if (activeBoard === '자유게시판') return '자유익명게시판';
    return '방금 올라온 글';
  };

  const writeButtonLabel = activeBoard === '질문게시판' ? '질문하기' : '글쓰기';

  return (
    <div className="h-[100dvh] flex flex-col bg-white lg:h-auto lg:min-h-screen">
      <TopBar
        title="커뮤니티"
        showBack={false}
        rightContent={
          <Link href="/search">
            <IconSearch size={22} />
          </Link>
        }
      />

      {/* Board tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          {boardTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveBoard(tab)}
              className={`flex-1 py-3.5 text-[15px] font-semibold border-b-2 transition-colors ${
                activeBoard === tab
                  ? 'border-[#7C3AED] text-[#7C3AED]'
                  : 'border-transparent text-gray-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-6 page-enter"
        style={{ paddingBottom: 86 }}
      >
        {/* Popular posts - horizontal scroll */}
        {popularPosts.length > 0 && (
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
        {activeBoard === '질문게시판' && tickerItems.length > 0 && (
          <div className="bg-white px-2.5 py-4 mb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <img src="/icons/community-live-doctor-v2.svg" alt="" width={22} height={22} />
                <h3 className="text-[17px] font-bold text-gray-900">실시간 의사에게 질문</h3>
              </div>
              <Link href={`/community/write?board=question`} className="text-[13px] text-[#7C3AED] font-semibold">
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
                  const isCurrent = i === tickerIdx % liveQuestions.length;
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
                          transition: 'box-shadow 400ms ease',
                          boxShadow: isCurrent
                            ? '0 4px 14px rgba(16,24,40,0.06)'
                            : '0 1px 2px rgba(16,24,40,0.03)',
                        }}
                      >
                        <Avatar seed={post.authorId || post.id} size={40} className="flex-shrink-0" />
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
                      i === tickerIdx % liveQuestions.length ? '#7C3AED' : '#E5E7EB',
                  }}
                />
              ))}
            </div>

            <Link
              href={`/community/write?board=question`}
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
            {activeBoard === '질문게시판' && (
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
                        ? 'text-[#7C3AED] bg-[#EDE9FE]'
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
        {activeBoard === '질문게시판' && (
          <div className="bg-white px-2.5 pb-2 pt-0.5">
            <div
              ref={categoryTabsRef}
              className="relative flex gap-2 overflow-x-auto hide-scrollbar"
            >
              <span
                aria-hidden
                className="absolute top-0 bottom-0 rounded-full bg-[#7C3AED] pointer-events-none"
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
          key={`${activeBoard}-${activeCategory}`}
          className={`bg-white lg:bg-white lg:rounded-2xl lg:shadow-sm lg:p-6 stagger-children ${
            activeBoard === '질문게시판'
              ? categoryDir === 'right'
                ? 'tab-slide-right'
                : 'tab-slide-left'
              : ''
          }`}
        >
          {sortedPosts.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-gray-400">게시글이 없습니다.</p>
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
                        <Avatar seed={post.authorId || post.id} size={36} className="flex-shrink-0" />
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
                            <div className="w-full h-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center"><span className="text-gray-400 text-xs">IMG</span></div>
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

      {/* Floating write button */}
      <Link
        href={`/community/write?board=${boardType}`}
        className="fixed bottom-24 right-4 max-w-[480px] z-30 lg:fixed lg:bottom-8 lg:right-8"
        style={{ right: 'calc(50% - 215px + 16px)' }}
      >
        <div className="bg-[#7C3AED] text-white rounded-full px-5 py-3 shadow-lg flex items-center gap-2 text-[15px] font-semibold">
          <IconPencil size={20} />
          {writeButtonLabel}
        </div>
      </Link>

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
