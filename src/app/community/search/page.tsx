'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search as SearchIcon, X, Eye } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import { useStore } from '@/store';

const boardLabel: Record<string, string> = {
  question: '질문게시판',
  free: '자유게시판',
  dental: '치과게시판',
};

const scopes: { id: 'all' | 'question' | 'free' | 'dental'; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'question', label: '질문' },
  { id: 'free', label: '자유' },
  { id: 'dental', label: '치과' },
];

const popularKeywords = ['임플란트', '치아교정', '사랑니', '치아미백', '스케일링'];

export default function CommunitySearchPage() {
  const router = useRouter();
  const { posts } = useStore();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'question' | 'free' | 'dental'>('all');
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    try {
      const saved = JSON.parse(localStorage.getItem('communityRecentSearches') || '[]');
      if (Array.isArray(saved)) setRecent(saved);
    } catch {}
  }, []);

  const persist = (list: string[]) => {
    setRecent(list);
    try {
      localStorage.setItem('communityRecentSearches', JSON.stringify(list));
    } catch {}
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, 10);
    persist(next);
  };

  const removeRecent = (t: string) => {
    persist(recent.filter((r) => r !== t));
  };

  const clearAllRecent = () => persist([]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return posts.filter((p) => {
      const matchesScope = scope === 'all' || p.boardType === scope;
      if (!matchesScope) return false;
      const hay = `${p.title} ${p.content} ${p.tags?.join(' ') ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, scope, posts]);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto">
      {/* Header: back + input */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 px-2.5 h-12">
          <button onClick={() => router.back()} className="p-1 -ml-1 flex-shrink-0">
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <form onSubmit={handleSubmit} className="flex-1">
            <div
              className="flex items-center gap-2 px-3 w-full"
              style={{
                height: 40,
                borderRadius: 9999,
                backgroundColor: '#F4F5F7',
              }}
            >
              <SearchIcon size={16} className="text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="커뮤니티에서 검색"
                className="flex-1 text-[14px] outline-none bg-transparent placeholder:text-gray-400"
              />
              {hasQuery && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="w-5 h-5 rounded-full bg-gray-300/60 flex items-center justify-center flex-shrink-0"
                >
                  <X size={11} className="text-white" strokeWidth={3} />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Scope tabs */}
        <div className="flex gap-1.5 px-2.5 pb-2 overflow-x-auto hide-scrollbar">
          {scopes.map((s) => {
            const active = scope === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setScope(s.id)}
                className="pill-tab px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap"
                style={{
                  backgroundColor: active ? '#2B313D' : '#F4F5F7',
                  color: active ? '#fff' : '#51535C',
                  transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      {hasQuery ? (
        <div className="px-2.5 pt-3">
          <p className="text-[12px] text-gray-500 mb-2">
            <span className="text-gray-900 font-semibold">{results.length}</span>건의 결과
          </p>
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-gray-500 mb-1">검색 결과가 없습니다.</p>
              <p className="text-xs text-gray-400">다른 키워드로 검색해 보세요.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((post) => (
                <Link
                  key={post.id}
                  href={`/community/${post.id}`}
                  onClick={() => {
                    // persist current query as recent
                    if (query.trim()) {
                      const q = query.trim();
                      const next = [q, ...recent.filter((r) => r !== q)].slice(0, 10);
                      persist(next);
                    }
                  }}
                  className="block py-3.5 card-press"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      seed={post.anonymousId || post.authorId || post.id}
                      size={36}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-semibold text-[#7C3AED] bg-[#EDE9FE] rounded px-1.5 py-0.5 leading-none">
                          {boardLabel[post.boardType]}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {post.isAnonymous ? `익명 ${post.anonymousId}` : post.authorName}
                        </span>
                      </div>
                      <p className="text-[14px] font-bold text-gray-900 line-clamp-1 leading-snug">
                        <Highlight text={post.title} term={query.trim()} />
                      </p>
                      <p className="text-[12px] text-gray-500 line-clamp-2 leading-snug mt-0.5">
                        <Highlight text={post.content} term={query.trim()} />
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-gray-400">{post.date}</span>
                        <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                          <Eye size={10} />
                          {post.viewCount}
                        </span>
                        <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                          <img
                            src="/icons/community-comments.svg"
                            alt=""
                            width={11}
                            height={11}
                          />
                          {post.commentCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="pt-3">
          {/* Recent */}
          {recent.length > 0 && (
            <div className="px-2.5 mb-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13px] font-bold text-gray-900">최근 검색어</h3>
                <button
                  onClick={clearAllRecent}
                  className="text-[11px] text-gray-400 hover:text-gray-600"
                >
                  전체 삭제
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((t) => (
                  <div
                    key={t}
                    className="flex items-center gap-1 pl-3 pr-1.5 rounded-full bg-[#F4F5F7]"
                    style={{ height: 30 }}
                  >
                    <button
                      onClick={() => setQuery(t)}
                      className="text-[12px] text-gray-700 font-medium"
                    >
                      {t}
                    </button>
                    <button
                      onClick={() => removeRecent(t)}
                      aria-label="삭제"
                      className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                      <X size={10} className="text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Popular keywords */}
          <div className="px-2.5 mb-5">
            <h3 className="text-[13px] font-bold text-gray-900 mb-2">인기 검색어</h3>
            <div className="flex flex-wrap gap-1.5">
              {popularKeywords.map((t, i) => (
                <button
                  key={t}
                  onClick={() => setQuery(t)}
                  className="flex items-center gap-1.5 pl-2 pr-3 rounded-full bg-white border border-gray-200"
                  style={{ height: 30 }}
                >
                  <span className="text-[11px] font-bold text-[#7C3AED]">
                    {i + 1}
                  </span>
                  <span className="text-[12px] text-gray-700 font-medium">{t}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent text-[#7C3AED] font-bold">
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}
