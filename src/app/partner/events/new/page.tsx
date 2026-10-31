'use client';

// 이벤트 등록 — 상품 상세(261031) 톤: 흰 칸 + 20 굵은 제목 · 회색 띠로 칸 나눔 · 테두리 없는 회색 입력 칸 · 바닥에 떠 있는 버튼.

import { useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import { ImageUploader } from '@/components/admin/ImageUploader';

export default function EventNewPage() {
  const router = useRouter();
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const discountPercent =
    originalPrice && salePrice && Number(originalPrice) > 0
      ? Math.round((1 - Number(salePrice) / Number(originalPrice)) * 100)
      : null;

  const canSubmit = title.trim() && salePrice && Number(salePrice) > 0;

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/my-hospital/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          imageUrl: imageUrl.trim() || null,
          originalPrice: originalPrice ? Number(originalPrice) : null,
          salePrice: Number(salePrice),
          discountPercent,
          startAt: startAt ? new Date(startAt).toISOString() : null,
          endAt: endAt ? new Date(endAt).toISOString() : null,
          status: 'pending',
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showToast(j.error || '등록 실패');
        return;
      }
      showToast('이벤트가 등록되었습니다. 관리자 승인 후 노출됩니다.');
      router.push('/partner/events/list');
    } finally {
      setSubmitting(false);
    }
  };

  if (!authUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
          <MonoIcon name="lock" size={34} color="#B0B8C1" />
        </span>
        <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">로그인이 필요해요</p>
        <Link href="/login" className="mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold text-[#3180F7]">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 112px), 128px)' }}>
      <TopBar title="이벤트 등록" sub="등록하면 관리자 검수를 거쳐 환자에게 보여요." />

      <Section title="기본 정보" first>
        <Field label="이벤트명" required>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예) 봄맞이 라미네이트 30% 할인"
            className={INPUT}
          />
        </Field>
        <Field label="이벤트 소개">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="이벤트 내용을 자세히 적어주세요."
            className={TEXTAREA}
          />
        </Field>
        <Field label="대표 이미지 (선택)">
          <ImageUploader
            value={imageUrl}
            onChange={setImageUrl}
            folder="event-cover"
            aspect="4/3"
            placeholder="이벤트 대표 이미지 업로드"
          />
        </Field>
      </Section>

      <Band />
      <Section title="가격">
        <div className="grid grid-cols-2 gap-2">
          <Field label="정가 (원)">
            <input type="number" inputMode="numeric" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className={INPUT} />
          </Field>
          <Field label="할인가 (원)" required>
            <input type="number" inputMode="numeric" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className={INPUT} />
          </Field>
        </div>
        {discountPercent !== null && discountPercent > 0 && (
          <div className="rounded-[14px] bg-[#EFF5FE] px-5 pb-4 pt-3.5">
            <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">{discountPercent}% 할인</span>
            <p className="mt-2.5 text-[26px] font-bold tracking-[-0.6px] text-[#1E3A78]">{Number(salePrice).toLocaleString()}원</p>
          </div>
        )}
      </Section>

      <Band />
      <Section title="기간">
        <div className="grid grid-cols-2 gap-2">
          <Field label="시작일">
            <input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={INPUT} />
          </Field>
          <Field label="종료일">
            <input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={INPUT} />
          </Field>
        </div>
      </Section>

      <BottomBar>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98] disabled:bg-[#E5E8EB] disabled:text-[#B0B8C1]"
        >
          {submitting ? '등록 중…' : '이벤트 등록'}
        </button>
      </BottomBar>
    </div>
  );
}

// 입력 칸 — 테두리 없는 회색 칸(globals .partner-page input 을 ! 로 덮는다), 글자 16(iOS 확대 방지)
const INPUT =
  '!h-14 !min-h-0 w-full !rounded-[14px] !border-0 !bg-[#F2F4F6] !py-0 !px-4 !text-[16px] !font-medium !text-[#191F28] outline-none transition-colors placeholder:!text-[#B0B8C1] focus:!bg-[#EDEFF2] focus:!shadow-none';
const TEXTAREA =
  '!min-h-0 w-full resize-none !rounded-[14px] !border-0 !bg-[#F2F4F6] !px-4 !py-3.5 !text-[16px] !font-medium !leading-[1.6] !text-[#191F28] outline-none transition-colors placeholder:!text-[#B0B8C1] focus:!bg-[#EDEFF2] focus:!shadow-none';

const Band = () => <div className="h-2.5 bg-[#F2F4F6]" />;

function Section({ title, first, children }: { title: string; first?: boolean; children: React.ReactNode }) {
  return (
    <section className={`qd-a-item px-5 ${first ? 'pb-7 pt-2' : 'py-7'}`}>
      <h2 className="!text-[20px] font-bold !leading-[1.3] tracking-[-0.4px] text-[#191F28]">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[15px] font-semibold text-[#4E5968]">
        {label}
        {required && <span className="ml-0.5 text-[#3180F7]">*</span>}
      </p>
      {children}
    </div>
  );
}

// 바닥 버튼 — 위 선 대신 흰 흐림 띠 위에 떠 있다(예약 상세와 같은 결)
function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40" style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)' }}>
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, white 30%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.5) 70%, rgba(255,255,255,0) 100%)',
          maskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
        }}
      />
      <div className="pointer-events-auto relative mx-auto flex max-w-[608px] gap-2 pt-10">{children}</div>
    </div>
  );
}
