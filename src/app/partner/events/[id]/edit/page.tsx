'use client';

// 이벤트 편집 — 이벤트 등록과 같은 결: 상태 배지 · 반려 사유 칸 · 회색 띠로 칸 나눔 · 회색 입력 칸 · 바닥 버튼 둘(같은 폭).

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import { ImageUploader } from '@/components/admin/ImageUploader';

/* eslint-disable @typescript-eslint/no-explicit-any */
// 상태 배지(표시용) — 대기=회색 · 승인/노출=파랑 · 거절=빨강
const STATUS_BADGE: Record<string, { text: string; tone: string }> = {
  draft: { text: '임시저장', tone: 'bg-[#F2F4F6] text-[#6B7684]' },
  pending: { text: '검수 중', tone: 'bg-[#F2F4F6] text-[#6B7684]' },
  approved: { text: '승인됨', tone: 'bg-[#E8F3FF] text-[#3180F7]' },
  active: { text: '노출 중', tone: 'bg-[#E8F3FF] text-[#3180F7]' },
  rejected: { text: '거절됨', tone: 'bg-[#FFEEEF] text-[#F04452]' },
  ended: { text: '종료', tone: 'bg-[#F2F4F6] text-[#6B7684]' },
};

export default function EventEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const showConfirm = useStore((s) => s.showConfirm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evt, setEvt] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my-hospital/events', { cache: 'no-store' });
        if (!res.ok) return;
        const { events } = await res.json();
        const found = (events ?? []).find((e: any) => e.id === id);
        if (cancelled || !found) {
          if (!found) showToast('이벤트를 찾을 수 없습니다.');
          return;
        }
        setEvt(found);
        setTitle(found.title ?? '');
        setDescription(found.description ?? '');
        setImageUrl(found.image_url ?? '');
        setOriginalPrice(found.original_price ?? '');
        setSalePrice(found.sale_price ?? '');
        setStartAt(found.start_at ? found.start_at.slice(0, 10) : '');
        setEndAt(found.end_at ? found.end_at.slice(0, 10) : '');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser, id, showToast]);

  const discountPercent =
    originalPrice && salePrice && Number(originalPrice) > 0
      ? Math.round((1 - Number(salePrice) / Number(originalPrice)) * 100)
      : null;

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/my-hospital/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          imageUrl: imageUrl.trim() || null,
          originalPrice: originalPrice ? Number(originalPrice) : null,
          salePrice: salePrice ? Number(salePrice) : null,
          discountPercent,
          startAt: startAt ? new Date(startAt).toISOString() : null,
          endAt: endAt ? new Date(endAt).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showToast(j.error || '저장 실패');
      } else {
        showToast('저장되었습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    showConfirm('이벤트 삭제', '이 이벤트를 삭제할까요?', async () => {
      const res = await fetch(`/api/my-hospital/events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('삭제되었습니다.');
        router.push('/partner/events/list');
      } else {
        showToast('삭제 실패');
      }
    });
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

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-white">
        <TopBar title="이벤트 편집" />
        <p className="py-20 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
      </div>
    );
  }
  if (!evt) {
    return (
      <div className="bg-white">
        <TopBar title="이벤트 편집" />
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
            <MonoIcon name="gift" size={34} color="#B0B8C1" />
          </span>
          <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">이벤트를 찾을 수 없어요</p>
          <Link href="/partner/events/list" className="mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold text-[#3180F7]">
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  const badge = STATUS_BADGE[evt.status] ?? { text: String(evt.status ?? ''), tone: 'bg-[#F2F4F6] text-[#6B7684]' };

  return (
    <div className="bg-white" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 112px), 128px)' }}>
      <TopBar
        title="이벤트 편집"
        sub={<span className={`inline-flex h-6 items-center rounded-[6px] px-2 text-[13.5px] font-semibold ${badge.tone}`}>{badge.text}</span>}
      />

      {evt.reject_reason && (
        <div className="qd-a-item px-5 pb-2">
          <div className="flex gap-2 rounded-[14px] bg-[#FFEEEF] px-4 py-3.5">
            <MonoIcon name="exclamation-circle" size={18} color="#F04452" className="mt-px" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-[#F04452]">반려 사유</p>
              <p className="mt-0.5 whitespace-pre-line text-[14px] leading-[1.5] text-[#4E5968]">{evt.reject_reason}</p>
            </div>
          </div>
        </div>
      )}

      <Section title="기본 정보" first>
        <Field label="이벤트명">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} />
        </Field>
        <Field label="이벤트 소개">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={TEXTAREA} />
        </Field>
        <Field label="대표 이미지">
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
          <Field label="할인가 (원)">
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
          onClick={remove}
          className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#F2F4F6] text-[17px] font-bold text-[#F04452] transition-all active:scale-[0.98]"
        >
          삭제
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98] disabled:bg-[#E5E8EB] disabled:text-[#B0B8C1]"
        >
          {saving ? '저장 중…' : '저장하기'}
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
