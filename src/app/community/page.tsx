'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Search, Pencil, ArrowUp, Eye, MessageCircle, ChevronDown } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import { Post } from '@/types';

const boardTabs = ['질문게시판', '자유게시판', '치과게시판'];
const sortOptions = ['최신순', '인기순', '댓글순'];

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

  const boardType = boardTypeMap[activeBoard];
  const filteredPosts = posts.filter((p) => p.boardType === boardType);

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === '인기순') return b.viewCount - a.viewCount;
    if (sortBy === '댓글순') return b.commentCount - a.commentCount;
    return 0; // default: 최신순 (already in order)
  });

  // Popular posts (top 5 by view count from all posts)
  const popularPosts = [...posts]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 5);

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
    <div className="min-h-screen bg-gray-50 pb-[86px] lg:pb-0">
      <TopBar
        title="커뮤니티"
        showBack={false}
        rightContent={
          <Link href="/search">
            <Search size={22} className="text-gray-700" />
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
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
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
        className="overflow-y-auto lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-6 page-enter"
        style={{ height: 'calc(100dvh - 48px - 45px - 72px)' }}
      >
        {/* Popular posts - horizontal scroll */}
        {popularPosts.length > 0 && (
          <div className="bg-white px-2.5 py-4 mb-2">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              인기글
            </h3>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-x-visible">
              {popularPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/community/${post.id}`}
                  className="flex-shrink-0 w-48 bg-gray-50 rounded-xl p-3"
                >
                  <p className="text-xs font-medium text-gray-900 line-clamp-2 mb-2">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    <span className="flex items-center gap-0.5">
                      <Eye size={10} />
                      {post.viewCount}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MessageCircle size={10} />
                      {post.commentCount}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Board header + sort */}
        <div className="bg-white px-2.5 py-3 flex items-center justify-between mb-px">
          <h3 className="text-sm font-bold text-gray-900">{boardHeader()}</h3>
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-1 text-xs text-gray-500"
            >
              {sortBy}
              <ChevronDown size={14} />
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
                    className={`block w-full px-2.5 py-2.5 text-xs text-left whitespace-nowrap ${
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

        {/* Post list */}
        <div className="bg-white lg:bg-white lg:rounded-2xl lg:shadow-sm lg:p-6 stagger-children">
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
                        <div className="w-9 h-9 rounded-full bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#7C3AED]">
                            {post.authorName?.charAt(0) || 'Q'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">
                            {post.authorName || '익명'}
                          </p>
                          <p className="text-sm font-bold text-gray-900 line-clamp-2">
                            {post.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-gray-400">
                              {post.date}
                            </span>
                            {post.hasAnswer && post.answerCount && post.answerCount > 0 ? (
                              <span className="px-2 py-0.5 bg-[#EDE9FE] text-[#7C3AED] text-[10px] rounded-full font-medium">
                                {post.answerCount}명이 답변했어요
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[10px] rounded-full font-medium">
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
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-gray-500">
                            {post.anonymousId?.slice(0, 2) || '??'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">
                            익명 {post.anonymousId}
                          </p>
                          <p className="text-sm font-bold text-gray-900 line-clamp-2">
                            {post.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {post.content}
                          </p>
                          <span className="text-[10px] text-gray-400 mt-2 block">
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
                        <div className="w-9 h-9 rounded-full bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#7C3AED]">
                            {post.authorName?.charAt(0) || 'D'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">
                            {post.authorName}
                            {post.authorHospital && (
                              <span className="text-gray-300 mx-1">|</span>
                            )}
                            <span className="text-gray-400">
                              {post.authorHospital}
                            </span>
                          </p>
                          <p className="text-sm font-bold text-gray-900 line-clamp-2">
                            {post.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-gray-400">
                              {post.date}
                            </span>
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                              <Eye size={10} />
                              {post.viewCount}
                            </span>
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                              <MessageCircle size={10} />
                              {post.commentCount}
                            </span>
                          </div>
                          {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {post.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full"
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
        className="fixed bottom-24 right-4 max-w-[430px] z-30 lg:fixed lg:bottom-8 lg:right-8"
        style={{ right: 'calc(50% - 215px + 16px)' }}
      >
        <div className="bg-[#7C3AED] text-white rounded-full px-5 py-3 shadow-lg flex items-center gap-2 text-sm font-medium">
          <Pencil size={16} />
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
          <ArrowUp size={18} className="text-gray-500" />
        </button>
      )}

    </div>
  );
}
