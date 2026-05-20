'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
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

export default function PartnerReservationsPage() {
  const router = useRouter();
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const now = new Date();
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

  return (
    <div className="partner-mobile-screen">
      <header className="partner-screen-title with-action">
        <h1>예약관리</h1>
        <nav className="partner-inline-segment" aria-label="예약관리 탭">
          <a className="is-active">병원예약</a>
          <a>예약설정</a>
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
