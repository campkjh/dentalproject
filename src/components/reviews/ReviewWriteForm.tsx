'use client';

import { useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MonoIcon from '@/components/common/MonoIcon';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import Avatar from '@/components/common/Avatar';
import { resolveProductImageUrl } from '@/lib/images';
import { haptic } from '@/lib/haptics';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useMyHospitalData } from '@/lib/partner/my-hospital-cache';
import ReviewPhotos, { EMPTY_REVIEW_PHOTOS, uploadReviewPhotos } from './ReviewPhotos';
import type { Doctor } from '@/types';

export default function ReviewWriteForm({ partner = false }: { partner?: boolean }) {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center">로딩중...</div>}>
    <ReviewWritePage partner={partner} />
  </Suspense>;
}

type PartnerProduct = { id: string; title: string; price: number; image_url?: string; discount?: number; approval_status?: string; pending_changes?: { title?: string }; status?: string };
type PartnerHospital = { id: string; name: string; created_at: string; products?: PartnerProduct[]; doctors?: { id: string; name: string; profile_image?: string; is_owner?: boolean }[] };

type ExtraAspect = 'kindness' | 'cleanliness' | 'price' | 'revisit';
const ASPECTS: { key: ExtraAspect; label: string; emoji: string }[] = [
  { key: 'kindness', label: '친절도', emoji: '😊' },
  { key: 'cleanliness', label: '병원 깔끔함', emoji: '🧼' },
  { key: 'price', label: '가격 만족', emoji: '💰' },
  { key: 'revisit', label: '재방문 의사', emoji: '🔁' },
];

const TIME_OPTIONS = ['1주 이내', '1달 전', '2달 전', '3달 전', '6달 전', '1년 전'];

function ReviewWritePage({ partner }: { partner: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const localReviewSeq = useRef(0);
  const productId = searchParams.get('productId');
  const reservationId = searchParams.get('reservationId');
  const { user, addReview, showToast, products, reservations, hospitals } = useStore();

  const { authUser } = useSession();
  const { data: partnerData, loading: partnerLoading, error: partnerError, refresh: refreshPartner } = useMyHospitalData<PartnerHospital>(authUser?.id, { enabled: partner });
  const reservation = reservations.find((r) => r.id === reservationId);
  const baseProduct = products.find((p) => p.id === (productId || reservation?.productId));
  const ownHospital = partnerData?.hospital;
  const [selectedProductId, setSelectedProductId] = useState('');
  const treatmentOptions = partner
    ? (ownHospital?.products ?? []).filter((p) => p.status !== 'removed' && p.approval_status !== 'pending_delete').map((p) => ({ id: p.id, title: p.pending_changes?.title || p.title, price: p.price, imageUrl: p.image_url || '', discount: p.discount, hospitalId: ownHospital!.id, hospitalName: ownHospital!.name }))
    : products.filter((p) => p.hospitalId === baseProduct?.hospitalId);
  const product = treatmentOptions.find((p) => p.id === (selectedProductId || productId || reservation?.productId));
  const hospital = hospitals.find((h) => h.id === product?.hospitalId);
  const doctors: Pick<Doctor, 'id' | 'name' | 'profileImage' | 'isOwner'>[] = partner
    ? (ownHospital?.doctors ?? []).map((d) => ({ id: d.id, name: d.name, profileImage: d.profile_image, isOwner: d.is_owner }))
    : hospital?.doctors ?? [];
  const productImage = product ? resolveProductImageUrl(product.imageUrl, product.id) : '';
  const autoPaidAmount = reservation?.amount ?? product?.price ?? 0;
  const hasDiscount = Boolean(product?.discount && product.discount > 0);

  const [rating, setRating] = useState(0);
  const [aspects, setAspects] = useState<Record<ExtraAspect, number>>({
    kindness: 0,
    cleanliness: 0,
    price: 0,
    revisit: 0,
  });
  const [content, setContent] = useState('');
  const [totalCostInput, setTotalCost] = useState<string | null>(null);
  const totalCost = totalCostInput ?? String(autoPaidAmount);
  const [discountOverride, setHasDiscountCheck] = useState<boolean | null>(null);
  const hasDiscountCheck = discountOverride ?? hasDiscount;
  const [treatmentTiming, setTreatmentTiming] = useState('');
  const [treatmentDate, setTreatmentDate] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [photos, setPhotos] = useState(EMPTY_REVIEW_PHOTOS);
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const MAX_CONTENT = 2000;
  const [now] = useState(() => Date.now());

  const aiFill = async () => {
    if (!product) return;
    setAiLoading(true);
    const hasAspectFeedback = Object.values(aspects).some((v) => v > 0);
    await new Promise((r) => setTimeout(r, 900));
    const avgAspect =
      Object.values(aspects).reduce((s, v) => s + v, 0) /
      Object.values(aspects).filter((v) => v > 0).length || rating;
    const satisfaction = avgAspect >= 4 ? '만족' : avgAspect >= 3 ? '보통' : '아쉬움';
    const text = `${product?.hospitalName || ownHospital?.name}에서 ${product?.title || "시술을 선택해 주세요"} 시술을 받았습니다.
상담부터 시술까지 전반적으로 ${satisfaction}스러웠고, 결과도 기대에 부합했습니다.
${hasAspectFeedback && aspects.kindness >= 4 ? '원장님과 스태프분들의 응대가 매우 친절했습니다.\n' : ''}${hasAspectFeedback && aspects.cleanliness >= 4 ? '병원 시설이 깨끗하게 잘 관리되고 있어 편안하게 진료받을 수 있었습니다.\n' : ''}${hasAspectFeedback && aspects.revisit >= 4 ? '다음에도 다른 시술이 필요하면 재방문 의사가 있습니다.\n' : ''}회복 과정도 무난했고, 주의사항 안내도 자세했습니다.
시술을 고민 중이신 분들께 추천드립니다.`;
    setContent(text);
    setAiLoading(false);
    showToast('AI가 리뷰를 작성했습니다. 내용을 다듬어주세요.');
  };

  const handleSubmit = async () => {
    if (!user) {
      showToast('로그인이 필요합니다.');
      router.push(partner ? '/partner/login' : '/login');
      return;
    }
    if (submitting) return;
    if (rating === 0) {
      showToast('별점을 선택해주세요.');
      return;
    }
    if (content.trim().length < 50) {
      showToast('리뷰는 최소 50자 이상 작성해주세요.');
      return;
    }
    if (!product) { showToast('등록한 시술을 선택해주세요.'); return; }
    if (photos.mode === 'before-after' && Boolean(photos.before) !== Boolean(photos.after)) { showToast('전후 사진을 모두 추가하거나 사진 한 장으로 등록해 주세요.'); return; }
    localReviewSeq.current += 1;
    setSubmitting(true);
    try {
      const images = await uploadReviewPhotos(photos);
      const payload = {
        hospitalId: product.hospitalId,
        productId: product.id,
        reservationId: reservation?.id,
        doctorId: selectedDoctorId || undefined,
        rating, content: content.trim(),
        treatmentName: product.title,
        totalCost: parseInt(totalCost, 10) || 0,
        treatmentDate: treatmentDate || undefined,
        ...images,
      };
      if (partner) {
        const response = await fetch('/api/my-hospital/reviews', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || '리뷰를 등록하지 못했어요.');
        await refreshPartner({ force: true, showLoading: false });
      } else {
        const result = await addReview({ ...payload,
          id: `review_${product.id}_${localReviewSeq.current}`,
          authorName: user.name, authorId: user.id,
          date: treatmentDate || '', treatmentDate: treatmentDate || '',
          doctorName: doctors.find((d) => d.id === selectedDoctorId)?.name,
        });
        if (result.error) throw new Error(result.error);
      }
      showToast(partner ? '초기 리뷰를 등록했어요.' : '리뷰가 작성되었습니다!');
      router.push(partner ? '/partner/reviews' : '/mypage/reviews');
    } catch (error) { showToast(error instanceof Error ? error.message : '리뷰를 등록하지 못했어요.'); }
    finally { setSubmitting(false); }
  };

  const canSubmit = !!product && rating > 0 && content.trim().length >= 50;
  const RATING_LABELS = ['별로예요', '그저 그래요', '괜찮아요', '좋아요', '최고예요'];
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  if (partner && (partnerLoading || !partnerData)) return <div className="min-h-screen bg-white"><TopBar title="초기 리뷰 등록" /><p className="px-5 py-10 text-[#8B95A1]">{partnerError || '병원 정보를 불러오고 있어요.'}</p></div>;
  if (partner && (!ownHospital || now - new Date(ownHospital.created_at).getTime() >= 30 * 86400000)) return <div className="min-h-screen bg-white"><TopBar title="초기 리뷰 등록" /><p className="px-5 py-10 text-[#8B95A1]">초기 리뷰는 병원 등록 후 30일 안에 등록할 수 있어요.</p></div>;
  if (!partner && !baseProduct) return <div className="min-h-screen bg-white"><TopBar title="리뷰 쓰기" /><p className="px-5 py-10 text-[#8B95A1]">리뷰를 작성할 예약이나 상품을 먼저 선택해 주세요.</p></div>;

  return (
    <div className="h-[100dvh] bg-white w-full max-w-[500px] lg:max-w-[560px] mx-auto flex flex-col overflow-hidden">
      {/* 머리 — 공통 TopBar(뒤로 + 큰 제목) */}
      <div className="flex-shrink-0">
        <TopBar title={partner ? "초기 리뷰 등록" : "리뷰 쓰기"} />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-6 w-full">
        <Section title="시술명" delay={0}>
          <label htmlFor="review-treatment" className="sr-only">시술명</label>
          <select id="review-treatment" value={product?.id || ''} disabled={submitting || (!partner && !!reservation)}
            onChange={(e) => { const next = treatmentOptions.find((p) => p.id === e.target.value); setSelectedProductId(e.target.value); setTotalCost(String(next?.price ?? 0)); setHasDiscountCheck(Boolean(next?.discount)); }}
            className="h-14 w-full rounded-[14px] bg-[#F2F4F6] px-4 text-[16px] text-[#191F28] outline-none">
            <option value="">시술을 선택해 주세요</option>
            {treatmentOptions.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
          </select>
          {treatmentOptions.length === 0 && <p className="mt-2 text-[14px] text-[#8B95A1]">등록된 시술이 없어요. 상품을 등록한 뒤 리뷰를 작성해 주세요.</p>}
        </Section>
        {/* 상품 요약 줄 — 예약 카드 결 */}
        <div className="qd-a-item px-5 pt-2 pb-6" style={{ animationDelay: '.05s' }}>
          <div className="flex items-center gap-3.5 rounded-[16px] bg-[#F2F4F6] p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[14px] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={productImage || "/images/hospital-cta.png"} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-[16px] font-bold leading-[1.35] tracking-[-0.3px] text-[#191F28]">
                {product?.title || "시술을 선택해 주세요"}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[14px] text-[#8B95A1]">{product?.hospitalName || ownHospital?.name}</p>
            </div>
          </div>
        </div>

        {/* 별점 */}
        <Section title="이 시술, 만족하셨나요?" delay={0.1}>
          <div className="flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((v) => {
              const on = v <= rating;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => { if (v !== rating) haptic('selection'); setRating(v); }}
                  aria-label={`${v}점`}
                  className="flex h-14 w-14 items-center justify-center rounded-[14px] active:bg-[#F9FAFB]"
                >
                  <span
                    key={`${v}-${on}-${rating}`}
                    className="inline-flex"
                    style={on ? { animation: `heartPop .44s cubic-bezier(.34,1.56,.64,1) ${(v - 1) * 0.04}s both` } : undefined}
                  >
                    <MonoIcon name="star" size={42} color={on ? '#FFC342' : '#E5E8EB'} />
                  </span>
                </button>
              );
            })}
          </div>
          <p
            key={rating}
            className={`mt-2 text-center text-[16px] font-bold ${rating > 0 ? 'text-[#3180F7] fade-in-up' : 'text-[#B0B8C1]'}`}
          >
            {rating > 0 ? RATING_LABELS[rating - 1] : '별을 눌러 평가해 주세요'}
          </p>
        </Section>

        {/* 세부 평가 */}
        {rating > 0 && (
          <>
            <Band />
            <Section title="세부 평가" right={<OptionalTag />} delay={0}>
              <div className="space-y-1">
                {ASPECTS.map((a) => (
                  <div key={a.key} className="flex min-h-12 items-center gap-3 py-1">
                    <span className="flex-1 text-[17px] text-[#333D4B]">{a.label}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((v) => {
                        const on = v <= aspects[a.key];
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => {
                              haptic('selection');
                              setAspects((p) => ({ ...p, [a.key]: p[a.key] === v ? 0 : v }));
                            }}
                            aria-label={`${a.label} ${v}점`}
                            className="flex h-9 w-9 items-center justify-center"
                          >
                            <span
                              key={`${v}-${on}`}
                              className="inline-flex"
                              style={on ? { animation: 'heartPop .4s cubic-bezier(.34,1.56,.64,1) both' } : undefined}
                            >
                              <MonoIcon name="star" size={24} color={on ? '#FFC342' : '#E5E8EB'} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        <Band />

        <Section title="시술 사진" right={<OptionalTag />} delay={0.15}>
          <ReviewPhotos value={photos} onChange={setPhotos} disabled={submitting} />
        </Section>
        <Band />

        {/* 담당 의사 */}
        <Section title="담당 의사" right={<OptionalTag />} delay={0.2}>
          {doctors.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5">
              <MonoIcon name="info-circle" size={18} color="#B0B8C1" />
              <p className="text-[14px] leading-[1.5] text-[#4E5968]">등록된 의사가 없어요.</p>
            </div>
          ) : (
            <div className="-mx-5 flex gap-1 overflow-x-auto px-4 pb-1 hide-scrollbar">
              {doctors.map((d) => {
                const selected = selectedDoctorId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDoctorId(selected ? '' : d.id)}
                    className="relative flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-[16px] py-1.5 active:bg-[#F9FAFB]"
                  >
                    <div
                      className="relative flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-full"
                      style={{
                        backgroundColor: selected ? '#EFF5FE' : '#F2F4F6',
                        transform: selected ? 'scale(1.05)' : 'scale(1)',
                        transition: 'all 240ms cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    >
                      {d.profileImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={d.profileImage} alt={d.name} className="h-full w-full object-cover" />
                      ) : (
                        <Avatar role="doctor" seed={d.id} size={52} />
                      )}
                      {selected && (
                        <span className="absolute inset-0 rounded-full ring-[2.5px] ring-inset ring-[#2F6FE4] check-pop" />
                      )}
                    </div>
                    <p
                      className={`w-full line-clamp-1 text-center text-[14px] ${
                        selected ? 'font-bold text-[#2F6FE4]' : 'font-semibold text-[#333D4B]'
                      }`}
                    >
                      {d.name}
                    </p>
                    {d.isOwner && (
                      <span className="rounded-[6px] bg-[#F2F4F6] px-1.5 py-0.5 text-[11.5px] font-semibold leading-none text-[#6B7684]">
                        대표원장
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {selectedDoctorId && (
            <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-[#EFF5FE] px-4 py-3 fade-in-up">
              <MonoIcon name="stethoscope" size={18} color="#2F6FE4" />
              <p className="text-[14px] font-semibold text-[#2F6FE4]">
                {selectedDoctor?.name} 원장님을 지정해서 리뷰해요
              </p>
            </div>
          )}
        </Section>

        <Band />

        {/* 시술 정보 */}
        <Section title="시술 정보" delay={0.25}>
          <Field label="시술받은 시기">
            <div className="mb-3 flex flex-wrap gap-2">
              {TIME_OPTIONS.map((timing) => <button key={timing} type="button" aria-pressed={treatmentTiming === timing}
                onClick={() => {
                  const current = new Date();
                  const approximate = timing === '1주 이내' ? subDays(current, 7) : timing === '1년 전' ? subYears(current, 1) : subMonths(current, Number(timing[0]));
                  setTreatmentTiming(timing); setTreatmentDate(format(approximate, 'yyyy-MM-dd'));
                }}
                className={`h-9 rounded-[8px] px-3 text-[14px] font-semibold ${treatmentTiming === timing ? 'bg-[#EFF5FE] text-[#2F6FE4]' : 'bg-[#F2F4F6] text-[#333D4B]'}`}>{timing}</button>)}
            </div>
            <input
              type="date"
              value={treatmentDate}
              onChange={(e) => {
                setTreatmentDate(e.target.value);
                setTreatmentTiming('');
              }}
              className="h-14 w-full rounded-[14px] bg-[#F2F4F6] px-4 text-[16px] text-[#191F28] outline-none transition-colors focus:bg-[#EDEFF2]"
            />
            <p className="mt-1.5 text-[13.5px] text-[#8B95A1]">{treatmentTiming ? '선택한 시기의 날짜를 미리 넣었어요. 정확한 날짜로 고칠 수 있어요.' : '날짜를 정확히 알면 직접 골라 주세요 (선택)'}</p>
          </Field>

          <Field label="시술 전체 비용">
            <div className="flex h-14 items-center rounded-[14px] bg-[#F2F4F6] px-4 transition-colors focus-within:bg-[#EDEFF2]">
              <input
                type="number"
                inputMode="numeric"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-[#191F28] outline-none"
              />
              <span className="ml-2 text-[16px] text-[#8B95A1]">원</span>
            </div>
            <p className="mt-1.5 text-[13.5px] leading-[1.5] text-[#8B95A1]">
              {partner ? '시술 전체 비용을 입력해 주세요.' : '예약 금액을 미리 입력했어요. 실제로 쓴 금액으로 고칠 수 있어요.'}
            </p>
          </Field>

          <Field label="할인 여부">
            <div className="flex gap-2">
              {(['받았음', '안 받았음'] as const).map((v) => {
                const isActive = (v === '받았음') === hasDiscountCheck;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setHasDiscountCheck(v === '받았음')}
                    className={`h-12 flex-1 rounded-[14px] text-[15px] transition-colors ${
                      isActive ? 'bg-[#EFF5FE] font-bold text-[#2F6FE4]' : 'bg-[#F2F4F6] font-semibold text-[#4E5968]'
                    }`}
                  >
                    {v === '받았음' ? '받았어요' : '안 받았어요'}
                  </button>
                );
              })}
            </div>
            {hasDiscount && (
              <p className="mt-1.5 text-[13.5px] text-[#3180F7]">
                결제 상품에 {product?.discount}% 할인이 적용돼 자동으로 골라 뒀어요.
              </p>
            )}
          </Field>
        </Section>

        <Band />

        {/* 리뷰 내용 */}
        <Section
          title="리뷰 내용"
          right={
            <button
              type="button"
              onClick={aiFill}
              disabled={aiLoading || rating === 0 || !product || submitting}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#EFF5FE] px-3 text-[14.5px] font-semibold text-[#2F6FE4] disabled:bg-[#F2F4F6] disabled:text-[#B0B8C1]"
            >
              <MonoIcon name="pencil" size={16} color="currentColor" />
              {aiLoading ? '쓰는 중...' : 'AI로 쓰기'}
            </button>
          }
          delay={0.3}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
            rows={8}
            placeholder="시술 과정, 결과, 병원 분위기 등을 자유롭게 남겨 주세요. (최소 50자)"
            className="w-full resize-none rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[16px] leading-[1.6] text-[#191F28] outline-none transition-colors placeholder:text-[#B0B8C1] focus:bg-[#EDEFF2]"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-[13.5px] ${content.length < 50 ? 'text-[#F04452]' : 'text-[#3180F7]'}`}>
              {content.length < 50
                ? `${50 - content.length}자 더 써 주세요`
                : '충분히 작성했어요'}
            </span>
            <span className="text-[13.5px] text-[#B0B8C1]">
              {content.length}/{MAX_CONTENT}
            </span>
          </div>
        </Section>
      </div>

      {/* 바닥 버튼 — 위에 흰 그라데이션 */}
      <div
        className="relative flex-shrink-0 bg-white px-4"
        style={{ paddingTop: 8, paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 16px)' }}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-gradient-to-b from-white/0 to-white" />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className={`h-14 w-full rounded-[18px] text-[17px] font-bold transition-colors btn-press disabled:opacity-60 ${
            canSubmit ? 'bg-[#4A82EE] text-white active:bg-[#3D74DF]' : 'bg-[#F2F4F6] text-[#B0B8C1]'
          }`}
        >
          {submitting ? '사진을 저장하고 등록하는 중…' : partner ? '초기 리뷰 등록하기' : '리뷰 등록하고 500P 받기'}
        </button>
      </div>
    </div>
  );
}

function Band() {
  return <div className="h-2.5 bg-[#F2F4F6]" />;
}

function OptionalTag() {
  return <span className="text-[14px] text-[#8B95A1]">선택</span>;
}

function Section({
  title,
  right,
  delay = 0,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="qd-a-item bg-white px-5 py-7" style={{ animationDelay: `${delay}s` }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <label className="mb-2 block text-[15px] font-semibold text-[#4E5968]">{label}</label>
      {children}
    </div>
  );
}

