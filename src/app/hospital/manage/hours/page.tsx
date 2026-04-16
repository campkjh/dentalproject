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

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <TopBar title="운영일 및 시간" />

      <div className="flex-1 px-2.5 py-4 space-y-6">
        {/* Holiday notice */}
        <div>
          <label className="text-sm font-bold text-gray-900 block mb-2">
            기타 휴진일 안내
          </label>
          <textarea
            value={holidayNotice}
            onChange={(e) => setHolidayNotice(e.target.value)}
            placeholder="예) 공휴일 휴진, 설/추석 연휴 휴진"
            className="w-full h-20 p-3 bg-gray-50 rounded-xl text-sm border border-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
          />
        </div>

        {/* Schedule table */}
        <div>
          <div className="grid grid-cols-[48px_1fr_1fr_48px] gap-2 mb-2">
            <div className="text-xs text-gray-500 font-medium text-center">일</div>
            <div className="text-xs text-gray-500 font-medium text-center">시작시간</div>
            <div className="text-xs text-gray-500 font-medium text-center">마감시간</div>
            <div className="text-xs text-gray-500 font-medium text-center">휴진</div>
          </div>

          <div className="space-y-2">
            {schedule.map((s, idx) => (
              <div
                key={s.day}
                className="grid grid-cols-[48px_1fr_1fr_48px] gap-2 items-center"
              >
                <div className="text-sm font-medium text-center text-gray-700">
                  {s.day}
                </div>

                {/* Start time */}
                <div className="relative">
                  {s.isClosed ? (
                    <div className="py-2.5 text-center text-sm text-gray-300 bg-gray-50 rounded-lg">
                      -
                    </div>
                  ) : editingCell?.dayIndex === idx &&
                    editingCell?.field === 'startTime' ? (
                    <select
                      value={s.startTime}
                      onChange={(e) =>
                        handleTimeChange(idx, 'startTime', e.target.value)
                      }
                      onBlur={() => setEditingCell(null)}
                      autoFocus
                      className="w-full py-2 text-center text-sm bg-white border border-[#7C3AED] rounded-lg focus:outline-none appearance-none"
                    >
                      {timeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() =>
                        setEditingCell({ dayIndex: idx, field: 'startTime' })
                      }
                      className="w-full py-2.5 text-center text-sm bg-gray-50 rounded-lg border border-gray-200 hover:border-[#7C3AED] transition-colors"
                    >
                      {s.startTime}
                    </button>
                  )}
                </div>

                {/* End time */}
                <div className="relative">
                  {s.isClosed ? (
                    <div className="py-2.5 text-center text-sm text-gray-300 bg-gray-50 rounded-lg">
                      -
                    </div>
                  ) : editingCell?.dayIndex === idx &&
                    editingCell?.field === 'endTime' ? (
                    <select
                      value={s.endTime}
                      onChange={(e) =>
                        handleTimeChange(idx, 'endTime', e.target.value)
                      }
                      onBlur={() => setEditingCell(null)}
                      autoFocus
                      className="w-full py-2 text-center text-sm bg-white border border-[#7C3AED] rounded-lg focus:outline-none appearance-none"
                    >
                      {timeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() =>
                        setEditingCell({ dayIndex: idx, field: 'endTime' })
                      }
                      className="w-full py-2.5 text-center text-sm bg-gray-50 rounded-lg border border-gray-200 hover:border-[#7C3AED] transition-colors"
                    >
                      {s.endTime}
                    </button>
                  )}
                </div>

                {/* Closed toggle */}
                <div className="flex justify-center">
                  <button
                    onClick={() => toggleClosed(idx)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      s.isClosed ? 'bg-[#7C3AED]' : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                        s.isClosed ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="sticky bottom-0 bg-white px-2.5 py-4 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className={`w-full py-3.5 rounded-xl text-base font-bold transition-colors ${
            saving || loading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-[#7C3AED] text-white'
          }`}
        >
          {saving ? '저장 중…' : loading ? '불러오는 중…' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
