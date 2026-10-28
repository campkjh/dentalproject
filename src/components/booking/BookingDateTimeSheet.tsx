'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { FlowSheet, cx, useFlowSheet } from './FlowKit';
import { DAY_LABELS } from './schedule';
import s from './flow.module.css';

/* ── 방문 일시 시트 — 프리티풀 퀵매칭 QmDateTimeSheet(토스 '가는 날' 화이트판) 그대로.
 *  달력(6줄 고정·달마다 줄이 한 줄씩 올라옴) + 시 칩 줄(옆으로 넘김) + 분 칩 줄 + 다음.
 *  다른 점: 고를 수 있는 날·시각은 병원 진료시간·막은 칸·지난 시각으로 정한다(30분 칸 → 분 칩 00·30). */

const MONTHS_AHEAD = 12;
const SLOT_MINS = [0, 30];
/** 한 줄씩 올라오는 간격(초) · 첫 줄 시작(시트가 올라오는 동안) */
const RISE_GAP = 0.05;
const RISE_START = 0.12;
const pad2 = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m0: number, d: number) => `${y}-${pad2(m0 + 1)}-${pad2(d)}`;
const rise = (sec: number) => ({ animationDelay: `${sec.toFixed(3)}s` });

export type DaySlots = { all: string[]; available: string[] };

/** 한 달 칸 — 달마다 새로 떠서(key) 줄들이 다시 올라온다. 높이가 달마다 출렁이지 않게 늘 6줄 */
function CalGrid({ y, m, sel, todayStr, startAt, isDayOpen, onPick }: {
  y: number;
  m: number;
  sel: string;
  todayStr: string;
  startAt: number;
  isDayOpen: (key: string) => boolean;
  onPick: (key: string) => void;
}) {
  const [base] = useState(startAt); // 뜬 순간 값으로 고정(다시 그려져도 지연이 바뀌어 튀지 않게)
  const first = new Date(y, m, 1).getDay();
  const daysIn = new Date(y, m + 1, 0).getDate();
  return (
    <div className={s.calGrid}>
      {Array.from({ length: 6 }, (_, r) => (
        <div key={r} className={s.calRow} style={rise(base + r * RISE_GAP)}>
          {Array.from({ length: 7 }, (_, c) => {
            const d = r * 7 + c - first + 1;
            if (d < 1 || d > daysIn) return <span key={c} />;
            const key = ymd(y, m, d);
            const on = key === sel;
            const open = isDayOpen(key);
            return (
              <button
                key={c}
                type="button"
                className={cx(s.calDay, on && s.on, key === todayStr && s.today)}
                disabled={!open}
                aria-pressed={on}
                aria-label={`${y}년 ${m + 1}월 ${d}일 ${DAY_LABELS[c]}요일${open ? '' : ' 예약 불가'}`}
                onClick={() => onPick(key)}
              >
                {d}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function BookingDateTimeSheet({ date, time, nowMs, isDayOpen, slotsOf, onClose, onNext }: {
  date: string;
  time: string;
  nowMs: number;
  /** 'YYYY-MM-DD' 날짜가 예약 가능한지 */
  isDayOpen: (key: string) => boolean;
  /** 그날 진료시간 칸 전체와 지금 고를 수 있는 칸 */
  slotsOf: (key: string) => DaySlots;
  /** 바깥·Esc·뒤로가기 — 고른 데까지 넘긴다(날짜를 골랐으면 그 시간도) */
  onClose: (date: string, time: string) => void;
  /** 다음 — 날짜·시간 넘기고 다음 단계로 */
  onNext: (date: string, time: string) => void;
}) {
  const [now] = useState(() => new Date(nowMs));
  const todayStr = ymd(now.getFullYear(), now.getMonth(), now.getDate());
  const [sel, setSel] = useState(date && isDayOpen(date) ? date : '');
  const [hour, setHour] = useState<number | null>(() => (time ? Number(time.slice(0, 2)) : null));
  const [minute, setMinute] = useState(() => (time ? Number(time.slice(3, 5)) : 0));
  const [ym, setYm] = useState(() => {
    const b = sel ? new Date(`${sel}T00:00:00`) : now;
    return { y: b.getFullYear(), m: b.getMonth() };
  });
  const minIdx = now.getFullYear() * 12 + now.getMonth();
  const curIdx = ym.y * 12 + ym.m;
  const goMonth = (delta: number) => setYm(({ y, m }) => {
    const t = Math.max(minIdx, Math.min(minIdx + MONTHS_AHEAD, y * 12 + m + delta));
    return { y: Math.floor(t / 12), m: t % 12 };
  });

  const slots = sel ? slotsOf(sel) : { all: [], available: [] };
  const avail = new Set(slots.available);
  const hours = [...new Set(slots.all.map((t) => Number(t.slice(0, 2))))];
  const hourOpen = (h: number) => SLOT_MINS.some((mm) => avail.has(`${pad2(h)}:${pad2(mm)}`));
  const timeStr = hour === null ? '' : `${pad2(hour)}:${pad2(minute)}`;
  const timeOk = !!timeStr && avail.has(timeStr);
  const canNext = !!sel && timeOk;

  /** 날짜를 고르면 — 고른 시각이 그날 안 되면 그날 첫 빈 칸으로 */
  const pickDay = (key: string) => {
    setSel(key);
    const day = slotsOf(key).available;
    if (timeStr && day.includes(timeStr)) return;
    const firstOpen = day[0];
    if (firstOpen) { setHour(Number(firstOpen.slice(0, 2))); setMinute(Number(firstOpen.slice(3, 5))); }
    else setHour(null);
  };
  /** 시를 고르면 — 그 시에 지금 분이 안 되면 되는 분으로 */
  const pickHour = (h: number) => {
    setHour(h);
    if (!avail.has(`${pad2(h)}:${pad2(minute)}`)) {
      const mm = SLOT_MINS.find((x) => avail.has(`${pad2(h)}:${pad2(x)}`));
      if (mm !== undefined) setMinute(mm);
    }
  };

  // 처음 뜬 달만 시트가 올라오는 동안 시작, 넘긴 달은 바로
  const [firstIdx] = useState(curIdx);
  // 달력 밑 줄들 — 처음 뜬 달 6줄 다음부터 이어서
  const [below] = useState(() => RISE_START + 6 * RISE_GAP + 0.03);

  // 시 칩 줄 — 고른 시가 줄 맨 앞에 오게(날짜를 바꿔 줄이 바뀌어도)
  const hoursRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const row = hoursRef.current;
    if (!row || hour === null) return;
    const chip = row.querySelector<HTMLElement>(`[data-h="${hour}"]`);
    if (chip) row.scrollLeft = chip.offsetLeft - (parseFloat(getComputedStyle(row).paddingLeft) || 0);
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const { out, close } = useFlowSheet(() => onClose(sel, sel && timeOk ? timeStr : ''));

  return (
    <FlowSheet label="방문 날짜와 시간 선택" out={out} onBackdrop={() => close()}>
      <>
          <h2 className={s.sheetTitle}>방문일</h2>
          <div className={s.calHead}>
            <b>{ym.y}년 {pad2(ym.m + 1)}월</b>
            <div className={s.calNav}>
              <button type="button" aria-label="이전 달" disabled={curIdx <= minIdx} onClick={() => goMonth(-1)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5.5 8.5 12l6.5 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button type="button" aria-label="다음 달" disabled={curIdx >= minIdx + MONTHS_AHEAD} onClick={() => goMonth(1)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
          <div className={s.calWeek} aria-hidden="true">
            {DAY_LABELS.map((w, i) => <span key={w} className={i === 0 ? s.sun : i === 6 ? s.sat : undefined}>{w}</span>)}
          </div>
          <CalGrid
            key={curIdx}
            y={ym.y}
            m={ym.m}
            sel={sel}
            todayStr={todayStr}
            startAt={curIdx === firstIdx ? RISE_START : 0}
            isDayOpen={isDayOpen}
            onPick={pickDay}
          />
          <p className={cx(s.tlabel, s.rise)} style={rise(below)}>
            {!sel
              ? '방문할 날짜를 골라주세요'
              : timeOk && hour !== null
                ? <><strong>{pad2(hour)}시{minute ? ` ${pad2(minute)}분` : ''}</strong> 방문</>
                : '방문 시간을 골라주세요'}
          </p>
          {sel && hours.length > 0 ? (
            <>
              <div ref={hoursRef} className={cx(s.tchips, s.rise)} style={rise(below + RISE_GAP)} role="group" aria-label="방문 시(時)">
                {hours.map((h) => (
                  <button key={`${sel}-${h}`} type="button" data-h={h} className={cx(s.tchip, h === hour && s.on)} disabled={!hourOpen(h)} aria-pressed={h === hour} onClick={() => pickHour(h)}>
                    {pad2(h)}시
                  </button>
                ))}
              </div>
              <div className={cx(s.tchips, s.min, s.rise)} style={rise(below + RISE_GAP * 2)} role="group" aria-label="방문 분">
                {SLOT_MINS.map((mm) => {
                  const ok = hour !== null && avail.has(`${pad2(hour)}:${pad2(mm)}`);
                  return (
                    <button key={mm} type="button" className={cx(s.tchip, ok && mm === minute && s.on)} disabled={!ok} aria-pressed={ok && mm === minute} onClick={() => setMinute(mm)}>
                      {pad2(mm)}분
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className={cx(s.tempty, s.rise)} style={rise(below + RISE_GAP)}>
              {sel ? '이 날은 남은 예약 시간이 없어요.' : '예약 가능한 날짜만 고를 수 있어요.'}
            </p>
          )}
          <div className={cx(s.sheetActions, s.rise)} style={rise(below + RISE_GAP * 3)}>
            <button type="button" className={s.sheetBtn} disabled={!canNext} onClick={() => close(() => onNext(sel, timeStr))}>
              다음
            </button>
          </div>
      </>
    </FlowSheet>
  );
}
