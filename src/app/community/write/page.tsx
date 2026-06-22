'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, ChevronDown, X } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import { communityTags, questionTags } from '@/lib/mock-data';
import { compressImage } from '@/lib/compressImage';

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
  const { authUser } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const isDoctor = Boolean(user?.isDoctor || user?.doctorInfo);
  const allowedBoardOptions = isDoctor ? boardOptions : boardOptions.filter((b) => b.value === 'question');

  const [boardType, setBoardType] = useState<'question' | 'free' | 'dental'>(
    allowedBoardOptions.find((b) => b.value === boardParam)?.value || 'question'
  );
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const currentBoardLabel = boardOptions.find((b) => b.value === boardType)?.label || '질문게시판';

  const MAX_CONTENT = 5000;
  const MAX_TAGS = 5;

  // Derive a title from the first line / sentence of the body so the post
  // schema stays valid even though the form no longer has a separate title.
  const deriveTitle = (body: string) => {
    const firstLine = body.split(/\n/)[0]?.trim() ?? '';
    const firstSentence = firstLine.split(/[.!?。]/)[0]?.trim() ?? firstLine;
    const candidate = firstSentence || firstLine || body.trim();
    return candidate.slice(0, 60) || '제목 없음';
  };

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
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { showToast('이미지 파일만 선택해주세요.'); return; }
      if (file.size > 50 * 1024 * 1024) { showToast('50MB 이하 이미지만 등록할 수 있습니다.'); return; }

      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
      setUploadingThumb(true);
      try {
        const compressed = await compressImage(file);
        const fd = new FormData();
        fd.append('file', compressed);
        fd.append('folder', 'community-posts');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('업로드 실패');
        const blob = await res.json();
        setThumbnailPreview(blob.url as string);
      } catch {
        showToast('이미지 업로드에 실패했습니다.');
        setThumbnailPreview(null);
      } finally {
        URL.revokeObjectURL(previewUrl);
        setUploadingThumb(false);
      }
    };
    input.click();
  };

  const generateAnonymousId = () => {
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  const handleSubmit = async () => {
    if (!authUser) {
      showToast('로그인이 필요합니다.');
      router.push('/login');
      return;
    }
    if (!isDoctor && boardType !== 'question') {
      showToast('일반 회원은 질문게시판에만 글을 작성할 수 있습니다.');
      setBoardType('question');
      return;
    }
    if (!content.trim()) {
      showToast('내용을 입력해주세요.');
      return;
    }
    if (submitting || uploadingThumb) return;

    setSubmitting(true);
    const isFreeBoard = boardType === 'free';
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    const post = {
      id: String(Date.now()),
      boardType,
      title: deriveTitle(content),
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

    const result = await addPost(post);
    setSubmitting(false);
    if (result.error) {
      showToast(result.error);
      return;
    }
    showToast('게시글이 등록되었습니다.');
    // 태그가 있으면 해당 카테고리 탭으로 이동
    const firstTag = selectedTags[0];
    const categoryParam = firstTag ? `?category=${encodeURIComponent(firstTag)}` : '';
    router.push(`/community${categoryParam}`);
  };

  const isFormValid = content.trim().length > 0 && !uploadingThumb;

  return (
    <div className="min-h-screen bg-white">
      <TopBar title="글작성" />

      <div className="px-5 pt-5 pb-6 space-y-6">
        {/* Category */}
        <section className="relative">
          <h2 className="text-[16px] font-bold text-[#2B313D]">카테고리</h2>
          <p className="mt-1 text-[13px] text-[#A4ABBA]">게시글 유형을 선택해주세요.</p>
          <button
            type="button"
            onClick={() => setShowBoardDropdown(!showBoardDropdown)}
            className="mt-3 w-full flex items-center justify-between border border-[#E5E8EB] rounded-[12px] px-4 py-3.5 bg-white"
          >
            <span className="text-[15px] text-[#2B313D] font-medium">{currentBoardLabel}</span>
            <ChevronDown size={18} className="text-[#A4ABBA]" />
          </button>
          {showBoardDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-[12px] border border-[#E5E8EB] shadow-lg z-20 overflow-hidden">
              {allowedBoardOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setBoardType(option.value);
                    setShowBoardDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-[15px] border-b border-gray-50 last:border-0 ${
                    boardType === option.value
                      ? 'text-[#8037FF] font-semibold bg-[#F4EFFF]'
                      : 'text-[#51535C]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Anonymous notice for free board */}
        {boardType === 'free' && (
          <div className="bg-[#F4EFFF] rounded-[12px] px-4 py-3">
            <p className="text-[13px] text-[#8037FF]">
              자유게시판은 익명으로 작성됩니다. 자동으로 익명 ID가 부여됩니다.
            </p>
          </div>
        )}

        {/* Content */}
        <section>
          <div className="relative rounded-[12px] border border-[#E5E8EB] bg-white">
            <textarea
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CONTENT) {
                  setContent(e.target.value);
                }
              }}
              placeholder={'등록된 글은 저작권 법으로 보호됩니다.\n음란, 청소년 유해물, 기타 위법자료등을\n게시한 경우 게시물은 경고 없이 삭제 됩니다.'}
              rows={10}
              className="w-full rounded-[12px] px-4 pt-4 pb-9 text-[15px] leading-[1.55] outline-none focus:border-[#8037FF] resize-none bg-white text-[#2B313D] placeholder:text-[#A4ABBA]"
            />
            <span className="absolute bottom-3 right-4 text-[12px] text-[#A4ABBA]">
              {content.length}/{MAX_CONTENT}자
            </span>
          </div>
        </section>

        {/* Thumbnail */}
        <section>
          <h2 className="text-[16px] font-bold text-[#2B313D]">
            <span>[선택]</span>썸네일 등록
          </h2>
          <p className="mt-1 text-[13px] text-[#A4ABBA]">*썸네일은 리스트에 80*80으로 노출됩니다.</p>
          <div className="mt-3">
            {thumbnailPreview ? (
              <div className="relative w-[120px] h-[120px]">
                <div className="w-[120px] h-[120px] rounded-[12px] overflow-hidden bg-gray-100">
                  <img
                    src={thumbnailPreview}
                    alt="썸네일 미리보기"
                    className="w-full h-full object-cover"
                  />
                  {uploadingThumb && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-[12px]">
                      <p className="text-white text-[11px] font-medium">업로드 중...</p>
                    </div>
                  )}
                </div>
                {!uploadingThumb && (
                  <button
                    type="button"
                    onClick={() => setThumbnailPreview(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center"
                    aria-label="썸네일 제거"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleThumbnailUpload}
                className="w-[120px] h-[120px] rounded-[12px] flex items-center justify-center bg-[#F5F6F8]"
                aria-label="썸네일 추가"
              >
                <Camera size={26} className="text-[#8B95A1]" />
              </button>
            )}
          </div>
        </section>

        {/* Hashtags */}
        <section>
          <h2 className="text-[16px] font-bold text-[#2B313D]">
            <span>[선택]</span>해시태그 등록
            <span className="ml-2 text-[12px] font-normal text-[#A4ABBA]">
              {selectedTags.length}/{MAX_TAGS}
            </span>
          </h2>
          <p className="mt-1 text-[13px] text-[#A4ABBA]">*최대 5개 까지 선택가능합니다.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(boardType === 'question' ? questionTags : communityTags).map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`inline-flex items-center h-[32px] px-3 rounded-[8px] text-[13px] font-medium transition-colors border border-dashed ${
                    isSelected
                      ? 'border-[#8037FF] bg-[#F4EFFF] text-[#8037FF]'
                      : 'border-[#D1D5DB] text-[#6B7280] bg-white'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </section>

        {/* Customer-only guidelines (hidden for doctor users) */}
        {!isDoctor && (
          <>
            <section
              className="mt-2 rounded-[16px] bg-[#EAF3FF] px-4 py-4"
              aria-labelledby="customer-guidance-title"
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  aria-hidden
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1E85FF] text-white"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <h2 id="customer-guidance-title" className="text-[15px] font-bold text-[#1E85FF]">
                  질문을 남기기 전에 확인해주세요!
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-[13.5px] leading-[20px] text-[#2B313D]">
                <li>질문에 대해 마이닥 건강 정보 AI가 답변을 드리며, 비대면 진료와는 달라요.</li>
                <li>비대면 진료가 필요하시다면 홈에서 증상 또는 과목을 선택해 신청해주세요.</li>
                <li>질문에는 개인정보를 입력하지 않도록 주의해주세요.</li>
              </ul>
            </section>

            <section
              className="rounded-[16px] bg-[#F5F6F8] px-4 py-5"
              aria-labelledby="customer-policy-title"
            >
              <h2 id="customer-policy-title" className="text-[15px] font-bold text-[#2B313D] mb-3">
                실시간 의료 상담은 이렇게 운영돼요.
              </h2>
              <ul className="list-disc pl-5 space-y-2.5 text-[13px] leading-[20px] text-[#51535C]">
                <li>폭력적·공격적인 내용, 서비스 목적과 맞지 않는 질문, 동일 내용의 반복(3회 이상) 등은 사전 예고 없이 삭제될 수 있습니다.</li>
                <li>성적 또는 선정적인 내용이 포함되어 있는 경우, 사전 예고 없이 비공개 처리 됩니다.</li>
                <li>서비스 운영을 방해하는 행위가 반복될 경우, 회원과 의료진 보호를 위해 서비스 이용이 사전 안내 없이 한시적 또는 영구적으로 제한될 수 있습니다.</li>
                <li>실시간 의료 상담에서 등록된 질문과 답변은 모두에게 공개되며, 서비스 홍보 목적으로 활용될 수 있습니다.</li>
                <li>
                  답변은 <strong className="font-bold text-[#2B313D]">참고용</strong>으로서 의학적 판단이나 진료 행위를 <strong className="font-bold text-[#2B313D]">대체할 수 없으며</strong>, 모든 약물 상호작용을 포함하지 않을 수 있습니다. 이에 대해 마이닥와 답변 의료인은 어떠한 책임도 지지 않습니다.
                </li>
                <li>정확한 진단을 위해서는 마이닥 앱에서 비대면 진료를 신청하거나, 가까운 병원에 내원해 주세요.</li>
                <li>실시간 의료 상담에 등록한 질문은 고객센터를 통한 삭제 요청이 없는 한 계속 남게 됩니다.</li>
              </ul>
            </section>
          </>
        )}
      </div>

      {/* Submit */}
      <div className="px-5 pb-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isFormValid || submitting}
          className={`w-full py-4 rounded-[12px] font-bold text-[15px] transition-colors ${
            isFormValid && !submitting
              ? 'bg-[#2B313D] text-white'
              : 'bg-[#E5E8EB] text-[#A4ABBA] cursor-not-allowed'
          }`}
        >
          {submitting ? '등록 중…' : '게시글 등록'}
        </button>
      </div>
    </div>
  );
}
