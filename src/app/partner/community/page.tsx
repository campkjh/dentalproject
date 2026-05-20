'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';
import { MessageCircle, Eye, Heart } from 'lucide-react';

const TABS = [
  { label: '질문게시판', value: 'question' },
  { label: '과별게시판', value: 'dental' },
] as const;

export default function PartnerCommunityPage() {
  const { posts } = useStore();
  const [activeTab, setActiveTab] = useState<'question' | 'dental'>('question');

  const filtered = posts.filter((p) => p.boardType === activeTab);

  return (
    <div className="flex flex-col min-h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">커뮤니티</h1>
        <p className="text-xs text-gray-400 mt-0.5">환자 질문에 전문 답변을 남겨보세요</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'text-[#3182F6] border-b-2 border-[#3182F6]'
                : 'text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Post list */}
      <div className="flex-1 divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <MessageCircle size={32} className="mb-2 opacity-30" />
            <p className="text-sm">게시글이 없습니다</p>
          </div>
        ) : (
          filtered.map((post) => (
            <Link
              key={post.id}
              href={`/community/${post.id}`}
              className="block px-4 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{post.title}</p>
                {!post.hasAnswer && post.boardType === 'question' && (
                  <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded font-medium">
                    답변필요
                  </span>
                )}
                {post.hasAnswer && (
                  <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-blue-50 text-[#3182F6] rounded font-medium">
                    답변완료
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 line-clamp-1 mb-2">{post.content}</p>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span>{post.date}</span>
                <span className="flex items-center gap-0.5"><Eye size={11} />{post.viewCount}</span>
                <span className="flex items-center gap-0.5"><Heart size={11} />{post.likeCount}</span>
                <span className="flex items-center gap-0.5"><MessageCircle size={11} />{post.commentCount}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
