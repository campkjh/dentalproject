'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Megaphone, Plus } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import {
  PartnerButton,
  PartnerEmpty,
  PartnerField,
  PartnerInput,
  PartnerListRow,
  PartnerModal,
  PartnerPanel,
  PartnerSelect,
  PartnerStatusBadge,
  PartnerTop,
} from '@/components/partner/tds';

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

const STATUS_LABEL: Record<Ad['status'], { text: string; tone: 'neutral' | 'success' | 'warning' }> = {
  draft: { text: '대기', tone: 'neutral' },
  active: { text: '노출중', tone: 'success' },
  paused: { text: '일시정지', tone: 'warning' },
  ended: { text: '종료', tone: 'neutral' },
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
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#3182F6] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PartnerTop
        eyebrow="광고"
        title="부가 광고 관리"
        description="홈 배너, 추천 노출 등 부가 광고를 관리합니다."
        icon={<Megaphone size={28} />}
        action={
          <PartnerButton type="button" size="m" leftIcon={<Plus size={16} />} onClick={() => setShowAdd(true)}>
            추가
          </PartnerButton>
        }
      />

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>
      ) : ads.length === 0 ? (
        <PartnerEmpty
          icon={<Megaphone size={24} />}
          title="진행 중인 캠페인이 없습니다."
          action={<PartnerButton type="button" variant="weak" size="m" onClick={() => setShowAdd(true)}>첫 광고 캠페인 만들기</PartnerButton>}
        />
      ) : (
        <PartnerPanel className="overflow-hidden">
          {ads.map((ad) => {
            const s = STATUS_LABEL[ad.status];
            const period = ad.start_at && ad.end_at
              ? `${new Date(ad.start_at).toLocaleDateString('ko-KR')} ~ ${new Date(ad.end_at).toLocaleDateString('ko-KR')}`
              : '기간 미설정';
            return (
              <PartnerListRow
                key={ad.id}
                icon={<Megaphone size={16} />}
                title={
                  <span className="flex items-center gap-2">
                    <span className="truncate">{ad.name}</span>
                    <PartnerStatusBadge tone={s.tone}>{s.text}</PartnerStatusBadge>
                  </span>
                }
                description={`${TYPE_LABEL[ad.type]} · ${period}${ad.event?.title ? ` · ${ad.event.title}` : ''}`}
                meta={`${ad.spent.toLocaleString()} / ${ad.budget.toLocaleString()}원`}
                action={
                  <PartnerButton type="button" variant="text" size="s" onClick={() => togglePause(ad)}>
                    {ad.status === 'active' ? '정지' : '활성'}
                  </PartnerButton>
                }
              />
            );
          })}
        </PartnerPanel>
      )}

      {showAdd && (
        <PartnerModal
          title="광고 캠페인 추가"
          onClose={() => setShowAdd(false)}
          footer={
            <>
              <PartnerButton type="button" variant="weak" tone="neutral" className="flex-1" onClick={() => setShowAdd(false)}>
                취소
              </PartnerButton>
              <PartnerButton type="button" className="flex-1" onClick={handleAdd} disabled={creating}>
                {creating ? '추가 중…' : '추가'}
              </PartnerButton>
            </>
          }
        >
          <div className="space-y-3">
            <PartnerField label="캠페인명">
              <PartnerInput
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </PartnerField>
            <PartnerField label="유형">
              <PartnerSelect
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Ad['type'] }))}
              >
                <option value="cpv">CPV (조회당 과금)</option>
                <option value="banner">배너 광고</option>
                <option value="featured">추천 노출</option>
              </PartnerSelect>
            </PartnerField>
            <PartnerField label="대상 이벤트 (선택)">
              <PartnerSelect
                value={form.eventId}
                onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value }))}
              >
                <option value="">선택 안함</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </PartnerSelect>
            </PartnerField>
            <PartnerField label="예산 (원)">
              <PartnerInput
                type="number"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              />
            </PartnerField>
            <div className="grid grid-cols-2 gap-2">
              <PartnerField label="시작일">
                <PartnerInput
                  type="date"
                  value={form.startAt}
                  onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                />
              </PartnerField>
              <PartnerField label="종료일">
                <PartnerInput
                  type="date"
                  value={form.endAt}
                  onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                />
              </PartnerField>
            </div>
          </div>
        </PartnerModal>
      )}
    </div>
  );
}
