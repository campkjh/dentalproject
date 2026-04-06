'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, ChevronDown, X } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import { communityTags } from '@/lib/mock-data';

const boardOptions = [
  { label: '질문게시판', value: 'question' as const },
  { label: '자유게시판', value: 'free' as const },
  { label: '과별게시판', value: 'dental' as const },
];

export default function CommunityWritePageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩중...</div>}>
      <CommunityWritePage />
    </Suspense>
  );
}

function CommunityWritePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boardParam = searchParams.get('board') || 'question';
  const { user, addPost, showToast } = useStore();

  const [boardType, setBoardType] = useState<'question' | 'free' | 'dental'>(
    boardOptions.find((b) => b.value === boardParam)?.value || 'question'
  );
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const currentBoardLabel = boardOptions.find((b) => b.value === boardType)?.label || '질문게시판';

  const MAX_CONTENT = 5000;
  const MAX_TAGS = 5;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      if (selectedTags.length >= MAX_TAGS) {
        showToast(`태그는 최대 ${MAX_TAGS}개까지 선택 가능합니다.`);
        return;
      }
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleThumbnailUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setThumbnailPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const generateAnonymousId = () => {
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      showToast('제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      showToast('내용을 입력해주세요.');
      return;
    }

    const isFreeBoard = boardType === 'free';
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    const post = {
      id: String(Date.now()),
      boardType,
      title: title.trim(),
      content: content.trim(),
      authorName: isFreeBoard ? '익명' : (user?.name || '사용자'),
      authorTitle: user?.doctorInfo?.title,
      authorHospital: user?.doctorInfo?.hospitalName,
      authorId: user?.id || 'guest',
      isAnonymous: isFreeBoard,
      anonymousId: isFreeBoard ? generateAnonymousId() : undefined,
      date: dateStr,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      imageUrl: thumbnailPreview || undefined,
      thumbnailUrl: thumbnailPreview || undefined,
      tags: selectedTags,
      hasAnswer: false,
      answerCount: 0,
    };

    addPost(post);
    showToast('게시글이 등록되었습니다.');
    router.push('/community');
  };

  const isFormValid = title.trim().length > 0 && content.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar title="글작성" />

      <div className="px-4 py-4 space-y-5">
        {/* Category Dropdown */}
        <div className="relative">
          <label className="text-sm font-bold text-gray-900 mb-2 block">카테고리</label>
          <button
            onClick={() => setShowBoardDropdown(!showBoardDropdown)}
            className="w-full flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 bg-white"
          >
            <span className="text-sm text-gray-900 font-medium">{currentBoardLabel}</span>
            <ChevronDown size={16} className="text-gray-400" />
          </button>
          {showBoardDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-20 overflow-hidden">
              {boardOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setBoardType(option.value);
                    setShowBoardDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 last:border-0 ${
                    boardType === option.value
                      ? 'text-[#7C3AED] font-medium bg-[#EDE9FE]'
                      : 'text-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Anonymous notice for free board */}
        {boardType === 'free' && (
          <div className="bg-[#EDE9FE] rounded-xl px-4 py-3">
            <p className="text-xs text-[#7C3AED]">
              자유게시판은 익명으로 작성됩니다. 자동으로 익명 ID가 부여됩니다.
            </p>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-sm font-bold text-gray-900 mb-2 block">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력해 주세요"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#7C3AED] bg-white placeholder:text-gray-400"
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-sm font-bold text-gray-900 mb-2 block">내용</label>
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CONTENT) {
                  setContent(e.target.value);
                }
              }}
              placeholder="내용을 입력해 주세요"
              rows={8}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#7C3AED] resize-none bg-white placeholder:text-gray-400"
            />
            <span className="absolute bottom-3 right-3 text-xs text-gray-400">
              {content.length}/{MAX_CONTENT}
            </span>
          </div>
        </div>

        {/* Thumbnail Upload */}
        <div>
          <label className="text-sm font-bold text-gray-900 mb-2 block">
            <span className="text-gray-400 font-normal">[선택]</span> 썸네일 등록
          </label>
          {thumbnailPreview ? (
            <div className="relative w-24 h-24">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={thumbnailPreview}
                  alt="썸네일 미리보기"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => setThumbnailPreview(null)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleThumbnailUpload}
              className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 bg-white"
            >
              <Camera size={24} className="text-gray-400" />
              <span className="text-[10px] text-gray-400">사진 추가</span>
            </button>
          )}
        </div>

        {/* Hashtag Selection */}
        <div>
          <label className="text-sm font-bold text-gray-900 mb-2 block">
            <span className="text-gray-400 font-normal">[선택]</span> 해시태그 등록
            <span className="text-xs text-gray-400 font-normal ml-2">
              {selectedTags.length}/{MAX_TAGS}
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {communityTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-[#7C3AED] text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="px-4 py-6 mt-4">
        <button
          onClick={handleSubmit}
          disabled={!isFormValid}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors ${
            isFormValid
              ? 'bg-[#7C3AED] text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          게시글 등록
        </button>
      </div>
    </div>
  );
}
