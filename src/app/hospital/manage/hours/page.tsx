'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';

interface DaySchedule {
  day: string;
  startTime: string;
  endTime: string;
  isClosed: boolean;
}

const DEFAULT_SCHEDULE: DaySchedule[] = ['월', '화', '수', '목', '금', '토', '일'].map((day) => ({
  day,
  startTime: '10:00',
  endTime: '19:00',
  isClosed: day === '일',
}));

export default function HoursEditPage() {
  const router = useRouter();
  const { showToast } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [holidayNotice, setHolidayNotice] = useState('');
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my-hospital', { cache: 'no-store' });
        if (!res.ok) return;
        const { hospital } = await res.json();
        if (cancelled) return;
        if (!hospital) {
          showToast('등록된 병원이 없습니다.');
          router.push('/hospital/register');
          return;
        }
        setHolidayNotice(hospital.holiday_notice ?? '');
        const oh = hospital.operating_hours ?? [];
        if (oh.length) {
          const ordered = ['월', '화', '수', '목', '금', '토', '일']
            .map((d): DaySchedule => {
              const found = oh.find((o: { day: string }) => o.day === d);
              return found
                ? {
                    day: d,
                    startTime: found.start_time ?? '10:00',
                    endTime: found.end_time ?? '19:00',
                    isClosed: !!found.is_closed,
                  }
                : { day: d, startTime: '10:00', endTime: '19:00', isClosed: d === '일' };
            });
          setSchedule(ordered);
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, showToast]);

  const [editingCell, setEditingCell] = useState<{
    dayIndex: number;
    field: 'startTime' | 'endTime';
  } | null>(null);

  const timeOptions: string[] = [];
  for (let h = 0; h < 24; h++) {
    timeOptions.push(`${String(h).padStart(2, '0')}:00`);
    timeOptions.push(`${String(h).padStart(2, '0')}:30`);
  }

  const handleTimeChange = (
    dayIndex: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setSchedule((prev) =>
      prev.map((s, i) => (i === dayIndex ? { ...s, [field]: value } : s))
    );
    setEditingCell(null);
  };

  const toggleClosed = (dayIndex: number) => {
    setSchedule((prev) =>
      prev.map((s, i) =>
        i === dayIndex ? { ...s, isClosed: !s.isClosed } : s
      )
    );
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const [hoursRes, infoRes] = await Promise.all([
        fetch('/api/my-hospital/hours', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hours: schedule.map((s) => ({
              day: s.day,
              start_time: s.startTime,
              end_time: s.endTime,
              is_closed: s.isClosed,
            })),
          }),
        }),
        fetch('/api/my-hospital', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ holidayNotice }),
        }),
      ]);
      if (!hoursRes.ok || !infoRes.ok) {
        showToast('저장에 실패했습니다.');
      } else {
        showToast('운영시간이 저장되었습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  const cell = 'flex h-12 w-full items-center justify-center rounded-[12px] text-[16px] tabular-nums';

  const timeCell = (s: DaySchedule, idx: number, field: 'startTime' | 'endTime') =>
    s.isClosed ? (
      <div className={`${cell} bg-[#F9FAFB] text-[#D1D6DB]`}>-</div>
    ) : editingCell?.dayIndex === idx && editingCell?.field === field ? (
      <select
        value={s[field]}
        onChange={(e) => handleTimeChange(idx, field, e.target.value)}
        onBlur={() => setEditingCell(null)}
        autoFocus
        className={`${cell} appearance-none bg-[#EFF5FE] text-center font-semibold text-[#2F6FE4] outline-none`}
      >
        {timeOptions.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    ) : (
      <button
        type="button"
        onClick={() => setEditingCell({ dayIndex: idx, field })}
        className={`${cell} bg-[#F2F4F6] text-[#333D4B] transition-colors active:bg-[#E5E8EB]`}
      >
        {s[field]}
      </button>
    );

  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 96px), 104px)' }}>
      <TopBar title="운영일 및 시간" />

      <div className="flex-1 px-5 pb-6 pt-2">
        {/* 기타 휴진일 안내 */}
        <label className="mb-2 block text-[15px] font-semibold text-[#4E5968]">기타 휴진일 안내</label>
        <textarea
          value={holidayNotice}
          onChange={(e) => setHolidayNotice(e.target.value)}
          placeholder="예) 공휴일 휴진, 설/추석 연휴 휴진"
          className="block h-[96px] w-full resize-none rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[16px] leading-[1.5] text-[#191F28] outline-none transition-colors placeholder:text-[#B0B8C1] focus:bg-[#EDEFF2]"
        />

        {/* 요일별 시간 */}
        <div className="mt-7">
          <div className="mb-1.5 grid grid-cols-[36px_1fr_1fr_52px] items-center gap-2 text-[14px] text-[#8B95A1]">
            <span className="text-center">요일</span>
            <span className="text-center">시작</span>
            <span className="text-center">마감</span>
            <span className="text-center">휴진</span>
          </div>

          <div className="space-y-2">
            {schedule.map((s, idx) => (
              <div key={s.day} className="grid grid-cols-[36px_1fr_1fr_52px] items-center gap-2">
                <div className={`text-center text-[16px] font-semibold ${s.day === '토' || s.day === '일' ? 'text-[#8B95A1]' : 'text-[#333D4B]'}`}>{s.day}</div>
                <div className="relative">{timeCell(s, idx, 'startTime')}</div>
                <div className="relative">{timeCell(s, idx, 'endTime')}</div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={s.isClosed}
                    aria-label={`${s.day}요일 휴진`}
                    onClick={() => toggleClosed(idx)}
                    className={`relative h-[30px] w-[50px] rounded-full transition-colors duration-300 ${s.isClosed ? 'bg-[#2F6FE4]' : 'bg-[#E5E8EB]'}`}
                  >
                    <span
                      className="absolute top-[3px] h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-all duration-300"
                      style={{ left: s.isClosed ? 23 : 3, transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 바닥 저장 버튼 — 위 선 대신 흰 그라데이션 */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-white px-4 pt-2" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 16px)' }}>
        <div className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-gradient-to-b from-white/0 to-white" />
        <div className="mx-auto max-w-[608px]">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className={`flex h-14 w-full items-center justify-center rounded-[18px] text-[17px] font-bold transition-all active:scale-[0.98] ${
              saving || loading ? 'cursor-not-allowed bg-[#F2F4F6] text-[#B0B8C1]' : 'bg-[#4A82EE] text-white'
            }`}
          >
            {saving ? '저장 중…' : loading ? '불러오는 중…' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
