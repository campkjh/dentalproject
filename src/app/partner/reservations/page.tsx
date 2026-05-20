'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ToggleLeft, ToggleRight, Clock } from 'lucide-react';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
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
}: {
  row: ReservationRow;
  onAssignRequest: (row: ReservationRow) => void;
  onDetailRequest: (id: string) => void;
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
      <div className="partner-schedule-memo">
        {row.memo || '메모 없음'}
      </div>
    </article>
  );
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;
type DaySchedule = { day: string; is_closed: boolean; start_time: string; end_time: string };

function ScheduleSettingsView({ hospitalId }: { hospitalId: string | null }) {
  const showToast = useStore((s) => s.showToast);
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    DAYS.map((d) => ({ day: d, is_closed: d === '일', start_time: '09:00', end_time: '18:00' }))
  );
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!hospitalId || !hasSupabaseEnv()) return;
    const sb = createClient();
    sb.from('operating_hours')
      .select('day, is_closed, start_time, end_time')
      .eq('hospital_id', hospitalId)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        setSchedule(DAYS.map((d) => {
          const row = data.find((r: any) => r.day === d);
          return row
            ? { day: d, is_closed: row.is_closed ?? false, start_time: row.start_time ?? '09:00', end_time: row.end_time ?? '18:00' }
            : { day: d, is_closed: false, start_time: '09:00', end_time: '18:00' };
        }));
        setLoaded(true);
      });
  }, [hospitalId]);

  const toggle = (day: string) =>
    setSchedule((prev) => prev.map((r) => r.day === day ? { ...r, is_closed: !r.is_closed } : r));

  const setTime = (day: string, field: 'start_time' | 'end_time', val: string) =>
    setSchedule((prev) => prev.map((r) => r.day === day ? { ...r, [field]: val } : r));

  const save = async () => {
    if (!hospitalId || !hasSupabaseEnv()) { showToast('병원 정보를 불러올 수 없습니다.'); return; }
    setSaving(true);
    try {
      const sb = createClient();
      const rows = schedule.map((r) => ({
        hospital_id: hospitalId,
        day: r.day,
        is_closed: r.is_closed,
        start_time: r.is_closed ? null : r.start_time,
        end_time: r.is_closed ? null : r.end_time,
      }));
      const { error } = await sb.from('operating_hours').upsert(rows, { onConflict: 'hospital_id,day' });
      if (error) throw error;
      showToast('진료 스케줄을 저장했습니다.');
    } catch (e: any) {
      showToast(e?.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="partner-mobile-screen">
      <header className="partner-screen-title with-action">
        <h1>예약관리</h1>
        <nav className="partner-inline-segment" aria-label="예약관리 탭">
          <a href="/partner/reservations">병원예약</a>
          <a className="is-active">예약설정</a>
        </nav>
      </header>

      <div style={{ padding: '16px 16px 100px' }}>
        <p className="text-xs text-gray-400 mb-4">요일별 진료일과 운영시간을 설정하세요.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {schedule.map((row) => (
            <div key={row.day} style={{
              background: row.is_closed ? '#F9FAFB' : '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: 14,
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: row.is_closed ? 0 : 12 }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: row.is_closed ? '#9CA3AF' : '#111827' }}>
                  {row.day}요일
                </span>
                <button
                  type="button"
                  onClick={() => toggle(row.day)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: row.is_closed ? '#9CA3AF' : '#3182F6', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {row.is_closed
                    ? <><ToggleLeft size={22} /><span>휴진</span></>
                    : <><ToggleRight size={22} /><span>진료</span></>
                  }
                </button>
              </div>

              {!row.is_closed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={14} color="#6B7280" />
                  <input
                    type="time"
                    value={row.start_time}
                    onChange={(e) => setTime(row.day, 'start_time', e.target.value)}
                    style={{ fontSize: 14, border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 10px', flex: 1 }}
                  />
                  <span style={{ color: '#9CA3AF', fontSize: 13 }}>~</span>
                  <input
                    type="time"
                    value={row.end_time}
                    onChange={(e) => setTime(row.day, 'end_time', e.target.value)}
                    style={{ fontSize: 14, border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 10px', flex: 1 }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div style={{ position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, padding: '0 16px' }}>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{ width: '100%', height: 52, borderRadius: 14, backgroundColor: saving ? '#C4B5FD' : '#8037FF', color: '#fff', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer' }}
        >
          {saving ? '저장 중...' : '스케줄 저장'}
        </button>
      </div>
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
  const [items, setItems] = useState<ReservationRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [assignTarget, setAssignTarget] = useState<ReservationRow | null>(null);
  const [assignDoctorId, setAssignDoctorId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadHospitalReservations = useCallback(async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
    if (!authUser) {
      setHospitalId(null);
      setItems([]);
      setDoctors([]);
      setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/my-hospital', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!mountedRef.current) return;
      setHospitalId(data.hospital?.id ?? null);
      setItems(data.reservations ?? []);
      setDoctors(data.hospital?.doctors ?? []);
    } finally {
      if (mountedRef.current && showLoading) setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    void loadHospitalReservations({ showLoading: true });
  }, [loadHospitalReservations]);

  useReservationRealtimeRefresh({
    enabled: Boolean(authUser && hospitalId),
    hospitalId,
    onChange: () => loadHospitalReservations({ showLoading: false }),
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

  const saveAssign = async () => {
    if (!assignTarget) return;
    setAssigning(true);
    try {
      const doctorId = assignDoctorId || null;
      const res = await fetch(`/api/reservations/${assignTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        showToast(payload.error || '담당의 저장에 실패했습니다.');
        return;
      }
      const doctor = doctors.find((item) => item.id === doctorId);
      setItems((prev) => prev.map((row) => (
        row.id === assignTarget.id
          ? { ...row, doctor_id: doctorId, doctor: doctor ? { name: doctor.name } : null }
          : row
      )));
      setAssignTarget(null);
      showToast('담당의를 저장했습니다.');
    } catch {
      showToast('네트워크 오류가 발생했습니다.');
    } finally {
      setAssigning(false);
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

  if (activeTab === 'settings') return <ScheduleSettingsView hospitalId={hospitalId} />;

  return (
    <div className="partner-mobile-screen">
      <header className="partner-screen-title with-action">
        <h1>예약관리</h1>
        <nav className="partner-inline-segment" aria-label="예약관리 탭">
          <a className="is-active" onClick={() => setActiveTab('reservations')} style={{ cursor: 'pointer' }}>병원예약</a>
          <a onClick={() => setActiveTab('settings')} style={{ cursor: 'pointer' }}>예약설정</a>
        </nav>
      </header>

      <section className="partner-calendar-section">
        <button
          type="button"
          className="partner-month-label"
          onClick={() => {
            setYear(now.getFullYear());
            setMonth(now.getMonth());
            setSelected(dateKey(now));
          }}
        >
          {month + 1}월
        </button>

        <div className="partner-weekdays">
          {WEEKDAYS.map((day, index) => (
            <span key={day} className={index === 0 || index === 6 ? 'weekend' : undefined}>
              {day}
            </span>
          ))}
        </div>

        <div className="partner-calendar-grid">
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
                  count > 0 ? 'has-event' : '',
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
              <ReservationScheduleCard key={row.id} row={row} onAssignRequest={openAssign} onDetailRequest={(id) => router.push(`/partner/reservations/${id}`)} />
            ))}
          </div>
        )}
      </section>

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
