'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import CommunityModal from '@/components/community/CommunityModal';
import MonoIcon from '@/components/common/MonoIcon';
import { useMyHospitalData } from '@/lib/partner/my-hospital-cache';
import {
  RESERVATION_STATUS_LABEL as STATUS_LABEL,
  customerHref,
  monthDayOf,
  reservationStatusTone as statusTone,
  timeOf,
  wonOf,
  type CustomerRow,
} from '@/lib/partner/customers';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useReservationRealtimeRefresh } from '@/lib/realtime/reservations';
import { useStore } from '@/store';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ReservationRow = {
  id: string;
  doctor_id?: string | null;
  visit_at: string | null;
  reservation_at?: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer_name?: string | null;
  customer_phone?: string | null;
  payment_type?: string | null;
  payment_method?: string | null;
  memo?: string | null;
  user?: { name?: string | null; phone?: string | null } | null;
  product?: { title?: string | null } | null;
  doctor?: { name?: string | null } | null;
};

type DoctorRow = {
  id: string;
  name: string;
  title?: string | null;
};

type HospitalData = {
  id: string;
  doctors?: DoctorRow[] | null;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getMonthCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const prevLast = new Date(year, month, 0).getDate();
  const currentLast = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date; muted: boolean }> = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevLast - i), muted: true });
  }
  for (let d = 1; d <= currentLast; d++) {
    cells.push({ date: new Date(year, month, d), muted: false });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 35) {
    cells.push({ date: new Date(year, month + 1, nextDay++), muted: true });
  }
  return cells;
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** 그 날이 든 주의 일요일 */
function weekStartOf(date: Date) {
  return addDays(date, -date.getDay());
}

/**
 * 달력 — 프리티풀 어드민 주력처럼 처음엔 이번 주 한 줄만, 아래 ⌄ 로 이번 달 전체를 펼치고 접는다(261101).
 *  · 접힘 = 고른 날이 든 주 한 줄. ‹ › 는 한 주씩. 펼침 = 한 달. ‹ › 는 한 달씩(지난달 예약도 본다).
 *  · 펼치고 접을 땐 다른 주 줄만 높이가 0 ↔ 제 높이로 부드럽게(지금 주 줄은 제자리에 그대로).
 *  · 회색 요일 줄 · 고른 날 파랑 칸 · 예약 있는 날 아래 점 · 쉬는 날 회색 취소선.
 */
function MonthCalendar({
  selected,
  onSelect,
  hasDot,
  isOff,
}: {
  selected: string;
  onSelect: (date: Date) => void;
  hasDot: (key: string) => boolean;
  isOff?: (key: string) => boolean;
}) {
  const today = new Date();
  const [expanded, setExpanded] = useState(false);
  // 보고 있는 자리 — 접힘이면 이 날이 든 주, 펼침이면 이 날이 든 달
  const [cursor, setCursor] = useState(() => dateFromKey(selected));
  const [dir, setDir] = useState<1 | -1>(1);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => getMonthCells(year, month), [year, month]);
  const rows = useMemo(() => Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7)), [cells]);
  const cursorKey = dateKey(cursor);
  const currentRow = Math.max(0, rows.findIndex((row) => row.some(({ date }) => dateKey(date) === cursorKey)));

  const viewingToday = expanded
    ? year === today.getFullYear() && month === today.getMonth()
    : dateKey(weekStartOf(cursor)) === dateKey(weekStartOf(today));

  const go = (step: 1 | -1) => {
    setDir(step);
    setCursor((c) => (expanded ? new Date(c.getFullYear(), c.getMonth() + step, 1) : addDays(c, step * 7)));
  };

  const toggle = () => {
    if (expanded) {
      // 접을 때 — 고른 날이 이 달에 있으면 그 주를, 아니면 보던 자리(달 첫 주)를 남긴다
      const picked = dateFromKey(selected);
      if (picked.getFullYear() === year && picked.getMonth() === month) setCursor(picked);
    }
    setExpanded((v) => !v);
  };

  const goToday = () => {
    setDir(today < cursor ? -1 : 1);
    setCursor(today);
    onSelect(today);
  };

  return (
    <section className="px-5 pb-1 pt-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={goToday}
          className="-ml-1 inline-flex h-9 items-center gap-0.5 rounded-[10px] px-1 text-[20px] font-bold tracking-[-0.4px] text-[#191F28] transition-opacity active:opacity-60"
          aria-label="오늘로 돌아가기"
        >
          {year !== today.getFullYear() ? `${year}년 ` : ''}{month + 1}월
        </button>
        {!viewingToday && (
          <button
            type="button"
            onClick={goToday}
            className="qd-a-item ml-1 inline-flex h-7 items-center rounded-[8px] bg-[#F2F4F6] px-2.5 text-[13.5px] font-semibold text-[#4E5968] transition-all active:scale-[0.96]"
          >
            오늘
          </button>
        )}
        <div className="ml-auto flex items-center">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={expanded ? '지난달' : '지난주'}
            className="flex h-10 w-10 items-center justify-center rounded-[12px] text-[#4E5968] transition-all active:scale-90 active:bg-[#F2F4F6]"
          >
            <ChevronLeft size={22} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={expanded ? '다음 달' : '다음 주'}
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-[12px] text-[#4E5968] transition-all active:scale-90 active:bg-[#F2F4F6]"
          >
            <ChevronRight size={22} strokeWidth={2.2} />
          </button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="text-[13px] font-medium text-[#8B95A1]">{day}</span>
        ))}
      </div>
      {/* 달이 바뀌면 판을 새로 그리며 넘긴 쪽에서 살짝 밀려 들어온다 */}
      <div key={`${year}-${month}`} className={`mt-2 ${dir > 0 ? 'cal-swap-next' : 'cal-swap-prev'}`}>
        {rows.map((row, r) => {
          const show = expanded || r === currentRow;
          return (
            <div
              key={dateKey(row[0].date)}
              aria-hidden={!show}
              inert={!show}
              className="grid transition-[grid-template-rows,opacity] duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)]"
              style={{ gridTemplateRows: show ? '1fr' : '0fr', opacity: show ? 1 : 0 }}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="grid grid-cols-7 pb-1">
                  {row.map(({ date, muted }) => {
                    const key = dateKey(date);
                    const active = key === selected;
                    const off = isOff?.(key) ?? false;
                    const dot = hasDot(key);
                    // 접힌 한 주에선 앞뒤 달 날짜도 진짜 이번 주라 흐리게 하지 않는다
                    const dim = muted && expanded;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setCursor(date);
                          onSelect(date);
                        }}
                        className="flex h-12 flex-col items-center justify-center transition-transform active:scale-[0.93]"
                      >
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-[12px] text-[16px] tabular-nums transition-colors ${
                            active
                              ? 'bg-[#2F6FE4] font-bold text-white'
                              : off
                                ? 'bg-[#F2F4F6] text-[#B0B8C1] line-through'
                                : dim
                                  ? 'text-[#D1D6DB]'
                                  : 'font-medium text-[#333D4B]'
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        <span className={`mt-0.5 h-1 w-1 rounded-full ${dot ? (active ? 'bg-[#2F6FE4]' : 'bg-[#3180F7]') : 'bg-transparent'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* 펼치기·접기 — 아래 화살표(펼치면 위로 돈다) */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-label={expanded ? '이번 주만 보기' : '한 달 달력 보기'}
        className="mt-0.5 flex h-10 w-full items-center justify-center rounded-[12px] text-[#8B95A1] transition-colors active:bg-[#F9FAFB]"
      >
        <ChevronDown size={24} strokeWidth={2} className={`transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${expanded ? 'rotate-180' : ''}`} />
      </button>
    </section>
  );
}

type ReservationTabKey = 'reservations' | 'customers' | 'settings';

/** 병원예약 · 고객관리 · 예약설정 — 회색 트랙 위 흰 알약이 미끄러진다 */
function ReservationTabs({ active, onChange }: { active: ReservationTabKey; onChange: (tab: ReservationTabKey) => void }) {
  const tabs = [
    { key: 'reservations', label: '병원예약' },
    { key: 'customers', label: '고객관리' },
    { key: 'settings', label: '예약설정' },
  ] as const;
  const idx = Math.max(0, tabs.findIndex((t) => t.key === active));
  return (
    <nav className="relative flex w-[246px] max-w-[calc(100vw-112px)] shrink-0 rounded-[12px] bg-[#F2F4F6] p-1" aria-label="예약관리 탭">
      <span
        aria-hidden
        className="absolute bottom-1 top-1 rounded-[10px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-transform duration-300"
        style={{ left: 4, width: `calc((100% - 8px) / ${tabs.length})`, transform: `translateX(${idx * 100}%)`, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      />
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          aria-current={active === t.key ? 'page' : undefined}
          className={`relative z-[1] flex h-9 min-w-0 flex-1 items-center justify-center whitespace-nowrap text-[14.5px] transition-colors ${active === t.key ? 'font-bold text-[#191F28]' : 'font-semibold text-[#8B95A1]'}`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

function ReservationScheduleCard({
  row,
  index,
  onAssignRequest,
  onDetailRequest,
  onMemoRequest,
}: {
  row: ReservationRow;
  index: number;
  onAssignRequest: (row: ReservationRow) => void;
  onDetailRequest: (id: string) => void;
  onMemoRequest: (row: ReservationRow) => void;
}) {
  const name = row.user?.name ?? row.customer_name ?? '환자';
  const phone = row.user?.phone ?? row.customer_phone ?? '';
  const doctor = row.doctor?.name ? `${row.doctor.name} 원장` : '미지정';
  const assigned = doctor !== '미지정';
  const isPaid = row.payment_type === 'app' || row.payment_method === 'app' || row.payment_method === '앱결제';

  return (
    <article className="qd-a-item py-3" style={{ animationDelay: `${Math.min(index, 6) * 0.04}s` }}>
      <button
        type="button"
        onClick={() => onDetailRequest(row.id)}
        className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-[16px] px-2 py-2 text-left transition-colors active:bg-[#F9FAFB]"
      >
        <span className="w-[58px] shrink-0 text-[20px] font-bold tabular-nums tracking-[-0.4px] text-[#191F28]">{timeOf(row.visit_at)}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[17px] font-bold text-[#191F28]">{name}</span>
            <span className={`inline-flex h-6 shrink-0 items-center rounded-[6px] px-2 text-[13.5px] font-semibold ${statusTone(row.status)}`}>{STATUS_LABEL[row.status]}</span>
          </span>
          <span className="mt-0.5 block truncate text-[14px] text-[#8B95A1]">
            {row.product?.title ?? '상품 정보 없음'}
            {phone ? ` · ${phone}` : ''}
          </span>
        </span>
        <ChevronRight size={20} className="shrink-0 text-[#B0B8C1]" />
      </button>

      <div className="mt-2 rounded-[14px] bg-[#F2F4F6] px-4 py-1.5">
        <div className="flex min-h-11 items-center gap-2">
          <span className="w-[52px] shrink-0 text-[15px] text-[#8B95A1]">결제</span>
          <span className="flex min-w-0 flex-1 flex-wrap gap-1">
            {isPaid && <span className="inline-flex h-6 items-center rounded-[6px] bg-[#2F6FE4] px-2 text-[13px] font-bold text-white">앱결제</span>}
            <span className="inline-flex h-6 items-center rounded-[6px] bg-white px-2 text-[13px] font-semibold text-[#6B7684]">앱예약</span>
          </span>
        </div>
        <div className="flex min-h-11 items-center gap-2">
          <span className="w-[52px] shrink-0 text-[15px] text-[#8B95A1]">담당</span>
          <span className={`min-w-0 flex-1 truncate text-[15px] ${assigned ? 'font-semibold text-[#333D4B]' : 'text-[#B0B8C1]'}`}>{doctor}</span>
          <button
            type="button"
            onClick={() => onAssignRequest(row)}
            className="h-8 shrink-0 rounded-[10px] bg-white px-3 text-[14px] font-semibold text-[#3180F7] transition-all active:scale-[0.96] active:bg-[#EFF5FE]"
          >
            {assigned ? '변경' : '지정'}
          </button>
        </div>
        <button
          type="button"
          onClick={() => onMemoRequest(row)}
          className="flex min-h-11 w-full items-start gap-2 py-2.5 text-left transition-opacity active:opacity-60"
        >
          <span className="w-[52px] shrink-0 text-[15px] leading-[1.5] text-[#8B95A1]">메모</span>
          <span className={`min-w-0 flex-1 whitespace-pre-line break-keep text-[15px] leading-[1.5] ${row.memo ? 'text-[#333D4B]' : 'text-[#B0B8C1]'}`}>
            {row.memo || '메모를 남겨 보세요'}
          </span>
          <MonoIcon name="pencil" size={16} color="#B0B8C1" className="mt-[3px]" />
        </button>
      </div>
    </article>
  );
}

const SETTING_TIME_SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'] as const;

type ScheduleSettings = {
  disabledDays: string[];
  disabledSlots: Record<string, string[]>;
};

type ScheduleAction =
  | { kind: 'day'; date: string; disabled: boolean }
  | { kind: 'time'; date: string; time: string; disabled: boolean };

function sameDateKey(left: Date, right: Date) {
  return dateKey(left) === dateKey(right);
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function timeHourLabel(time: string) {
  return `${Number(time.slice(0, 2))}시`;
}

function memoTimestamp() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function appendReservationMemo(current: string | null | undefined, line: string) {
  const trimmed = current?.trim();
  const nextLine = `[${memoTimestamp()}] ${line}`;
  return trimmed ? `${trimmed}\n${nextLine}` : nextLine;
}

function applyScheduleAction(settings: ScheduleSettings, action: ScheduleAction): ScheduleSettings {
  if (action.kind === 'day') {
    const days = new Set(settings.disabledDays);
    if (action.disabled) days.add(action.date);
    else days.delete(action.date);
    return { ...settings, disabledDays: Array.from(days).sort() };
  }

  const slots = new Set(settings.disabledSlots[action.date] ?? []);
  if (action.disabled) slots.add(action.time);
  else slots.delete(action.time);
  const disabledSlots = { ...settings.disabledSlots };
  if (slots.size > 0) disabledSlots[action.date] = Array.from(slots).sort();
  else delete disabledSlots[action.date];
  return { ...settings, disabledSlots };
}

function ScheduleSettingsView({
  hospitalId,
  reservations,
  onTabChange,
}: {
  hospitalId: string | null;
  reservations: ReservationRow[];
  onTabChange: (tab: ReservationTabKey) => void;
}) {
  const showToast = useStore((s) => s.showToast);
  const showConfirm = useStore((s) => s.showConfirm);
  const today = new Date();
  const [selected, setSelected] = useState(dateKey(today));
  const [settings, setSettings] = useState<ScheduleSettings>({ disabledDays: [], disabledSlots: {} });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingAction, setSavingAction] = useState(false);

  useEffect(() => {
    if (!hospitalId) {
      setLoadingSettings(false);
      return;
    }

    let cancelled = false;
    setLoadingSettings(true);
    fetch('/api/my-hospital/schedule-settings', { cache: 'no-store' })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || '예약설정을 불러오지 못했습니다.');
        return payload as ScheduleSettings;
      })
      .then((payload) => {
        if (cancelled) return;
        setSettings({
          disabledDays: Array.isArray(payload.disabledDays) ? payload.disabledDays : [],
          disabledSlots: payload.disabledSlots ?? {},
        });
      })
      .catch((error) => {
        if (!cancelled) showToast(error instanceof Error ? error.message : '예약설정을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoadingSettings(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hospitalId, showToast]);

  const selectedDate = dateFromKey(selected);
  const selectedIsToday = sameDateKey(selectedDate, today);
  const selectedTitle = `${selectedIsToday ? '오늘 ' : ''}${selectedDate.getMonth() + 1}월${selectedDate.getDate()}일`;
  const disabledDaySet = useMemo(() => new Set(settings.disabledDays), [settings.disabledDays]);
  const selectedSlotSet = useMemo(() => new Set(settings.disabledSlots[selected] ?? []), [settings.disabledSlots, selected]);
  const selectedDayDisabled = disabledDaySet.has(selected);

  const reservationDates = useMemo(() => {
    const keys = new Set<string>();
    reservations.forEach((row) => {
      if (!row.visit_at || row.status === 'cancelled' || row.status === 'completed') return;
      keys.add(dateKey(new Date(row.visit_at)));
    });
    return keys;
  }, [reservations]);

  const saveScheduleAction = async (action: ScheduleAction) => {
    if (!hospitalId || savingAction) return;
    const previous = settings;
    setSavingAction(true);
    setSettings((current) => applyScheduleAction(current, action));
    try {
      const res = await fetch('/api/my-hospital/schedule-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: action.date,
          time: action.kind === 'time' ? action.time : undefined,
          disabled: action.disabled,
          allDay: action.kind === 'day',
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || '저장에 실패했습니다.');
      setSettings({
        disabledDays: Array.isArray(payload.disabledDays) ? payload.disabledDays : [],
        disabledSlots: payload.disabledSlots ?? {},
      });
      const target = action.kind === 'day' ? '진료일' : '진료시간';
      showToast(`${target}을 ${action.disabled ? '비활성화' : '활성화'}했어요.`);
    } catch (error) {
      setSettings(previous);
      showToast(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setSavingAction(false);
    }
  };

  const promptScheduleAction = (action: ScheduleAction) => {
    if (savingAction) return;
    const title = action.kind === 'day'
      ? action.disabled ? '정말로 비활성화 하시겠습니까?' : '정말로 활성화 하시겠습니까?'
      : `${timeHourLabel(action.time)} 진료를 ${action.disabled ? '비활성화' : '활성화'} 하시겠습니까?`;
    const message = action.kind === 'day'
      ? action.disabled ? '해당일의 모든시간의 스케줄이 비활성화 됩니다.' : '해당일의 스케줄을 다시 예약 가능 상태로 변경합니다.'
      : action.disabled ? '해당 시간에 환자가 있는지 확인해주세요.' : '해당 시간의 예약 접수를 다시 활성화합니다.';
    showConfirm(title, message, () => {
      void saveScheduleAction(action);
    });
  };

  return (
    <div className="partner-mobile-screen has-fixed-title page-enter">
      <header className="partner-screen-title with-action">
        <h1>예약관리</h1>
        <ReservationTabs active="settings" onChange={(tab) => { if (tab !== 'settings') onTabChange(tab); }} />
      </header>

      <MonthCalendar
        selected={selected}
        onSelect={(date) => setSelected(dateKey(date))}
        hasDot={(key) => reservationDates.has(key)}
        isOff={(key) => disabledDaySet.has(key)}
      />

      <div className="h-2.5 bg-[#F2F4F6]" />

      <section className="px-5 pb-10 pt-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[20px]! font-bold leading-tight! tracking-[-0.4px] text-[#191F28]">{selectedTitle}</h2>
          <button
            type="button"
            onClick={() => promptScheduleAction({ kind: 'day', date: selected, disabled: !selectedDayDisabled })}
            disabled={loadingSettings || savingAction}
            className={`h-9 shrink-0 rounded-[10px] px-3 text-[14.5px] font-semibold transition-all active:scale-[0.97] disabled:opacity-40 ${
              selectedDayDisabled ? 'bg-[#EFF5FE] text-[#2F6FE4]' : 'bg-[#F2F4F6] text-[#F04452]'
            }`}
          >
            {selectedDayDisabled ? '진료일 활성화' : '진료일 비활성화'}
          </button>
        </div>

        <p className="mt-4 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
          <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
          {selectedDayDisabled ? '이 날은 진료를 쉬어요. 다시 열면 예약을 받을 수 있어요.' : '시간을 누르면 그 시간만 예약을 닫거나 다시 열 수 있어요.'}
        </p>

        <div className="mt-4 grid grid-cols-4 gap-2" aria-label={`${selectedTitle} 예약 시간 설정`}>
          {SETTING_TIME_SLOTS.map((time) => {
            const disabled = selectedDayDisabled || selectedSlotSet.has(time);
            return (
              <button
                key={time}
                type="button"
                disabled={loadingSettings || savingAction || selectedDayDisabled}
                onClick={() => promptScheduleAction({ kind: 'time', date: selected, time, disabled: !selectedSlotSet.has(time) })}
                className={`flex h-12 items-center justify-center rounded-[14px] text-[15.5px] font-semibold tabular-nums transition-all active:scale-[0.96] ${
                  disabled ? 'bg-[#F9FAFB] text-[#B0B8C1] line-through' : 'bg-[#EFF5FE] text-[#2F6FE4]'
                }`}
              >
                {time}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

type CustomerSort = 'recent' | 'visits' | 'paid';

const CUSTOMER_SORTS: Array<{ key: CustomerSort; label: string }> = [
  { key: 'recent', label: '최근 방문순' },
  { key: 'visits', label: '방문 많은순' },
  { key: 'paid', label: '결제 많은순' },
];

function msOf(value?: string | null) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** 고객관리 — 이 병원 예약을 고객별로 묶어 방문·결제를 한눈에 */
function CustomersView({ hospitalId, onTabChange, reloadKey }: { hospitalId: string | null; onTabChange: (tab: ReservationTabKey) => void; reloadKey: number }) {
  const showToast = useStore((s) => s.showToast);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const loading = Boolean(hospitalId) && !loaded;
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CustomerSort>('recent');
  // 실시간 갱신은 부모(예약관리)의 구독 하나만 쓴다 — 같은 채널을 두 번 열면 supabase 가 'subscribe() 뒤 callback 추가' 오류를 던져 화면이 죽었다(261101)
  const reloadTick = reloadKey;

  useEffect(() => {
    if (!hospitalId) return;
    let cancelled = false;
    fetch('/api/my-hospital/customers', { cache: 'no-store' })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || '고객 목록을 불러오지 못했습니다.');
        return Array.isArray(payload.customers) ? (payload.customers as CustomerRow[]) : [];
      })
      .then((rows) => {
        if (!cancelled) setCustomers(rows);
      })
      .catch((error) => {
        if (!cancelled) showToast(error instanceof Error ? error.message : '고객 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hospitalId, reloadTick, showToast]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    const filtered = q
      ? customers.filter((c) => (
        c.name.toLowerCase().includes(q)
        || (qDigits.length > 0 && (c.phone ?? '').replace(/\D/g, '').includes(qDigits))
      ))
      : customers;
    const recentOf = (c: CustomerRow) => msOf(c.last_visit_at) || msOf(c.last_activity_at);
    return [...filtered].sort((a, b) => {
      if (sort === 'visits') return b.visits - a.visits || b.total - a.total || recentOf(b) - recentOf(a);
      if (sort === 'paid') return b.paid - a.paid || b.visits - a.visits || recentOf(b) - recentOf(a);
      return recentOf(b) - recentOf(a);
    });
  }, [customers, query, sort]);

  return (
    <div className="partner-mobile-screen has-fixed-title page-enter">
      <header className="partner-screen-title with-action">
        <h1>예약관리</h1>
        <ReservationTabs active="customers" onChange={(tab) => { if (tab !== 'customers') onTabChange(tab); }} />
      </header>

      <section className="px-5 pb-10 pt-2">
        <label className="flex h-12 items-center gap-2 rounded-[14px] bg-[#F2F4F6] px-4">
          <MonoIcon name="search" size={18} color="#B0B8C1" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름이나 전화번호로 찾기"
            aria-label="고객 검색"
            className="min-w-0 flex-1 bg-transparent text-[16px] text-[#191F28] outline-none placeholder:text-[#B0B8C1]"
          />
        </label>

        <div className="mt-3 flex gap-1.5 overflow-x-auto" role="radiogroup" aria-label="고객 정렬">
          {CUSTOMER_SORTS.map((item) => {
            const on = sort === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSort(item.key)}
                className={`h-9 shrink-0 rounded-[8px] px-3 text-[14.5px] font-semibold transition-all active:scale-[0.97] ${on ? 'bg-[#EFF5FE] text-[#2F6FE4]' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="py-16 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <span className="qd-a-item flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
              <MonoIcon name={query.trim() ? 'search' : 'user'} size={34} color="#B0B8C1" />
            </span>
            <p className="qd-a-item mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]" style={{ animationDelay: '.06s' }}>
              {query.trim() ? '찾는 고객이 없어요' : '아직 고객이 없어요'}
            </p>
            <p className="qd-a-item mt-1.5 text-[15px] leading-[1.6] text-[#8B95A1]" style={{ animationDelay: '.12s' }}>
              {query.trim() ? '이름이나 전화번호를 다시 확인해 주세요' : '예약이 들어오면 고객별로 모아 보여 드려요'}
            </p>
          </div>
        ) : (
          <>
            <p className="mt-6 text-[15px] text-[#6B7684]">
              고객 <b className="font-bold tabular-nums text-[#191F28]">{visible.length}</b>명
            </p>
            <div className="mt-2 space-y-1">
              {visible.map((c, index) => {
                const lastLabel = c.last_visit_at
                  ? `마지막 ${monthDayOf(c.last_visit_at)}`
                  : c.last_activity_at ? `최근 예약 ${monthDayOf(c.last_activity_at)}` : '';
                return (
                  <Link
                    key={c.key}
                    href={customerHref(c.key)}
                    className="qd-a-item -mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-[16px] px-2 py-3 text-left transition-colors active:bg-[#F9FAFB]"
                    style={{ animationDelay: `${Math.min(index, 6) * 0.04}s` }}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F2F4F6] text-[17px] font-bold text-[#4E5968]">
                      {c.name.trim().charAt(0) || '환'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[17px] font-bold text-[#191F28]">{c.name}</span>
                        {c.visits >= 3 && <span className="inline-flex h-6 shrink-0 items-center rounded-[6px] bg-[#E8F3FF] px-2 text-[13px] font-semibold text-[#3180F7]">단골</span>}
                        {c.cancelled > 0 && <span className="inline-flex h-6 shrink-0 items-center rounded-[6px] bg-[#FFEEEF] px-2 text-[13px] font-semibold text-[#F04452]">노쇼·취소 있음</span>}
                      </span>
                      {c.phone && <span className="mt-0.5 block truncate text-[14px] text-[#4E5968]">{c.phone}</span>}
                      <span className="mt-0.5 block truncate text-[13.5px] text-[#8B95A1]">
                        방문 {c.visits}회{lastLabel ? ` · ${lastLabel}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-[16px] font-bold tabular-nums text-[#1E3A78]">{wonOf(c.paid)}</span>
                    <ChevronRight size={18} className="-ml-1 shrink-0 text-[#B0B8C1]" />
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </section>

    </div>
  );
}

export default function PartnerReservationsPage() {
  const router = useRouter();
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const now = new Date();
  const [activeTab, setActiveTab] = useState<ReservationTabKey>('reservations');
  const [selected, setSelected] = useState(dateKey(now));
  const [assignTarget, setAssignTarget] = useState<ReservationRow | null>(null);
  const [assignDoctorId, setAssignDoctorId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [memoTarget, setMemoTarget] = useState<ReservationRow | null>(null);
  const [memoDraft, setMemoDraft] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);
  const {
    data: hospitalData,
    loading,
    refresh: refreshHospital,
    mutate: mutateHospital,
  } = useMyHospitalData<HospitalData, ReservationRow>(authUser?.id);
  const hospitalId = hospitalData?.hospital?.id ?? null;
  const items = hospitalData?.reservations ?? [];
  const doctors = hospitalData?.hospital?.doctors ?? [];

  const [customersReload, setCustomersReload] = useState(0);
  useReservationRealtimeRefresh({
    enabled: Boolean(authUser && hospitalId),
    hospitalId,
    onChange: () => {
      setCustomersReload((n) => n + 1);
      void refreshHospital({ force: true, showLoading: false });
    },
  });

  const countByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of items) {
      if (!row.visit_at) continue;
      const key = dateKey(new Date(row.visit_at));
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const dayItems = useMemo(() => {
    return items
      .filter((row) => row.visit_at && dateKey(new Date(row.visit_at)) === selected)
      .sort((a, b) => new Date(a.visit_at ?? 0).getTime() - new Date(b.visit_at ?? 0).getTime());
  }, [items, selected]);

  const selectedDate = dateFromKey(selected);
  const isToday = selected === dateKey(now);

  const openAssign = (row: ReservationRow) => {
    setAssignTarget(row);
    setAssignDoctorId(row.doctor_id ?? '');
  };

  const openMemo = (row: ReservationRow) => {
    setMemoTarget(row);
    setMemoDraft(row.memo ?? '');
  };

  const saveAssign = async () => {
    if (!assignTarget) return;
    setAssigning(true);
    try {
      const doctorId = assignDoctorId || null;
      const previousDoctorName = assignTarget.doctor?.name ?? null;
      const nextDoctor = doctors.find((item) => item.id === doctorId) ?? null;
      const nextDoctorName = nextDoctor?.name ?? null;
      const memoLine = previousDoctorName && nextDoctorName && previousDoctorName !== nextDoctorName
        ? `${previousDoctorName} 원장에서 ${nextDoctorName} 원장으로 담당 변경`
        : !previousDoctorName && nextDoctorName
          ? `${nextDoctorName} 원장 담당 지정`
          : previousDoctorName && !nextDoctorName
            ? `${previousDoctorName} 원장 담당 해제`
            : null;
      const nextMemo = memoLine ? appendReservationMemo(assignTarget.memo, memoLine) : assignTarget.memo ?? '';
      const res = await fetch(`/api/reservations/${assignTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, ...(memoLine ? { memo: nextMemo } : {}) }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        showToast(payload.error || '담당의 저장에 실패했습니다.');
        return;
      }
      mutateHospital((current) => current
        ? {
          ...current,
          reservations: current.reservations.map((row) => (
            row.id === assignTarget.id
              ? { ...row, doctor_id: doctorId, doctor: nextDoctor ? { name: nextDoctor.name } : null, memo: nextMemo }
              : row
          )),
        }
        : current
      );
      setAssignTarget(null);
      showToast('담당의를 저장했어요.');
    } catch {
      showToast('네트워크 오류로 저장하지 못했어요.');
    } finally {
      setAssigning(false);
    }
  };

  const saveMemo = async () => {
    if (!memoTarget || memoSaving) return;
    setMemoSaving(true);
    try {
      const nextMemo = memoDraft.trim();
      const res = await fetch(`/api/reservations/${memoTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo: nextMemo }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        showToast(payload.error || '메모 저장에 실패했습니다.');
        return;
      }
      mutateHospital((current) => current
        ? {
          ...current,
          reservations: current.reservations.map((row) => (
            row.id === memoTarget.id ? { ...row, memo: nextMemo } : row
          )),
        }
        : current
      );
      setMemoTarget(null);
      showToast('메모를 저장했어요.');
    } catch {
      showToast('네트워크 오류로 저장하지 못했어요.');
    } finally {
      setMemoSaving(false);
    }
  };

  if (!authUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-10 text-center">
        <span className="qd-a-item flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
          <MonoIcon name="lock" size={34} color="#B0B8C1" />
        </span>
        <p className="qd-a-item mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]" style={{ animationDelay: '.06s' }}>로그인이 필요해요</p>
        <Link href="/partner/login" className="qd-a-item mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold text-[#3180F7] transition active:scale-[0.97]" style={{ animationDelay: '.12s' }}>
          로그인
        </Link>
      </div>
    );
  }

  if (activeTab === 'settings') {
    return (
      <ScheduleSettingsView
        hospitalId={hospitalId}
        reservations={items}
        onTabChange={setActiveTab}
      />
    );
  }

  if (activeTab === 'customers') {
    return <CustomersView hospitalId={hospitalId} onTabChange={setActiveTab} reloadKey={customersReload} />;
  }

  const memoName = memoTarget ? memoTarget.user?.name ?? memoTarget.customer_name ?? '환자' : '';
  const assignName = assignTarget ? assignTarget.user?.name ?? assignTarget.customer_name ?? '환자' : '';
  const doctorOptions = [{ id: '', name: '미지정', title: null as string | null | undefined }, ...doctors];

  return (
    <div className="partner-mobile-screen has-fixed-title page-enter">
      <header className="partner-screen-title with-action">
        <h1>예약관리</h1>
        <ReservationTabs active="reservations" onChange={setActiveTab} />
      </header>

      <MonthCalendar
        selected={selected}
        onSelect={(date) => setSelected(dateKey(date))}
        hasDot={(key) => (countByDate[key] ?? 0) > 0}
      />

      <div className="h-2.5 bg-[#F2F4F6]" />

      <section className="px-5 pb-10 pt-7">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[20px]! font-bold leading-tight! tracking-[-0.4px] text-[#191F28]">
            {isToday ? '오늘 ' : ''}
            {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
          </h2>
          {!loading && dayItems.length > 0 && (
            <p className="text-[15px] text-[#6B7684]">
              예약 <b className="font-bold tabular-nums text-[#191F28]">{dayItems.length}</b>건
            </p>
          )}
        </div>
        {loading ? (
          <p className="py-16 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
        ) : dayItems.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <span className="qd-a-item flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
              <MonoIcon name="calendar-x" size={34} color="#B0B8C1" />
            </span>
            <p className="qd-a-item mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]" style={{ animationDelay: '.06s' }}>이 날은 예약이 없어요</p>
            <p className="qd-a-item mt-1.5 text-[15px] leading-[1.6] text-[#8B95A1]" style={{ animationDelay: '.12s' }}>예약이 들어오면 시간 순서로 보여 드려요</p>
          </div>
        ) : (
          <div className="mt-2">
            {dayItems.map((row, index) => (
              <ReservationScheduleCard
                key={row.id}
                row={row}
                index={index}
                onAssignRequest={openAssign}
                onMemoRequest={openMemo}
                onDetailRequest={(id) => router.push(`/partner/reservations/${id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {memoTarget && (
        <CommunityModal label="메모 수정" onClose={() => { if (!memoSaving) setMemoTarget(null); }}>
          <div className="overflow-y-auto px-5 pb-5 pt-2">
            <h2 className="text-[20px]! font-bold leading-tight! tracking-[-0.4px] text-[#191F28]">메모 수정</h2>
            <p className="mt-1.5 text-[15px] leading-[1.6] text-[#6B7684]">{memoName}님 예약에 남길 메모예요</p>
            <textarea
              value={memoDraft}
              onChange={(event) => setMemoDraft(event.target.value)}
              placeholder="메모를 입력해 주세요"
              autoFocus
              rows={5}
              className="mt-5 w-full resize-none rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[16px] leading-[1.6] text-[#191F28] outline-none transition-colors placeholder:text-[#B0B8C1] focus:bg-[#EDEFF2]"
            />
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setMemoTarget(null)} disabled={memoSaving} className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#F2F4F6] text-[17px] font-bold text-[#4E5968] transition-all active:scale-[0.98]">
                취소
              </button>
              <button type="button" onClick={saveMemo} disabled={memoSaving} className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98]">
                {memoSaving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </CommunityModal>
      )}

      {assignTarget && (
        <CommunityModal label="담당의 지정" onClose={() => { if (!assigning) setAssignTarget(null); }}>
          <div className="overflow-y-auto px-5 pb-5 pt-2">
            <h2 className="text-[20px]! font-bold leading-tight! tracking-[-0.4px] text-[#191F28]">담당의 지정</h2>
            <p className="mt-1.5 text-[15px] leading-[1.6] text-[#6B7684]">{assignName}님 예약을 맡을 의료진을 골라 주세요</p>
            <div className="mt-4" role="radiogroup" aria-label="담당의">
              {doctorOptions.map((doctor) => {
                const on = assignDoctorId === doctor.id;
                return (
                  <button
                    key={doctor.id || 'none'}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setAssignDoctorId(doctor.id)}
                    className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-[16px] px-2 py-3 text-left transition-colors active:bg-[#F9FAFB]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F2F4F6]">
                      <MonoIcon name="user" size={20} color={doctor.id ? '#6B7684' : '#B0B8C1'} />
                    </span>
                    <span className={`min-w-0 flex-1 truncate text-[17px] ${on ? 'font-semibold text-[#191F28]' : 'text-[#333D4B]'}`}>
                      {doctor.name}{doctor.title ? ` ${doctor.title}` : ''}
                    </span>
                    <span key={String(on)} className={`chk-dot flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${on ? 'is-on bg-[#2F6FE4]' : 'is-off border-2 border-[#E5E8EB]'}`}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={on ? '#fff' : '#D1D6DB'} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setAssignTarget(null)} disabled={assigning} className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#F2F4F6] text-[17px] font-bold text-[#4E5968] transition-all active:scale-[0.98]">
                취소
              </button>
              <button type="button" onClick={saveAssign} disabled={assigning} className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98]">
                {assigning ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </CommunityModal>
      )}
    </div>
  );
}
