'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Ad = {
  id: string;
  name: string;
  type: 'cpv' | 'banner' | 'featured';
  budget: number;
  spent: number;
  start_at: string | null;
  end_at: string | null;
  status: 'draft' | 'active' | 'paused' | 'ended';
  event?: { id: string; title: string } | null;
};

type EventOpt = { id: string; title: string };

const TYPE_LABEL: Record<Ad['type'], string> = {
  cpv: 'CPV (조회당 과금)',
  banner: '배너 광고',
  featured: '추천 노출',
};

const STATUS_LABEL: Record<Ad['status'], { text: string; bg: string; color: string }> = {
  draft: { text: '대기', bg: '#F3F4F6', color: '#6B7280' },
  active: { text: '노출중', bg: '#E6F7EB', color: '#15803D' },
  paused: { text: '일시정지', bg: '#FFF8E1', color: '#B45309' },
  ended: { text: '종료', bg: '#F3F4F6', color: '#6B7280' },
};

export default function AdsPage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const [ads, setAds] = useState<Ad[]>([]);
  const [events, setEvents] = useState<EventOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'cpv' as Ad['type'],
    budget: '',
    eventId: '',
    startAt: '',
    endAt: '',
  });

  const reload = async () => {
    const [adsRes, evtRes] = await Promise.all([
      fetch('/api/my-hospital/ads', { cache: 'no-store' }),
      fetch('/api/my-hospital/events', { cache: 'no-store' }),
    ]);
    if (adsRes.ok) {
      const { ads } = await adsRes.json();
      setAds(ads ?? []);
    }
    if (evtRes.ok) {
      const { events } = await evtRes.json();
      setEvents((events ?? []).filter((e: any) => e.status === 'approved' || e.status === 'active'));
    }
  };

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const handleAdd = async () => {
    if (!form.name.trim()) {
      showToast('캠페인명을 입력해주세요.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/my-hospital/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          budget: Number(form.budget) || 0,
          eventId: form.eventId || null,
          startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
          endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showToast(j.error || '등록 실패');
      } else {
        showToast('광고 캠페인이 등록되었습니다.');
        setShowAdd(false);
        setForm({ name: '', type: 'cpv', budget: '', eventId: '', startAt: '', endAt: '' });
        await reload();
      }
    } finally {
      setCreating(false);
    }
  };

  const togglePause = async (ad: Ad) => {
    const next = ad.status === 'active' ? 'paused' : 'active';
    setAds((p) => p.map((a) => (a.id === ad.id ? { ...a, status: next } : a)));
    await fetch(`/api/my-hospital/ads/${ad.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">부가 광고 관리</h1>
          <p className="text-[12px] text-gray-500 mt-1">홈 배너, 추천 노출 등 부가 광고를 관리합니다.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#7C3AED] text-white text-[13px] font-bold rounded-lg btn-press"
        >
          <Plus size={14} /> 캠페인 추가
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : ads.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400 mb-4">진행 중인 캠페인이 없습니다.</p>
          <button onClick={() => setShowAdd(true)} className="text-[#7C3AED] text-sm font-bold">
            첫 광고 캠페인 만들기
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
          {ads.map((ad) => {
            const s = STATUS_LABEL[ad.status];
            return (
              <div key={ad.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-gray-900">{ad.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: s.bg, color: s.color }}>
                      {s.text}
                    </span>
                  </div>
                  <button
                    onClick={() => togglePause(ad)}
                    className="text-[11px] text-[#7C3AED] font-bold"
                  >
                    {ad.status === 'active' ? '일시정지' : '활성화'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[12px] text-gray-500">
                  <div>
                    <span className="block text-[10px] text-gray-400">유형</span>
                    {TYPE_LABEL[ad.type]}
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400">예산 / 사용</span>
                    {ad.spent.toLocaleString()} / {ad.budget.toLocaleString()}원
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400">기간</span>
                    {ad.start_at && ad.end_at
                      ? `${new Date(ad.start_at).toLocaleDateString('ko-KR')} ~ ${new Date(ad.end_at).toLocaleDateString('ko-KR')}`
                      : '미설정'}
                  </div>
                </div>
                {ad.event?.title && (
                  <p className="text-[11px] text-gray-400 mt-2">대상 이벤트: {ad.event.title}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-bold text-gray-900">광고 캠페인 추가</h3>
              <button onClick={() => setShowAdd(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="캠페인명">
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
                />
              </Field>
              <Field label="유형">
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Ad['type'] }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
                >
                  <option value="cpv">CPV (조회당 과금)</option>
                  <option value="banner">배너 광고</option>
                  <option value="featured">추천 노출</option>
                </select>
              </Field>
              <Field label="대상 이벤트 (선택)">
                <select
                  value={form.eventId}
                  onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
                >
                  <option value="">선택 안함</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </Field>
              <Field label="예산 (원)">
                <input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="시작일">
                  <input
                    type="date"
                    value={form.startAt}
                    onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
                  />
                </Field>
                <Field label="종료일">
                  <input
                    type="date"
                    value={form.endAt}
                    onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
                  />
                </Field>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                취소
              </button>
              <button onClick={handleAdd} disabled={creating} className="flex-1 py-2.5 bg-[#7C3AED] text-white rounded-lg text-sm font-bold disabled:opacity-50">
                {creating ? '추가 중…' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
