'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function EventEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
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

  const remove = async () => {
    if (!confirm('이 이벤트를 삭제할까요?')) return;
    const res = await fetch(`/api/my-hospital/events/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('삭제되었습니다.');
      router.push('/partner/events/list');
    } else {
      showToast('삭제 실패');
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

  if (loading) return <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>;
  if (!evt) {
    return (
      <div className="bg-white rounded-xl p-10 text-center">
        <p className="text-sm text-gray-500 mb-4">이벤트를 찾을 수 없습니다.</p>
        <Link href="/partner/events/list" className="text-[#7C3AED] text-sm font-bold">목록으로</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Link href="/partner/events/list" className="inline-flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-900">
        <ChevronLeft size={14} /> 이벤트 목록
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-bold text-gray-900">이벤트 편집</h1>
        <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">
          {evt.status}
        </span>
      </div>

      {evt.reject_reason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-[12px] text-red-600 font-bold mb-1">반려 사유</p>
          <p className="text-[12px] text-red-500">{evt.reject_reason}</p>
        </div>
      )}

      <Card title="기본 정보">
        <div className="space-y-3">
          <Field label="이벤트명">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]" />
          </Field>
          <Field label="이벤트 소개">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED] resize-none" />
          </Field>
          <Field label="대표 이미지 URL">
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]" />
          </Field>
        </div>
      </Card>

      <Card title="가격">
        <div className="grid grid-cols-2 gap-3">
          <Field label="정가 (원)">
            <input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]" />
          </Field>
          <Field label="할인가 (원)">
            <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]" />
          </Field>
        </div>
        {discountPercent !== null && discountPercent > 0 && (
          <p className="text-[12px] text-[#7C3AED] mt-2 font-bold">할인율: {discountPercent}%</p>
        )}
      </Card>

      <Card title="기간">
        <div className="grid grid-cols-2 gap-3">
          <Field label="시작일">
            <input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]" />
          </Field>
          <Field label="종료일">
            <input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]" />
          </Field>
        </div>
      </Card>

      <div className="flex gap-2">
        <button onClick={remove} className="flex-1 py-3.5 rounded-xl text-sm font-bold border border-red-200 text-red-600">삭제</button>
        <button onClick={save} disabled={saving} className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-[#7C3AED] text-white disabled:opacity-50">
          {saving ? '저장 중…' : '저장하기'}
        </button>
      </div>
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
