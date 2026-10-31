'use client';

// 부가 광고 관리 — 상품 상세(261031) 톤: 테두리 없는 캠페인 줄 · 상태 배지 · 남색 예산 숫자와 얇은 막대 · 회색 입력 칸 시트.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import { PartnerModal } from '@/components/partner/tds';

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

// 상태 배지 — 대기·정지·종료=회색 · 노출=파랑
const STATUS_LABEL: Record<Ad['status'], { text: string; tone: string }> = {
  draft: { text: '대기', tone: 'bg-[#F2F4F6] text-[#6B7684]' },
  active: { text: '노출중', tone: 'bg-[#E8F3FF] text-[#3180F7]' },
  paused: { text: '일시정지', tone: 'bg-[#F2F4F6] text-[#6B7684]' },
  ended: { text: '종료', tone: 'bg-[#F2F4F6] text-[#6B7684]' },
};

// 입력 칸 — 테두리 없는 회색 칸(globals .partner-page input/select 를 ! 로 덮는다), 글자 16
const INPUT =
  '!h-14 !min-h-0 w-full !rounded-[14px] !border-0 !bg-[#F2F4F6] !py-0 !px-4 !text-[16px] !font-medium !text-[#191F28] outline-none transition-colors placeholder:!text-[#B0B8C1] focus:!bg-[#EDEFF2] focus:!shadow-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[15px] font-semibold text-[#4E5968]">{label}</p>
      {children}
    </div>
  );
}

function SelectBox({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${INPUT} appearance-none !pr-10`}>
        {children}
      </select>
      <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8B95A1]" />
    </div>
  );
}

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
    <div className="bg-white pb-12">
      <TopBar
        title="부가 광고 관리"
        sub="홈 배너, 추천 노출 같은 부가 광고를 관리해요."
        rightContent={
          <button type="button" onClick={() => setShowAdd(true)} className="pd-head-text-btn inline-flex items-center gap-1">
            <MonoIcon name="plus" size={16} color="#3180F7" />
            추가
          </button>
        }
      />

      <div className="qd-a-item px-3 pt-1">
        {loading ? (
          <p className="py-20 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
        ) : ads.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
              <MonoIcon name="megaphone" size={34} color="#B0B8C1" />
            </span>
            <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">진행 중인 캠페인이 없어요</p>
            <p className="mt-1.5 text-[15px] leading-[1.6] text-[#8B95A1]">배너·추천 노출로 병원을 더 많이 알려 보세요</p>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold text-[#3180F7]"
            >
              첫 광고 캠페인 만들기
            </button>
          </div>
        ) : (
          <ul>
            {ads.map((ad) => {
              const s = STATUS_LABEL[ad.status];
              const period = ad.start_at && ad.end_at
                ? `${new Date(ad.start_at).toLocaleDateString('ko-KR')} ~ ${new Date(ad.end_at).toLocaleDateString('ko-KR')}`
                : '기간 미설정';
              const ratio = ad.budget > 0 ? Math.min(100, (ad.spent / ad.budget) * 100) : 0;
              return (
                <li key={ad.id} className="rounded-[16px] px-2 py-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-6 shrink-0 items-center rounded-[6px] px-2 text-[13.5px] font-semibold ${s.tone}`}>{s.text}</span>
                        <span className="min-w-0 truncate text-[17px] font-bold text-[#191F28]">{ad.name}</span>
                      </div>
                      <p className="mt-1 text-[14px] leading-[1.5] text-[#6B7684]">
                        {TYPE_LABEL[ad.type]} · {period}{ad.event?.title ? ` · ${ad.event.title}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePause(ad)}
                      className="flex h-9 shrink-0 items-center rounded-[10px] bg-[#F2F4F6] px-3 text-[14.5px] font-semibold text-[#333D4B] transition-all active:scale-[0.97] active:bg-[#E5E8EB]"
                    >
                      {ad.status === 'active' ? '정지' : '활성'}
                    </button>
                  </div>
                  <div className="mt-3 rounded-[14px] bg-[#EFF5FE] px-4 py-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[14px] font-semibold text-[#1E3A78]/70">사용 / 예산</span>
                      <span className="text-[16px] font-bold text-[#1E3A78]">
                        {ad.spent.toLocaleString()} / {ad.budget.toLocaleString()}원
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-[#2F6FE4] transition-all duration-700" style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showAdd && (
        <PartnerModal
          title="광고 캠페인 추가"
          onClose={() => setShowAdd(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#F2F4F6] text-[17px] font-bold text-[#4E5968] transition-all active:scale-[0.98]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={creating}
                className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98] disabled:bg-[#E5E8EB] disabled:text-[#B0B8C1]"
              >
                {creating ? '추가 중…' : '추가'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="캠페인명">
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={INPUT} />
            </Field>
            <Field label="유형">
              <SelectBox value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v as Ad['type'] }))}>
                <option value="cpv">CPV (조회당 과금)</option>
                <option value="banner">배너 광고</option>
                <option value="featured">추천 노출</option>
              </SelectBox>
            </Field>
            <Field label="대상 이벤트 (선택)">
              <SelectBox value={form.eventId} onChange={(v) => setForm((f) => ({ ...f, eventId: v }))}>
                <option value="">선택 안함</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </SelectBox>
            </Field>
            <Field label="예산 (원)">
              <input
                type="number"
                inputMode="numeric"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                className={INPUT}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="시작일">
                <input type="date" value={form.startAt} onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))} className={INPUT} />
              </Field>
              <Field label="종료일">
                <input type="date" value={form.endAt} onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))} className={INPUT} />
              </Field>
            </div>
          </div>
        </PartnerModal>
      )}
    </div>
  );
}
