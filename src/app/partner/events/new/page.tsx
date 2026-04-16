'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

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
      <div className="bg-white rounded-xl p-10 text-center">
        <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다.</p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Link href="/partner/events/list" className="inline-flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-900">
        <ChevronLeft size={14} /> 이벤트 목록
      </Link>

      <div>
        <h1 className="text-[18px] font-bold text-gray-900">이벤트 등록</h1>
        <p className="text-[12px] text-gray-500 mt-1">등록 후 관리자 검수를 거쳐 환자에게 노출됩니다.</p>
      </div>

      <Card title="기본 정보">
        <div className="space-y-3">
          <Field label="이벤트명 *">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 봄맞이 라미네이트 30% 할인"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
            />
          </Field>
          <Field label="이벤트 소개">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="이벤트 내용을 자세히 적어주세요."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED] resize-none"
            />
          </Field>
          <Field label="대표 이미지 URL (선택)">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
            />
          </Field>
        </div>
      </Card>

      <Card title="가격">
        <div className="grid grid-cols-2 gap-3">
          <Field label="정가 (원)">
            <input
              type="number"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
            />
          </Field>
          <Field label="할인가 (원) *">
            <input
              type="number"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
            />
          </Field>
        </div>
        {discountPercent !== null && discountPercent > 0 && (
          <p className="text-[12px] text-[#7C3AED] mt-2 font-bold">할인율: {discountPercent}%</p>
        )}
      </Card>

      <Card title="기간">
        <div className="grid grid-cols-2 gap-3">
          <Field label="시작일">
            <input
              type="date"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
            />
          </Field>
          <Field label="종료일">
            <input
              type="date"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
            />
          </Field>
        </div>
      </Card>

      <button
        onClick={submit}
        disabled={!canSubmit || submitting}
        className="w-full py-3.5 rounded-xl text-base font-bold btn-press"
        style={{
          backgroundColor: canSubmit && !submitting ? '#7C3AED' : '#E5E7EB',
          color: canSubmit && !submitting ? '#fff' : '#A4ABBA',
          boxShadow: canSubmit && !submitting ? '0 6px 16px rgba(124,58,237,0.25)' : 'none',
        }}
      >
        {submitting ? '등록 중…' : '이벤트 등록 (검수 요청)'}
      </button>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-[14px] font-bold text-gray-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
