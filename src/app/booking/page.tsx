'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store';
import { resolveProductImageUrl } from '@/lib/images';
import BookingDateTimeSheet from '@/components/booking/BookingDateTimeSheet';
import { FlowCta, FlowHeader, cx, stag } from '@/components/booking/FlowKit';
import {
  DOW_INDEX,
  allSlotsForDay,
  formatKDate,
  formatKTime,
  getAvailableTimeGroupsForDay,
  isDayAvailable,
  parseDateKey,
  slotTimestamp,
  type HoursByDow,
  type ScheduleSettings,
} from '@/components/booking/schedule';
import s from '@/components/booking/flow.module.css';

/* ─────────────────────────────────────────────────────────────
 * 예약 — 프리티풀 퀵매칭 어법. 한 화면 한 질문 · 진행 막대 · 아래 큰 버튼.
 *  1) 방문 일시(시트 = 퀵매칭 날짜·시간 피커) → 2) 이 일정으로 예약할까요?(확인) → 결제 화면(3/3)
 * 가능 판정(진료시간·막은 날/칸·지난 시각)과 결제 화면으로 넘기는 값은 예전 그대로.
 * ──────────────────────────────────────────────────────────── */

type Step = 'date' | 'confirm';

const NOTES = [
  '예약 시간 10분 전까지 내원해 주세요.',
  '예약 변경 및 취소는 예약일 3일 전까지 가능합니다.',
  '당일 취소 시 위약금이 발생할 수 있습니다.',
  '공휴일은 예약이 불가합니다.',
  '시술 전 주의사항은 예약 확정 후 문자로 안내드립니다.',
];

export default function BookingPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩중...</div>}>
      <BookingPage />
    </Suspense>
  );
}

function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId') ?? '1';
  // 상품 상세의 '앱결제로 예약하기'로 왔으면 결제 화면에서 앱결제가 먼저 골라져 있게 넘긴다
  const paymentParam = searchParams.get('payment');
  const products = useStore((st) => st.products);
  const hospitals = useStore((st) => st.hospitals);
  const showToast = useStore((st) => st.showToast);
  const product = products.find((p) => p.id === productId);
  const hospital = hospitals.find((h) => h.id === product?.hospitalId);

  // Map operating hours by weekday index (0=Sun, 1=Mon...)
  const hoursByDow = useMemo(() => {
    const map: HoursByDow = {};
    (hospital?.operatingHours ?? []).forEach((oh) => {
      const idx = DOW_INDEX[oh.day];
      if (idx === undefined) return;
      map[idx] = { start: oh.startTime, end: oh.endTime, closed: oh.isClosed };
    });
    return map;
  }, [hospital?.operatingHours]);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [step, setStep] = useState<Step>('date');
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [time, setTime] = useState(''); // HH:mm
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>({ disabledDays: [], disabledSlots: {} });

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!hospital?.id) {
      setScheduleSettings({ disabledDays: [], disabledSlots: {} });
      return;
    }
    let cancelled = false;
    fetch(`/api/hospital-schedule?hospitalId=${encodeURIComponent(hospital.id)}`, { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        setScheduleSettings({
          disabledDays: Array.isArray(data.disabledDays) ? data.disabledDays : [],
          disabledSlots: data.disabledSlots ?? {},
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [hospital?.id]);

  const isDayOpen = (key: string) => {
    const [y, m, d] = parseDateKey(key);
    return isDayAvailable(y, m, d, hoursByDow, scheduleSettings, nowMs);
  };
  const slotsOf = (key: string) => {
    const [y, m, d] = parseDateKey(key);
    return {
      all: allSlotsForDay(y, m, d, hoursByDow),
      available: getAvailableTimeGroupsForDay(y, m, d, hoursByDow, scheduleSettings.disabledSlots, nowMs).flatMap((g) => g.slots),
    };
  };

  // 병원 일정이 늦게 오거나 시간이 지나 고른 날·시각이 막히면 비운다(예전과 같은 판정)
  useEffect(() => {
    if (!date) return;
    if (!isDayOpen(date)) {
      setDate('');
      setTime('');
      setStep('date');
      return;
    }
    if (time && !slotsOf(date).available.includes(time)) {
      setTime('');
      setStep('date');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSettings, date, time, hoursByDow, nowMs]);

  // 처음 들어오면 날짜·시간 시트를 바로 띄운다(퀵매칭과 같은 0.45초 뒤)
  useEffect(() => {
    if (step !== 'date' || (date && time)) return;
    const t = window.setTimeout(() => setSheetOpen(true), 450);
    return () => window.clearTimeout(t);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = () => {
    if (!date || !time) return;
    const [y, m, d] = parseDateKey(date);
    if (slotTimestamp(y, m, d, time) <= Date.now()) {
      setTime('');
      setStep('date');
      showToast('이미 지난 시간이에요. 다시 골라 주세요.');
      return;
    }
    const pay = paymentParam === 'app' ? '&payment=app' : '';
    router.push(`/payment?productId=${productId}&date=${date}&time=${encodeURIComponent(time)}${pay}`);
  };

  const imageUrl = product ? resolveProductImageUrl(product.imageUrl, product.id) : '';
  const productCard = product && (
    <div className={cx(s.product, s.aItem)} style={stag(0)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.productImg} src={imageUrl} alt="" />
      <div className={s.productTxt}>
        <p className={s.productHos}>{product.hospitalName}</p>
        <p className={s.productTitle}>{product.title}</p>
      </div>
      <span className={s.productPrice}>{product.price.toLocaleString()}원</span>
    </div>
  );

  return (
    <div className={s.root}>
      {step === 'date' && (
        <div className={s.page} key="date">
          <FlowHeader onBack={() => router.back()} progress={{ at: 1, from: 0, to: 1 }} />
          <main className={s.main}>
            <h1 className={cx(s.h1, s.aTitle)}>언제 방문하실<br />예정인가요?</h1>
            <p className={cx(s.sub, s.aSub)}>병원 진료시간에 맞춰 예약 가능한 시간만 보여드려요.</p>
            {productCard}
            {/* 날짜·시간 = 한 장짜리 시트(퀵매칭 날짜·시간 피커) — 두 칸 다 같은 시트를 연다 */}
            <button type="button" className={cx(s.field, s.first, date && s.on, s.aItem)} style={stag(1)} aria-haspopup="dialog" onClick={() => setSheetOpen(true)}>
              <CalendarIcon on={!!date} />
              <span className={date ? s.val : s.ph}>{date ? formatKDate(date) : '방문 날짜를 선택해 주세요'}</span>
            </button>
            <button type="button" className={cx(s.field, time && s.on, s.aItem)} style={stag(2)} aria-haspopup="dialog" onClick={() => setSheetOpen(true)}>
              <ClockIcon on={!!time} />
              <span className={time ? s.val : s.ph}>{time ? formatKTime(time) : '방문 시간을 선택해 주세요'}</span>
            </button>
          </main>
          <FlowCta disabled={!date || !time} onClick={() => setStep('confirm')}>다음</FlowCta>
          {sheetOpen && (
            <BookingDateTimeSheet
              date={date}
              time={time}
              nowMs={nowMs}
              isDayOpen={isDayOpen}
              slotsOf={slotsOf}
              onClose={(d, t) => { if (d) setDate(d); if (t) setTime(t); setSheetOpen(false); }}
              onNext={(d, t) => { setDate(d); setTime(t); setSheetOpen(false); setStep('confirm'); }}
            />
          )}
        </div>
      )}

      {step === 'confirm' && (
        <div className={s.page} key="confirm">
          <FlowHeader onBack={() => setStep('date')} progress={{ at: 2, from: 1, to: 2 }} />
          <main className={s.main}>
            <h1 className={cx(s.h1, s.aTitle)}>이 일정으로<br />예약할까요?</h1>
            <p className={cx(s.sub, s.aSub)}>다음 화면에서 결제 방법을 고를 수 있어요.</p>
            <div className={cx(s.summary, s.aItem)} style={stag(0)}>
              <div><span>방문 일시</span><b className={s.blue}>{formatKDate(date)} {formatKTime(time)}</b></div>
              {product && <div><span>병원</span><b>{product.hospitalName}</b></div>}
              {product && <div><span>상품</span><b>{product.title}</b></div>}
              {product?.location && <div><span>위치</span><b>{product.location}</b></div>}
            </div>
            <div className={cx(s.note, s.aItem)} style={stag(1)}>
              <b>예약 전에 확인해 주세요</b>
              <ul>
                {NOTES.map((note) => <li key={note}><span>•</span>{note}</li>)}
              </ul>
            </div>
          </main>
          <div className={s.ctaWrap}>
            <div className={s.btnRow}>
              <button type="button" className={cx(s.cta, s.ghost)} onClick={() => { setStep('date'); setSheetOpen(true); }}>다시 선택</button>
              <button type="button" className={s.cta} onClick={handleConfirm}>예약하고 결제하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarIcon({ on }: { on: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: 'none', color: on ? '#3180F7' : '#8B95A1' }}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon({ on }: { on: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: 'none', color: on ? '#3180F7' : '#8B95A1' }}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
