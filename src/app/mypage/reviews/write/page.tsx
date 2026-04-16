'use client';

import { useState, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Star, X, Sparkles, ChevronLeft, Check, Stethoscope } from 'lucide-react';
import { useStore } from '@/store';
import { products, reservations, hospitals } from '@/lib/mock-data';
import Avatar from '@/components/common/Avatar';

export default function ReviewWritePageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩중...</div>}>
      <ReviewWritePage />
    </Suspense>
  );
}

type PhotoMode = 'before-after' | 'single';

type ExtraAspect = 'kindness' | 'cleanliness' | 'price' | 'revisit';
const ASPECTS: { key: ExtraAspect; label: string; emoji: string }[] = [
  { key: 'kindness', label: '친절도', emoji: '😊' },
  { key: 'cleanliness', label: '병원 깔끔함', emoji: '🧼' },
  { key: 'price', label: '가격 만족', emoji: '💰' },
  { key: 'revisit', label: '재방문 의사', emoji: '🔁' },
];

const TIME_OPTIONS = [
  '1주 이내',
  '1달 전',
  '2달 전',
  '3달 전',
  '6달 전',
  '1년 전',
];

function ReviewWritePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const { user, addReview, showToast } = useStore();

  const product = products.find((p) => p.id === productId) ?? products[0];
  const hospital = hospitals.find((h) => h.id === product.hospitalId);
  const doctors = hospital?.doctors ?? [];

  // Auto-filled from reservation
  const paidReservation = useMemo(() => {
    return reservations.find(
      (r) =>
        (r.hospitalId === product.hospitalId || r.productTitle === product.title) &&
        (r.status === 'completed' || r.status === 'confirmed')
    );
  }, [product]);
  const autoPaidAmount = paidReservation?.amount ?? product.price;
  const hasDiscount = Boolean(product.discount && product.discount > 0);

  const [rating, setRating] = useState(0);
  const [aspects, setAspects] = useState<Record<ExtraAspect, number>>({
    kindness: 0,
    cleanliness: 0,
    price: 0,
    revisit: 0,
  });
  const [content, setContent] = useState('');
  const [totalCost, setTotalCost] = useState(String(autoPaidAmount));
  const [hasDiscountCheck, setHasDiscountCheck] = useState(hasDiscount);
  const [treatmentTiming, setTreatmentTiming] = useState<string>('');
  const [treatmentDate, setTreatmentDate] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [photoMode, setPhotoMode] = useState<PhotoMode>('before-after');
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [beforeDate, setBeforeDate] = useState('');
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [afterDate, setAfterDate] = useState('');
  const [singleImage, setSingleImage] = useState<string | null>(null);
  const [singleDate, setSingleDate] = useState('');
  const [mosaicRequested, setMosaicRequested] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const MAX_CONTENT = 2000;

  const pickFile = (onLoad: (dataUrl: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onloadend = () => onLoad(reader.result as string);
      reader.readAsDataURL(f);
    };
    input.click();
  };

  const aiFill = async () => {
    setAiLoading(true);
    const hasAspectFeedback = Object.values(aspects).some((v) => v > 0);
    await new Promise((r) => setTimeout(r, 900));
    const avgAspect =
      Object.values(aspects).reduce((s, v) => s + v, 0) /
      Object.values(aspects).filter((v) => v > 0).length || rating;
    const satisfaction = avgAspect >= 4 ? '만족' : avgAspect >= 3 ? '보통' : '아쉬움';
    const text = `${product.hospitalName}에서 ${product.title} 시술을 받았습니다.
상담부터 시술까지 전반적으로 ${satisfaction}스러웠고, 결과도 기대에 부합했습니다.
${hasAspectFeedback && aspects.kindness >= 4 ? '원장님과 스태프분들의 응대가 매우 친절했습니다.\n' : ''}${hasAspectFeedback && aspects.cleanliness >= 4 ? '병원 시설이 깨끗하게 잘 관리되고 있어 편안하게 진료받을 수 있었습니다.\n' : ''}${hasAspectFeedback && aspects.revisit >= 4 ? '다음에도 다른 시술이 필요하면 재방문 의사가 있습니다.\n' : ''}회복 과정도 무난했고, 주의사항 안내도 자세했습니다.
시술을 고민 중이신 분들께 추천드립니다.`;
    setContent(text);
    setAiLoading(false);
    showToast('AI가 리뷰를 작성했습니다. 내용을 다듬어주세요.');
  };

  const handleSubmit = () => {
    if (rating === 0) {
      showToast('별점을 선택해주세요.');
      return;
    }
    if (content.length < 50) {
      showToast('리뷰는 최소 50자 이상 작성해주세요.');
      return;
    }
    addReview({
      id: `review_${Date.now()}`,
      authorName: user?.name ?? '홍길동',
      authorId: user?.id ?? '1',
      date: new Date().toISOString().split('T')[0],
      rating,
      content,
      beforeImage: beforeImage || undefined,
      afterImage: afterImage || undefined,
      treatmentName: product.title,
      totalCost: parseInt(totalCost, 10) || 0,
      treatmentDate: treatmentTiming || treatmentDate,
      productId: product.id,
      hospitalId: product.hospitalId,
      doctorId: selectedDoctorId || undefined,
      doctorName: doctors.find((d) => d.id === selectedDoctorId)?.name,
    });
    showToast('리뷰가 작성되었습니다!');
    router.push('/mypage/reviews');
  };

  return (
    <div className="h-[100dvh] bg-white w-full max-w-[480px] lg:max-w-[560px] mx-auto flex flex-col overflow-hidden">
      {/* Sticky header */}
      <header className="flex-shrink-0 h-12 flex items-center px-2.5 border-b border-gray-100 bg-white">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft size={22} className="text-gray-900" />
        </button>
        <h1 className="text-[16px] font-bold ml-1">리뷰 작성</h1>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-4">
        {/* Product header */}
        <div className="px-2.5 py-3 flex items-center gap-3 border-b border-gray-100">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🦷</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-500 leading-tight">{product.hospitalName}</p>
            <p className="text-[14px] font-bold text-gray-900 line-clamp-1 leading-tight mt-0.5">
              {product.title}
            </p>
          </div>
        </div>

        <div className="stagger-children">
          {/* 별점 */}
          <Section title="이 시술에 만족하셨나요?">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setRating(v)}
                  className="p-1 btn-press"
                  style={{ transition: 'transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                >
                  <Star
                    size={38}
                    fill={v <= rating ? '#FBBF24' : 'transparent'}
                    stroke={v <= rating ? '#FBBF24' : '#D1D5DB'}
                    strokeWidth={2}
                    style={{
                      transform: v <= rating ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-[13px] font-bold text-[#7C3AED] mt-1 fade-in-up">
                {['아쉬워요', '괜찮아요', '좋아요', '만족해요', '최고예요'][rating - 1]}
              </p>
            )}
          </Section>

          {/* Aspect ratings */}
          {rating > 0 && (
            <Section title="세부 평가 (선택)">
              <div className="space-y-3">
                {ASPECTS.map((a) => (
                  <div
                    key={a.key}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5"
                  >
                    <span className="text-lg">{a.emoji}</span>
                    <span className="flex-1 text-[13px] font-semibold text-gray-800">
                      {a.label}
                    </span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          onClick={() =>
                            setAspects((p) => ({ ...p, [a.key]: p[a.key] === v ? 0 : v }))
                          }
                          className="p-0.5"
                        >
                          <Star
                            size={18}
                            fill={v <= aspects[a.key] ? '#FBBF24' : 'transparent'}
                            stroke={v <= aspects[a.key] ? '#FBBF24' : '#D1D5DB'}
                            strokeWidth={2}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Photos */}
          <Section
            title="시술 사진"
            right={
              <span className="text-[11px] text-gray-400">리뷰 작성 혜택 +500P</span>
            }
          >
            {/* Mode tabs — sliding pill indicator */}
            <div
              className="relative flex mb-3 bg-gray-100 rounded-full p-1"
              style={{ height: 38 }}
            >
              <span
                aria-hidden
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-white"
                style={{
                  left: photoMode === 'before-after' ? 4 : 'calc(50%)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'left 360ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
              <button
                onClick={() => setPhotoMode('before-after')}
                className="relative z-10 flex-1 text-[12px] font-semibold"
                style={{
                  color: photoMode === 'before-after' ? '#2B313D' : '#9CA3AF',
                  transition: 'color 360ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                전/후 비교
              </button>
              <button
                onClick={() => setPhotoMode('single')}
                className="relative z-10 flex-1 text-[12px] font-semibold"
                style={{
                  color: photoMode === 'single' ? '#2B313D' : '#9CA3AF',
                  transition: 'color 360ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                단일 사진
              </button>
            </div>

            {/* Directional slide based on tab direction */}
            {photoMode === 'before-after' ? (
              <div key="ba" className="grid grid-cols-2 gap-2 tab-slide-left">
                <PhotoSlot
                  label="BEFORE"
                  badgeColor="#2B313D"
                  image={beforeImage}
                  date={beforeDate}
                  onPick={() => pickFile(setBeforeImage)}
                  onRemove={() => {
                    setBeforeImage(null);
                    setBeforeDate('');
                  }}
                  onDateChange={setBeforeDate}
                />
                <PhotoSlot
                  label="AFTER"
                  badgeColor="#7C3AED"
                  image={afterImage}
                  date={afterDate}
                  onPick={() => pickFile(setAfterImage)}
                  onRemove={() => {
                    setAfterImage(null);
                    setAfterDate('');
                  }}
                  onDateChange={setAfterDate}
                />
              </div>
            ) : (
              <div key="single" className="tab-slide-right">
                <PhotoSlot
                  label="사진"
                  badgeColor="#7C3AED"
                  image={singleImage}
                  date={singleDate}
                  onPick={() => pickFile(setSingleImage)}
                  onRemove={() => {
                    setSingleImage(null);
                    setSingleDate('');
                  }}
                  onDateChange={setSingleDate}
                  aspect="16/10"
                />
              </div>
            )}

            <label className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={mosaicRequested}
                onChange={(e) => setMosaicRequested(e.target.checked)}
                className="w-4 h-4 mt-0.5 flex-shrink-0 accent-[#7C3AED]"
              />
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-gray-900">모자이크 처리 요청</p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                  눈·문신·기타 개인 식별 부위를 운영팀에서 검토 후 모자이크 처리해드립니다.
                </p>
              </div>
            </label>
          </Section>

          {/* 담당 의사 */}
          <Section
            title="담당 의사"
            right={<span className="text-[11px] text-gray-400">선택</span>}
          >
            {doctors.length === 0 ? (
              <p className="text-[12px] text-gray-400 text-center py-4">
                등록된 의사가 없습니다.
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {doctors.map((d) => {
                  const selected = selectedDoctorId === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDoctorId(selected ? '' : d.id)}
                      className="flex-shrink-0 flex flex-col items-center gap-1.5 card-press relative"
                      style={{ width: 72 }}
                    >
                      <div
                        className="relative w-[60px] h-[60px] rounded-full flex items-center justify-center overflow-hidden"
                        style={{
                          backgroundColor: selected ? '#F4EFFF' : '#F3F4F6',
                          boxShadow: selected
                            ? '0 4px 12px rgba(124,58,237,0.2)'
                            : 'none',
                          transform: selected ? 'scale(1.05)' : 'scale(1)',
                          transition:
                            'all 240ms cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                      >
                        {d.profileImage ? (
                          <img
                            src={d.profileImage}
                            alt={d.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Avatar role="doctor" seed={d.id} size={52} />
                        )}
                        {selected && (
                          <span
                            className="absolute inset-0 rounded-full border-2 check-pop"
                            style={{ borderColor: '#7C3AED' }}
                          />
                        )}
                      </div>
                      <p
                        className="text-[12px] font-semibold line-clamp-1 w-full text-center"
                        style={{ color: selected ? '#7C3AED' : '#2B313D' }}
                      >
                        {d.name}
                      </p>
                      {d.isOwner && (
                        <span className="text-[9px] text-gray-500 bg-gray-100 rounded px-1 py-0.5 leading-none">
                          대표원장
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedDoctorId && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#F4EFFF] px-3 py-2 fade-in-up">
                <Stethoscope size={12} className="text-[#7C3AED]" />
                <p className="text-[11px] text-[#7C3AED] font-semibold">
                  {doctors.find((d) => d.id === selectedDoctorId)?.name} 원장
                  지정하여 리뷰합니다.
                </p>
              </div>
            )}
          </Section>

          {/* 시술 정보 */}
          <Section title="시술 정보">
            <Field label="시술받은 시기">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {TIME_OPTIONS.map((t) => {
                  const sel = treatmentTiming === t;
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        setTreatmentTiming(sel ? '' : t);
                        if (!sel) setTreatmentDate('');
                      }}
                      className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                      style={{
                        backgroundColor: sel ? '#F4EFFF' : '#fff',
                        color: sel ? '#7C3AED' : '#51535C',
                        border: `1px solid ${sel ? '#7C3AED' : '#E5E7EB'}`,
                        transition: 'all 200ms ease',
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <input
                type="date"
                value={treatmentDate}
                onChange={(e) => {
                  setTreatmentDate(e.target.value);
                  if (e.target.value) setTreatmentTiming('');
                }}
                className="w-full max-w-[180px] px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#7C3AED]"
              />
              <p className="text-[10px] text-gray-400 mt-1">선택 · 날짜를 정확히 아는 경우 직접 입력</p>
            </Field>

            <Field label="시술 전체 비용">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  className="flex-1 max-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#7C3AED]"
                />
                <span className="text-[12px] text-gray-500">원</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                결제 내역 기반으로 자동 입력됩니다. 실제 지출 금액으로 수정 가능합니다.
              </p>
            </Field>

            <Field label="할인 여부">
              <div className="flex gap-1.5">
                {(['받았음', '안 받았음'] as const).map((v) => {
                  const isActive = (v === '받았음') === hasDiscountCheck;
                  return (
                    <button
                      key={v}
                      onClick={() => setHasDiscountCheck(v === '받았음')}
                      className="flex-1 py-2 rounded-lg text-[12px] font-semibold"
                      style={{
                        backgroundColor: isActive ? '#F4EFFF' : '#fff',
                        color: isActive ? '#7C3AED' : '#51535C',
                        border: `1px solid ${isActive ? '#7C3AED' : '#E5E7EB'}`,
                        transition: 'all 200ms ease',
                      }}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
              {hasDiscount && (
                <p className="text-[10px] text-[#7C3AED] mt-1">
                  결제 상품에 {product.discount}% 할인이 적용되어 자동 체크됩니다.
                </p>
              )}
            </Field>
          </Section>

          {/* 리뷰 내용 */}
          <Section
            title="리뷰 내용"
            right={
              <button
                onClick={aiFill}
                disabled={aiLoading || rating === 0}
                className="flex items-center gap-1 text-[11px] font-bold text-[#7C3AED] disabled:text-gray-400"
              >
                <Sparkles size={12} />
                {aiLoading ? '작성 중...' : 'AI로 작성'}
              </button>
            }
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
              rows={8}
              placeholder="시술 과정, 결과, 병원 분위기 등을 자유롭게 남겨주세요. (최소 50자)"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#7C3AED] transition-colors resize-none"
            />
            <div className="flex items-center justify-between mt-1.5">
              <span
                className="text-[11px]"
                style={{ color: content.length < 50 ? '#E5484D' : '#9CA3AF' }}
              >
                {content.length < 50
                  ? `최소 ${50 - content.length}자 더 작성해주세요`
                  : '충분히 작성되었어요'}
              </span>
              <span className="text-[11px] text-gray-400">
                {content.length}/{MAX_CONTENT}
              </span>
            </div>
          </Section>
        </div>
      </div>

      {/* Sticky footer */}
      <div
        className="flex-shrink-0 bg-white px-2.5 py-3"
        style={{
          borderTop: '1px solid #F2F3F5',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <button
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-xl text-[14px] font-bold btn-press"
          style={{
            backgroundColor:
              rating > 0 && content.length >= 50 ? '#7C3AED' : '#E5E7EB',
            color: rating > 0 && content.length >= 50 ? '#fff' : '#A4ABBA',
            boxShadow:
              rating > 0 && content.length >= 50
                ? '0 6px 16px rgba(124,58,237,0.3)'
                : 'none',
            transition: 'all 240ms ease',
          }}
        >
          리뷰 등록하고 500P 받기
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="px-2.5 py-4 border-b border-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold text-gray-900 leading-tight">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function PhotoSlot({
  label,
  badgeColor,
  image,
  date,
  onPick,
  onRemove,
  onDateChange,
  aspect = '1/1',
}: {
  label: string;
  badgeColor: string;
  image: string | null;
  date: string;
  onPick: () => void;
  onRemove: () => void;
  onDateChange: (v: string) => void;
  aspect?: string;
}) {
  return (
    <div>
      <div
        onClick={image ? undefined : onPick}
        className="relative rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
        style={{ aspectRatio: aspect }}
      >
        {image ? (
          <>
            <img src={image} alt="" className="w-full h-full object-cover" />
            <span
              className="absolute top-2 left-2 text-[10px] font-bold text-white rounded px-2 py-0.5"
              style={{ backgroundColor: badgeColor }}
            >
              {label}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <Camera size={22} />
            <p className="text-[11px] font-semibold mt-1">{label}</p>
          </div>
        )}
      </div>
      <input
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        placeholder="촬영일"
        className="mt-1.5 w-full px-2 py-1.5 bg-gray-50 border border-gray-100 rounded text-[11px] outline-none focus:border-[#7C3AED]"
      />
    </div>
  );
}
