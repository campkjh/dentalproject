'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useMyHospitalData } from '@/lib/partner/my-hospital-cache';
import { useStore } from '@/store';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import Avatar from '@/components/common/Avatar';
import MonoIcon from '@/components/common/MonoIcon';
import CommunityModal from '@/components/community/CommunityModal';
import { ImageUploader } from '@/components/admin/ImageUploader';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ReviewRow = {
  id: string;
  rating: number;
  content: string;
  treatment_name: string | null;
  treatment_date: string | null;
  total_cost: number;
  before_image: string | null;
  after_image: string | null;
  created_at: string;
  author?: { name?: string; profile_image?: string } | null;
  doctor?: { name?: string; profile_image?: string } | null;
};

type ReviewTab = 'image' | 'text';
type HospitalSummary = { id?: string | null; created_at?: string | null };

const MAX_INITIAL_IMAGE = 10;
const MAX_INITIAL_TEXT = 20;

function reviewImageUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:image/')
  ) {
    return trimmed;
  }
  return null;
}

export default function PartnerReviewsPage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const {
    data: hospitalData,
    loading,
    refresh: refreshHospital,
  } = useMyHospitalData<HospitalSummary, unknown, ReviewRow>(authUser?.id);
  const items = hospitalData?.reviews ?? [];
  const hospitalId = hospitalData?.hospital?.id ?? null;
  const hospitalCreatedAt = hospitalData?.hospital?.created_at ?? null;
  const [tab, setTab] = useState<ReviewTab>('image');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ type: 'image' as 'image' | 'text', content: '', rating: 5, treatmentName: '', beforeImage: '', afterImage: '' });
  const [saving, setSaving] = useState(false);

  const avgRating = useMemo(() => {
    if (!items.length) return 0;
    return items.reduce((s, r) => s + Number(r.rating), 0) / items.length;
  }, [items]);

  const imageReviews = items.filter((r) => reviewImageUrl(r.before_image) || reviewImageUrl(r.after_image));
  const textReviews = items.filter((r) => !reviewImageUrl(r.before_image) && !reviewImageUrl(r.after_image));
  const displayList = (tab === 'image' ? imageReviews : textReviews).filter((r) => !hiddenIds.has(r.id));

  // Check if hospital can add initial reviews (within 1 month of registration)
  const canAddInitial = useMemo(() => {
    if (!hospitalCreatedAt) return false;
    const created = new Date(hospitalCreatedAt);
    const diff = Date.now() - created.getTime();
    return diff < 30 * 24 * 60 * 60 * 1000;
  }, [hospitalCreatedAt]);

  const initialImageCount = imageReviews.length;
  const initialTextCount = textReviews.length;
  const canAddImage = canAddInitial && initialImageCount < MAX_INITIAL_IMAGE;
  const canAddText = canAddInitial && initialTextCount < MAX_INITIAL_TEXT;

  const toggleHide = async (id: string) => {
    const willHide = !hiddenIds.has(id);
    // 낙관적 업데이트
    if (willHide) {
      setHiddenIds((prev) => new Set([...prev, id]));
    } else {
      setHiddenIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
    // 서버 API (admin client: reviews RLS는 author만 수정 가능)
    const res = await fetch('/api/my-hospital/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId: id, hidden: willHide }),
    });
    if (!res.ok) {
      // 롤백
      if (willHide) {
        setHiddenIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      } else {
        setHiddenIds((prev) => new Set([...prev, id]));
      }
      const j = await res.json().catch(() => ({}));
      showToast((j as any).error || '저장에 실패했습니다.');
      return;
    }
    showToast(willHide ? '리뷰를 숨겼어요.' : '리뷰를 다시 보여 드려요.');
  };

  const handleAddReview = async () => {
    if (!addForm.content.trim()) { showToast('리뷰 내용을 입력해주세요.'); return; }
    if (!hospitalId || !hasSupabaseEnv()) { showToast('병원 정보를 불러올 수 없습니다.'); return; }
    if (addForm.type === 'image' && !canAddImage) { showToast(`이미지 리뷰는 최대 ${MAX_INITIAL_IMAGE}개까지 등록할 수 있습니다.`); return; }
    if (addForm.type === 'text' && !canAddText) { showToast(`텍스트 리뷰는 최대 ${MAX_INITIAL_TEXT}개까지 등록할 수 있습니다.`); return; }

    setSaving(true);
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');
      const { error } = await sb.from('reviews').insert({
        author_id: user.id,
        hospital_id: hospitalId,
        rating: addForm.rating,
        content: addForm.content,
        treatment_name: addForm.treatmentName || null,
        total_cost: 0,
        before_image: addForm.type === 'image' ? addForm.beforeImage.trim() || null : null,
        after_image: addForm.type === 'image' ? addForm.afterImage.trim() || null : null,
      });
      if (error) throw error;
      showToast('초기 리뷰를 등록했어요.');
      setShowAddModal(false);
      setAddForm({ type: 'image', content: '', rating: 5, treatmentName: '', beforeImage: '', afterImage: '' });
      await refreshHospital({ force: true, showLoading: false });
    } catch (e: any) {
      showToast(e?.message || '등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!authUser) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-10 text-center">
      <span className="qd-a-item flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
        <MonoIcon name="lock" size={34} color="#B0B8C1" />
      </span>
      <p className="qd-a-item mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]" style={{ animationDelay: '.06s' }}>로그인이 필요해요</p>
      <Link href="/partner/login" className="qd-a-item mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold text-[#3180F7] transition active:scale-[0.97]" style={{ animationDelay: '.12s' }}>로그인</Link>
    </div>
  );

  const tabs = [
    { key: 'image', label: '이미지 리뷰', count: imageReviews.length },
    { key: 'text', label: '텍스트 리뷰', count: textReviews.length },
  ] as const;
  const tabIdx = tab === 'image' ? 0 : 1;
  const fullStars = Math.round(avgRating);

  return (
    <div className="partner-mobile-screen has-fixed-title page-enter">
      <section className="px-5 pb-8 pt-4">
        {/* 평균 별점 — 상품 상세 가격 카드 결(연파랑 면 · 남색 큰 숫자) */}
        <div className="rounded-[14px] bg-[#EFF5FE] px-5 pb-5 pt-4">
          <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">평균 별점</span>
          <div className="mt-3 flex items-end gap-2">
            <p className="text-[30px] font-bold leading-none tracking-[-0.8px] text-[#1E3A78]">{avgRating.toFixed(1)}</p>
            <span className="mb-0.5 flex gap-0.5" aria-hidden>
              {[1, 2, 3, 4, 5].map((n) => (
                <MonoIcon key={n} name="star" size={18} color={n <= fullStars ? '#FFC342' : '#D6E4FA'} />
              ))}
            </span>
          </div>
          <p className="mt-2 text-[15px] font-semibold text-[#1E3A78]">리뷰 {items.length.toLocaleString()}개</p>
        </div>

        {/* 리뷰 종류 — 회색 트랙 위 흰 알약 */}
        <div className="relative mt-5 flex rounded-[12px] bg-[#F2F4F6] p-1" role="tablist" aria-label="리뷰 유형">
          <span
            aria-hidden
            className="absolute bottom-1 top-1 rounded-[10px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-transform duration-300"
            style={{ left: 4, width: 'calc((100% - 8px) / 2)', transform: `translateX(${tabIdx * 100}%)`, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`relative z-[1] flex h-10 flex-1 items-center justify-center gap-1 text-[15.5px] transition-colors ${tab === t.key ? 'font-bold text-[#191F28]' : 'font-semibold text-[#8B95A1]'}`}
            >
              {t.label}
              <span className="tabular-nums">{t.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-16 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
        ) : displayList.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <span className="qd-a-item flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
              <MonoIcon name="star" size={34} color="#B0B8C1" />
            </span>
            <p className="qd-a-item mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]" style={{ animationDelay: '.06s' }}>아직 리뷰가 없어요</p>
            <p className="qd-a-item mt-1.5 text-[15px] leading-[1.6] text-[#8B95A1]" style={{ animationDelay: '.12s' }}>
              {canAddInitial ? '가입 후 1개월 안에는 초기 리뷰를 등록할 수 있어요' : '환자가 리뷰를 남기면 여기에 보여요'}
            </p>
          </div>
        ) : (
          <ul className="mt-3">
            {displayList.map((r, i) => {
              const before = reviewImageUrl(r.before_image);
              const after = reviewImageUrl(r.after_image);
              const hidden = hiddenIds.has(r.id);
              return (
                <li key={r.id} className="qd-a-item py-4 transition-opacity" style={{ opacity: hidden ? 0.4 : 1, animationDelay: `${Math.min(i, 6) * 0.04}s` }}>
                  <div className="flex items-center gap-3">
                    <Avatar src={r.author?.profile_image} seed={r.author?.name ?? r.id} size={40} alt="" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-bold text-[#191F28]">{r.author?.name ?? '익명'}</p>
                      <p className="mt-0.5 truncate text-[13.5px] text-[#8B95A1]">
                        {new Date(r.created_at).toLocaleDateString('ko-KR')}{r.doctor?.name ? ` · ${r.doctor.name} 원장` : ''}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-0.5 text-[15px] font-bold tabular-nums text-[#333D4B]">
                      <MonoIcon name="star" size={15} color="#FFC342" />
                      {Number(r.rating).toFixed(1)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleHide(r.id)}
                      title={hidden ? '표시하기' : '숨기기'}
                      aria-label={hidden ? '리뷰 표시하기' : '리뷰 숨기기'}
                      className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors active:bg-[#F2F4F6]"
                    >
                      <MonoIcon name={hidden ? 'eye-on' : 'eye-off'} size={18} color="#B0B8C1" />
                    </button>
                  </div>

                  {r.treatment_name && (
                    <p className="mt-3 flex flex-wrap gap-1">
                      <span className="inline-flex h-6 items-center rounded-[6px] bg-[#F2F4F6] px-2 text-[13px] font-semibold text-[#4E5968]">{r.treatment_name}</span>
                      {r.total_cost > 0 && (
                        <span className="inline-flex h-6 items-center rounded-[6px] bg-[#F2F4F6] px-2 text-[13px] font-semibold tabular-nums text-[#4E5968]">{r.total_cost.toLocaleString()}원</span>
                      )}
                    </p>
                  )}

                  {(before || after) && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {before && (
                        <div className="relative overflow-hidden rounded-[14px] bg-[#F2F4F6]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={before} alt="Before" className="aspect-square w-full object-cover" />
                          <span className="absolute left-2 top-2 rounded-[6px] bg-black/45 px-1.5 py-0.5 text-[12px] font-semibold text-white">Before</span>
                        </div>
                      )}
                      {after && (
                        <div className="relative overflow-hidden rounded-[14px] bg-[#F2F4F6]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={after} alt="After" className="aspect-square w-full object-cover" />
                          <span className="absolute left-2 top-2 rounded-[6px] bg-black/45 px-1.5 py-0.5 text-[12px] font-semibold text-white">After</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="mt-3 whitespace-pre-line break-keep text-[16px] leading-[1.6] text-[#333D4B]">{r.content}</p>
                </li>
              );
            })}
          </ul>
        )}

        {/* 초기 리뷰 등록 */}
        {canAddInitial && (
          <div className="pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex h-12 w-full items-center justify-center gap-1.5 rounded-[14px] bg-[#F2F4F6] text-[15px] font-semibold text-[#333D4B] transition-all active:scale-[0.98] active:bg-[#E5E8EB]"
            >
              <MonoIcon name="plus" size={18} color="#6B7684" />
              초기 리뷰 등록
              <span className="font-medium tabular-nums text-[#8B95A1]">이미지 {initialImageCount}/{MAX_INITIAL_IMAGE} · 텍스트 {initialTextCount}/{MAX_INITIAL_TEXT}</span>
            </button>
            <p className="mt-3 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
              <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
              초기 리뷰는 가입 후 1개월 안에만 등록할 수 있어요
            </p>
          </div>
        )}
      </section>

      {/* 초기 리뷰 등록 시트 */}
      {showAddModal && (
        <CommunityModal label="초기 리뷰 등록" onClose={() => { if (!saving) setShowAddModal(false); }}>
          <div className="overflow-y-auto px-5 pb-5 pt-1">
            <h2 className="text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">초기 리뷰 등록</h2>

            {/* 리뷰 종류 */}
            <div className="relative mt-5 flex rounded-[12px] bg-[#F2F4F6] p-1">
              <span
                aria-hidden
                className="absolute bottom-1 top-1 rounded-[10px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-transform duration-300"
                style={{ left: 4, width: 'calc((100% - 8px) / 2)', transform: `translateX(${addForm.type === 'image' ? 0 : 100}%)`, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
              {([{ v: 'image', label: '이미지 리뷰' }, { v: 'text', label: '텍스트 리뷰' }] as const).map((t) => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setAddForm((f) => ({
                    ...f,
                    type: t.v,
                    ...(t.v === 'text' ? { beforeImage: '', afterImage: '' } : {}),
                  }))}
                  className={`relative z-[1] flex h-10 flex-1 items-center justify-center text-[15.5px] transition-colors ${addForm.type === t.v ? 'font-bold text-[#191F28]' : 'font-semibold text-[#8B95A1]'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 별점 */}
            <p className="mt-5 text-[15px] font-semibold text-[#4E5968]">별점</p>
            <div className="mt-1.5 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setAddForm((f) => ({ ...f, rating: n }))} aria-label={`${n}점`} className="flex h-10 w-10 items-center justify-center rounded-[10px] transition-transform active:scale-[0.9]">
                  <MonoIcon name="star" size={30} color={n <= addForm.rating ? '#FFC342' : '#E5E8EB'} />
                </button>
              ))}
            </div>

            <input
              value={addForm.treatmentName}
              onChange={(e) => setAddForm((f) => ({ ...f, treatmentName: e.target.value }))}
              placeholder="시술명 (선택)"
              className="mt-4 h-14 w-full rounded-[14px] bg-[#F2F4F6] px-4 text-[16px] text-[#191F28] outline-none transition-colors placeholder:text-[#B0B8C1] focus:bg-[#EDEFF2]"
            />
            <textarea
              value={addForm.content}
              onChange={(e) => setAddForm((f) => ({ ...f, content: e.target.value }))}
              rows={4}
              placeholder="리뷰 내용을 입력하세요"
              className="mt-2 w-full resize-none rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[16px] leading-[1.6] text-[#191F28] outline-none transition-colors placeholder:text-[#B0B8C1] focus:bg-[#EDEFF2]"
            />

            {addForm.type === 'image' && (
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div>
                  <p className="mb-1.5 text-[14px] font-semibold text-[#4E5968]">Before</p>
                  <ImageUploader
                    value={addForm.beforeImage}
                    onChange={(url) => setAddForm((f) => ({ ...f, beforeImage: url }))}
                    folder="review-before"
                    aspect="1/1"
                    placeholder="Before 이미지"
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-[14px] font-semibold text-[#4E5968]">After</p>
                  <ImageUploader
                    value={addForm.afterImage}
                    onChange={(url) => setAddForm((f) => ({ ...f, afterImage: url }))}
                    folder="review-after"
                    aspect="1/1"
                    placeholder="After 이미지"
                  />
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#F2F4F6] text-[17px] font-bold text-[#4E5968] transition-all active:scale-[0.98]">
                취소
              </button>
              <button type="button" onClick={handleAddReview} disabled={saving} className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98]">
                {saving ? '등록 중…' : '등록하기'}
              </button>
            </div>
          </div>
        </CommunityModal>
      )}
    </div>
  );
}
