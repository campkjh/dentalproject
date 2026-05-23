'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useMyHospitalData } from '@/lib/partner/my-hospital-cache';
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

function timeOf(value?: string | null) {
  if (!value) return '--:--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function ReservationScheduleCard({
  row,
  onAssignRequest,
  onDetailRequest,
  onMemoRequest,
}: {
  row: ReservationRow;
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
    <article className="partner-schedule-card">
      <div className="partner-schedule-row top" onClick={() => onDetailRequest(row.id)} style={{ cursor: 'pointer' }}>
        <div>
          <strong>{timeOf(row.visit_at)}</strong>
          <span>{name}</span>
          {phone ? <span>{phone}</span> : null}
        </div>
        <ChevronRight size={22} strokeWidth={2.2} />
      </div>
      <div className="partner-schedule-row">
        <strong>{row.product?.title ?? '상품 정보 없음'}</strong>
        <div className="partner-badge-row">
          {isPaid && <span className="blue">앱결제</span>}
          <span>앱예약</span>
        </div>
      </div>
      <div className="partner-schedule-row">
        <p>
          담당 <em className={assigned ? 'purple' : undefined}>{doctor}</em>
        </p>
        <button type="button" onClick={() => onAssignRequest(row)}>{assigned ? '변경' : '지정'}</button>
      </div>
      <button type="button" className="partner-schedule-memo" onClick={() => onMemoRequest(row)}>
        {row.memo || '메모 없음'}
      </button>
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
  onShowReservations,
}: {
  hospitalId: string | null;
  reservations: ReservationRow[];
  onShowReservations: () => void;
}) {
  const showToast = useStore((s) => s.showToast);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(dateKey(today));
  const [settings, setSettings] = useState<ScheduleSettings>({ disabledDays: [], disabledSlots: {} });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [pendingAction, setPendingAction] = useState<ScheduleAction | null>(null);
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

  const cells = useMemo(() => getMonthCells(year, month), [year, month]);
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
      showToast(`${target}이 ${action.disabled ? '비활성화' : '활성화'} 되었습니다.`);
    } catch (error) {
      setSettings(previous);
      showToast(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setSavingAction(false);
    }
  };

  const confirmAction = () => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    void saveScheduleAction(action);
  };

  return (
    <div className="partner-mobile-screen has-fixed-title partner-reservation-settings">
      <header className="partner-screen-title with-action">
        <h1>예약관리</h1>
        <nav className="partner-inline-segment" aria-label="예약관리 탭">
          <button type="button" onClick={onShowReservations}>병원예약</button>
          <button type="button" className="is-active">예약설정</button>
        </nav>
      </header>

      <section className="partner-settings-calendar">
        <button
          type="button"
          className="partner-settings-month"
          onClick={() => {
            setYear(today.getFullYear());
            setMonth(today.getMonth());
            setSelected(dateKey(today));
          }}
        >
          {month + 1}월
        </button>

        <div className="partner-settings-weekdays">
          {WEEKDAYS.map((day, index) => (
            <span key={day} className={index === 0 || index === 6 ? 'is-weekend' : undefined}>
              {day}
            </span>
          ))}
        </div>

        <div className="partner-settings-grid">
          {cells.map(({ date, muted }) => {
            const key = dateKey(date);
            const isActive = key === selected;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isDisabledDay = disabledDaySet.has(key);
            const hasReservation = reservationDates.has(key);
            return (
              <button
                key={key}
                type="button"
                className={[
                  isActive ? 'is-active' : '',
                  muted ? 'is-muted' : '',
                  isWeekend ? 'is-weekend' : '',
                  isDisabledDay ? 'is-disabled-day' : '',
                  hasReservation ? 'has-reservation' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  setSelected(key);
                  setYear(date.getFullYear());
                  setMonth(date.getMonth());
                }}
              >
                <span>{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="partner-settings-time">
        <h2>{selectedTitle}</h2>
        <button
          type="button"
          className={selectedDayDisabled ? 'is-restore' : undefined}
          onClick={() => setPendingAction({ kind: 'day', date: selected, disabled: !selectedDayDisabled })}
          disabled={loadingSettings || savingAction}
        >
          {selectedDayDisabled ? '진료일 활성화' : '진료일 비활성화'}
        </button>

        <div className="partner-settings-slots" aria-label={`${selectedTitle} 예약 시간 설정`}>
          {SETTING_TIME_SLOTS.map((time) => {
            const disabled = selectedDayDisabled || selectedSlotSet.has(time);
            return (
              <button
                key={time}
                type="button"
                className={disabled ? 'is-disabled' : undefined}
                disabled={loadingSettings || savingAction || selectedDayDisabled}
                onClick={() => setPendingAction({ kind: 'time', date: selected, time, disabled: !selectedSlotSet.has(time) })}
              >
                {time}
              </button>
            );
          })}
        </div>
      </section>

      {pendingAction && (
        <div className="partner-figma-dialog-backdrop" role="presentation">
          <div className="partner-figma-alert partner-schedule-alert" role="dialog" aria-modal="true">
            <div className="partner-figma-alert-copy">
              <h2>
                {pendingAction.kind === 'day'
                  ? pendingAction.disabled ? '정말로 비활성화 하시겠습니까?' : '정말로 활성화 하시겠습니까?'
                  : `${timeHourLabel(pendingAction.time)} 진료를 ${pendingAction.disabled ? '비활성화' : '활성화'} 하시겠습니까?`}
              </h2>
              <p>
                {pendingAction.kind === 'day'
                  ? pendingAction.disabled ? '해당일의 모든시간의 스케줄이 비활성화 됩니다.' : '해당일의 스케줄을 다시 예약 가능 상태로 변경합니다.'
                  : pendingAction.disabled ? '해당 시간에 환자가 있는지 확인해주세요.' : '해당 시간의 예약 접수를 다시 활성화합니다.'}
              </p>
            </div>
            <div className="partner-figma-alert-actions">
              <button type="button" onClick={confirmAction} disabled={savingAction}>네</button>
              <button type="button" onClick={() => setPendingAction(null)} disabled={savingAction}>아니요</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PartnerReservationsPage() {
  const router = useRouter();
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const now = new Date();
  const [activeTab, setActiveTab] = useState<'reservations' | 'settings'>('reservations');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
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

  useReservationRealtimeRefresh({
    enabled: Boolean(authUser && hospitalId),
    hospitalId,
    onChange: () => {
      void refreshHospital({ force: true, showLoading: false });
    },
  });

  const cells = useMemo(() => getMonthCells(year, month), [year, month]);
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

  const selectedDate = new Date(selected);
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
      showToast('담당의를 저장했습니다.');
    } catch {
      showToast('네트워크 오류가 발생했습니다.');
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
      showToast('메모를 저장했습니다.');
    } catch {
      showToast('네트워크 오류가 발생했습니다.');
    } finally {
      setMemoSaving(false);
    }
  };

  if (!authUser) {
    return (
      <div className="partner-empty-state">
        <p>로그인이 필요합니다.</p>
        <Link href="/partner/login">로그인</Link>
      </div>
    );
  }

  if (activeTab === 'settings') {
    return (
      <ScheduleSettingsView
        hospitalId={hospitalId}
        reservations={items}
        onShowReservations={() => setActiveTab('reservations')}
      />
    );
  }

  return (
    <div className="partner-mobile-screen has-fixed-title partner-reservations-screen">
      <header className="partner-screen-title with-action">
        <h1>예약관리</h1>
        <nav className="partner-inline-segment" aria-label="예약관리 탭">
          <a className="is-active" onClick={() => setActiveTab('reservations')} style={{ cursor: 'pointer' }}>병원예약</a>
          <a onClick={() => setActiveTab('settings')} style={{ cursor: 'pointer' }}>예약설정</a>
        </nav>
      </header>

      <section className="partner-settings-calendar partner-reservation-calendar">
        <button
          type="button"
          className="partner-settings-month"
          onClick={() => {
            setYear(now.getFullYear());
            setMonth(now.getMonth());
            setSelected(dateKey(now));
          }}
        >
          {month + 1}월
        </button>

        <div className="partner-settings-weekdays">
          {WEEKDAYS.map((day, index) => (
            <span key={day} className={index === 0 || index === 6 ? 'is-weekend' : undefined}>
              {day}
            </span>
          ))}
        </div>

        <div className="partner-settings-grid partner-reservation-grid">
          {cells.map(({ date, muted }) => {
            const key = dateKey(date);
            const active = key === selected;
            const count = countByDate[key] ?? 0;
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            return (
              <button
                key={key}
                type="button"
                className={[
                  active ? 'is-active' : '',
                  count > 0 ? 'has-reservation' : '',
                  muted ? 'is-muted' : '',
                  weekend ? 'is-weekend' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  setSelected(key);
                  setYear(date.getFullYear());
                  setMonth(date.getMonth());
                }}
              >
                <span>{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="partner-schedule-section">
        <h2>
          {isToday ? '오늘 ' : ''}
          {Number.isNaN(selectedDate.getTime()) ? month + 1 : selectedDate.getMonth() + 1}월
          {Number.isNaN(selectedDate.getTime()) ? now.getDate() : selectedDate.getDate()}일
        </h2>
        {loading ? (
          <div className="partner-loading small">불러오는 중...</div>
        ) : dayItems.length === 0 ? (
          <div className="partner-empty-state compact">
            <p>해당 날짜에 예약이 없습니다.</p>
            <span>예약이 등록되면 시간순으로 표시됩니다.</span>
          </div>
        ) : (
          <div className="partner-schedule-list">
            {dayItems.map((row) => (
              <ReservationScheduleCard
                key={row.id}
                row={row}
                onAssignRequest={openAssign}
                onMemoRequest={openMemo}
                onDetailRequest={(id) => router.push(`/partner/reservations/${id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {memoTarget && (
        <div className="partner-figma-dialog-backdrop" role="presentation">
          <div className="partner-figma-alert partner-memo-dialog" role="dialog" aria-modal="true">
            <div className="partner-figma-alert-copy">
              <h2>메모 수정</h2>
              <p>{memoTarget.user?.name ?? memoTarget.customer_name ?? '환자'} 예약 메모를 수정합니다.</p>
            </div>
            <textarea
              value={memoDraft}
              onChange={(event) => setMemoDraft(event.target.value)}
              placeholder="메모를 입력해주세요"
              autoFocus
            />
            <div className="partner-figma-alert-actions">
              <button type="button" onClick={saveMemo} disabled={memoSaving}>저장</button>
              <button type="button" onClick={() => setMemoTarget(null)} disabled={memoSaving}>취소</button>
            </div>
          </div>
        </div>
      )}

      {assignTarget && (
        <div className="partner-figma-dialog-backdrop" role="presentation">
          <div className="partner-figma-alert partner-assign-dialog" role="dialog" aria-modal="true">
            <div className="partner-figma-alert-copy">
              <h2>담당의 지정</h2>
              <p>{assignTarget.user?.name ?? assignTarget.customer_name ?? '환자'} 예약에 담당의를 연결합니다.</p>
            </div>
            <div className="partner-assign-field">
              <select value={assignDoctorId} onChange={(event) => setAssignDoctorId(event.target.value)}>
                <option value="">미지정</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}{doctor.title ? ` ${doctor.title}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="partner-figma-alert-actions">
              <button type="button" onClick={saveAssign} disabled={assigning}>저장</button>
              <button type="button" onClick={() => setAssignTarget(null)} disabled={assigning}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
