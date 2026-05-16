'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import {
  PartnerBottomCTA,
  PartnerButton,
  PartnerField,
  PartnerInput,
  PartnerTextarea,
  PartnerTop,
} from '@/components/partner/tds';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;

type OperatingHour = {
  day: (typeof DAYS)[number];
  start: string;
  end: string;
  closed: boolean;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const COMMON_TAGS = [
  '치아교정', '라미네이트', '미백제도포', '임플란트', '충치치료', '스케일링',
  '눈성형', '코성형', '안면윤곽', '가슴성형', '지방흡입', '리프팅', '보톡스', '필러',
];

export default function PartnerHospitalInfoPage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hospital, setHospital] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [holidayNotice, setHolidayNotice] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [hours, setHours] = useState<OperatingHour[]>(
    DAYS.map((day) => ({ day, start: '10:00', end: '19:00', closed: day === '일' }))
  );

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my-hospital', { cache: 'no-store' });
        if (!res.ok) return;
        const { hospital: h } = await res.json();
        if (cancelled) return;
        if (!h) return;
        setHospital(h);
        setName(h.name ?? '');
        setPhone(h.phone ?? '');
        setAddress(h.address ?? '');
        setAddressDetail(h.address_detail ?? '');
        setIntroduction(h.introduction ?? '');
        setHolidayNotice(h.holiday_notice ?? '');
        setTags(h.tags ?? []);
        const oh = h.operating_hours ?? [];
        if (oh.length) {
          setHours(
            DAYS.map((d): OperatingHour => {
              const found = oh.find((o: any) => o.day === d);
              return found
                ? { day: d, start: found.start_time ?? '10:00', end: found.end_time ?? '19:00', closed: !!found.is_closed }
                : { day: d, start: '10:00', end: '19:00', closed: d === '일' };
            })
          );
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const toggleTag = (t: string) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const updateHour = (idx: number, patch: Partial<OperatingHour>) => {
    setHours((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const [infoRes, hoursRes] = await Promise.all([
        fetch('/api/my-hospital', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            phone,
            address,
            addressDetail,
            introduction,
            holidayNotice,
            tags,
          }),
        }),
        fetch('/api/my-hospital/hours', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hours: hours.map((h) => ({
              day: h.day,
              start_time: h.start,
              end_time: h.end,
              is_closed: h.closed,
            })),
          }),
        }),
      ]);
      if (!infoRes.ok || !hoursRes.ok) {
        showToast('저장에 실패했습니다.');
      } else {
        showToast('병원 정보가 저장되었습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!authUser) {
    return (
      <div className="bg-white rounded-[16px] p-10 text-center">
        <p className="text-[15px] text-[rgba(0,19,43,0.58)] mb-4">로그인이 필요합니다.</p>
        <Link href="/login" className="tds-button-primary inline-flex min-w-[120px]">
          로그인
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-20 text-sm text-gray-400">불러오는 중…</div>;
  }

  if (!hospital) {
    return (
      <div className="bg-white rounded-[16px] p-10 text-center">
        <p className="text-[15px] text-[rgba(0,19,43,0.58)] mb-2">등록된 병원이 없습니다.</p>
        <Link href="/hospital/register" className="tds-button-primary inline-flex min-w-[160px] mt-2">
          병원 등록하기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PartnerTop
        eyebrow="파트너 관리"
        title="병원 정보"
        description="환자에게 노출되는 병원 정보를 관리합니다."
        icon={<Building2 size={28} />}
      />

      <div className="space-y-4">
      <PartnerField label="병원명">
        <PartnerInput
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </PartnerField>

      <PartnerField label="연락처">
        <PartnerInput
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="02-1234-5678"
        />
      </PartnerField>

      <PartnerField label="주소">
        <div className="space-y-2">
          <PartnerInput
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="기본 주소"
          />
          <PartnerInput
            value={addressDetail}
            onChange={(e) => setAddressDetail(e.target.value)}
            placeholder="상세 주소 (선택)"
          />
        </div>
      </PartnerField>

      <PartnerField label="병원 소개">
        <PartnerTextarea
          value={introduction}
          onChange={(e) => setIntroduction(e.target.value)}
          rows={5}
          placeholder="환자에게 보여줄 병원 소개를 작성해 주세요"
        />
      </PartnerField>

      <PartnerField label="진료 키워드 (태그)" help="환자가 병원을 찾을 때 사용하는 주요 키워드입니다.">
        <div className="flex flex-wrap gap-2">
          {COMMON_TAGS.map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className="px-3.5 py-2 rounded-full text-[13px] font-semibold border transition-transform active:scale-[0.97]"
                style={{
                  backgroundColor: on ? '#3182F6' : 'rgba(7,25,76,0.05)',
                  color: on ? '#fff' : 'rgba(3,18,40,0.7)',
                  borderColor: on ? '#3182F6' : 'rgba(0,27,55,0.1)',
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </PartnerField>

      <PartnerField label="운영 시간">
        <div className="space-y-2">
          {hours.map((h, i) => (
            <div key={h.day} className="grid grid-cols-[34px_1fr_1fr_64px] gap-2 items-center">
              <span className="text-[15px] font-semibold text-[rgba(0,12,30,0.8)] text-center">{h.day}</span>
              <PartnerInput
                type="time"
                value={h.start}
                onChange={(e) => updateHour(i, { start: e.target.value })}
                disabled={h.closed}
                className="min-h-[44px] px-2 text-[15px] disabled:text-gray-300"
              />
              <PartnerInput
                type="time"
                value={h.end}
                onChange={(e) => updateHour(i, { end: e.target.value })}
                disabled={h.closed}
                className="min-h-[44px] px-2 text-[15px] disabled:text-gray-300"
              />
              <label className="flex items-center justify-center gap-1 text-[12px] text-[rgba(3,18,40,0.7)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={h.closed}
                  onChange={(e) => updateHour(i, { closed: e.target.checked })}
                  className="w-3.5 h-3.5"
                />
                휴진
              </label>
            </div>
          ))}
        </div>
      </PartnerField>

      <PartnerField label="휴진 안내">
        <PartnerInput
          value={holidayNotice}
          onChange={(e) => setHolidayNotice(e.target.value)}
          placeholder="예) 공휴일 휴진, 설/추석 연휴 휴진"
        />
      </PartnerField>

      <PartnerBottomCTA className="-mx-5">
        <PartnerButton
          type="button"
          onClick={save}
          disabled={saving}
          size="xl"
          className="w-full"
        >
          {saving ? '저장 중…' : '저장하기'}
        </PartnerButton>
      </PartnerBottomCTA>
      </div>
    </div>
  );
}
