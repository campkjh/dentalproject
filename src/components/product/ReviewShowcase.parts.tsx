'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { KeywordOrb, type KeywordOrbText } from './KeywordOrb';
import s from './ReviewShowcase.module.css';

/*
 * 후기 쇼케이스 카드 속 움직이는 화면 3종 — 프리티풀 비즈 SceneMatch.parts(MatchDemo · OrbDemo · ReportDemo)의 움직임 · 치수를
 * 그대로 두고 글자만 치과 · 시술 후기로 바꿨다. 숫자는 모두 예시 그림(실제 후기 아님) — 카드마다 '예시 화면' 표시가 붙는다.
 */

export type DemoState = { active: boolean; run: boolean; still: boolean };

/* ── 예시 데이터 ─────────────────────────────── */

export const SAT = {
  demoTitle: '후기 모으는 중...',
  demoLabel: '방문자 만족도',
  rows: ['방문자 A', '방문자 B', '방문자 C', '방문자 D', '방문자 E'],
  scores: [98, 95, 92, 90, 87],
};

export const ORB_TEXT: KeywordOrbText = {
  titleTop: '후기 24건을 모아 보니,',
  titleStrong: '이 시술의 이런 점',
  titleRest: '에 만족했어요',
  orbLines: ['후기로 본', '이 시술'],
  // 앞 넷 = 체크 칩(원 테두리에 걸치는 자리라 짧게), 뒤 넷 = 회색 칩
  primary: ['통증 적음', '친절한 상담', '빠른 회복', '꼼꼼한 설명'],
  secondary: ['자연스러운 결과', '깔끔한 시설', '합리적인 가격', '재방문 의사'],
};

export const REPORT = {
  demoTitle: '시술 리포트',
  analyzing: '후기 분석 중...',
  rows: ['효과', '통증', '상담', '시설', '가격'],
  scores: [5.0, 4.8, 5.0, 4.9, 4.7],
  best: '최고',
};

/* ── 숫자 굴림(오도미터) ─────────────────────────────── */

function Digit({ d }: { d: string }) {
  // 값이 바뀌면 렌더 중에 바로 다음 상태로(이전 값을 기억해 굴린다)
  const [st, setSt] = useState({ cur: d, prev: '', dir: 1, k: 0 });
  if (st.cur !== d) setSt({ cur: d, prev: st.cur, dir: Number(d) >= Number(st.cur) ? 1 : -1, k: st.k + 1 });
  const v = { '--d': st.dir } as CSSProperties;
  return (
    <span className={s.dg}>
      <span className={s.dgSz}>{st.cur}</span>
      {st.k > 0 && <span key={`o${st.k}`} className={`${s.dgA} ${s.dgOut}`} style={v}>{st.prev}</span>}
      <span key={`i${st.k}`} className={`${s.dgA}${st.k > 0 ? ` ${s.dgIn}` : ''}`} style={v}>{st.cur}</span>
    </span>
  );
}

function Odometer({ value }: { value: string }) {
  const cs = value.split('');
  // 오른쪽 자리부터 같은 key — 자릿수가 같으면 바뀐 자리만 굴러간다
  return <span className={s.odo}>{cs.map((c, i) => <Digit key={cs.length - i} d={c} />)}</span>;
}

/* ── 아이콘 ─────────────────────────────── */

function CheckCircle({ className = '', size = 26 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 26 26" aria-hidden>
      <circle cx="13" cy="13" r="13" fill="#3180F7" />
      <path d="M7.6 13.4l3.6 3.5 7.2-7.6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PERSON_TINT = [
  ['#3180F7', 'rgba(49,128,247,.13)'],
  ['#8B95A1', 'rgba(139,149,161,.15)'],
  ['#13B4A6', 'rgba(19,180,166,.14)'],
  ['#F2B100', 'rgba(242,177,0,.15)'],
  ['#B0B8C1', 'rgba(176,184,193,.16)'],
];

function PersonBadge({ i }: { i: number }) {
  const [fg, bg] = PERSON_TINT[i % PERSON_TINT.length];
  return (
    <span className={s.d1Ic} style={{ background: bg }}>
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
        <circle cx="10" cy="6.6" r="3.6" fill={fg} />
        <path d="M3.4 17.2c.5-3.6 3.2-5.6 6.6-5.6s6.1 2 6.6 5.6c.06.45-.3.8-.75.8H4.15c-.45 0-.81-.35-.75-.8Z" fill={fg} />
      </svg>
    </span>
  );
}

/** 리포트 항목 아이콘 — 효과(반짝 치아) · 통증(하트) · 상담(말풍선) · 시설(건물) · 가격(동전) */
const REPORT_COLORS = ['#3180F7', '#F04452', '#13B4A6', '#8B6CF0', '#FFB331'];
function ReportIcon({ i, on }: { i: number; on: boolean }) {
  const c = on ? REPORT_COLORS[i % REPORT_COLORS.length] : '#B9C0C8';
  const k = i % 5;
  return (
    <svg className={s.d3Ic} width="32" height="32" viewBox="0 0 24 24" aria-hidden>
      {k === 0 && (
        <g fill={c}>
          <path d="M7.6 3.6c1.6 0 2.6.8 4.4.8s2.8-.8 4.4-.8c2.6 0 4 2.2 3.6 5-.3 2.2-1 3.6-1.5 5.6-.5 2.2-.8 6.2-2.6 6.2-1.6 0-1.6-4.4-3.9-4.4s-2.3 4.4-3.9 4.4c-1.8 0-2.1-4-2.6-6.2-.5-2-1.2-3.4-1.5-5.6-.4-2.8 1-5 3.6-5Z" />
          <path d="M20.6 1.4l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5Z" opacity=".8" />
        </g>
      )}
      {k === 1 && <path fill={c} d="M12 20.6s-7.4-4.5-9.3-9C1.3 8.3 3.3 4.6 6.9 4.6c2 0 3.4 1.1 5.1 2.9 1.7-1.8 3.1-2.9 5.1-2.9 3.6 0 5.6 3.7 4.2 7-1.9 4.5-9.3 9-9.3 9Z" />}
      {k === 2 && (
        <g>
          <path fill={c} d="M4 4.2h16a1.8 1.8 0 0 1 1.8 1.8v9.2a1.8 1.8 0 0 1-1.8 1.8h-8.4l-4.6 3.6v-3.6H4a1.8 1.8 0 0 1-1.8-1.8V6A1.8 1.8 0 0 1 4 4.2Z" />
          <circle cx="8" cy="10.6" r="1.3" fill="#fff" />
          <circle cx="12" cy="10.6" r="1.3" fill="#fff" />
          <circle cx="16" cy="10.6" r="1.3" fill="#fff" />
        </g>
      )}
      {k === 3 && (
        <g>
          <path fill={c} d="M5 21V5.4A1.6 1.6 0 0 1 6.6 3.8h10.8A1.6 1.6 0 0 1 19 5.4V21Z" />
          <path d="M12 6.8v5M9.5 9.3h5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
          <rect x="10" y="15.6" width="4" height="5.4" rx=".8" fill="#fff" opacity=".9" />
        </g>
      )}
      {k === 4 && (
        <g>
          <circle cx="12" cy="12" r="9" fill={c} />
          <path d="M7.6 8.4l1.7 7 2.7-6 2.7 6 1.7-7M7 11.6h10" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
}

function Spinner() {
  return (
    <svg className={s.spin} width="32" height="32" viewBox="0 0 32 32" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        const x1 = 16 + Math.sin(a) * 6.5, y1 = 16 - Math.cos(a) * 6.5;
        const x2 = 16 + Math.sin(a) * 11, y2 = 16 - Math.cos(a) * 11;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#AEB5BE" strokeWidth="2.4" strokeLinecap="round" opacity={1 - i * 0.11} />;
      })}
    </svg>
  );
}

/* ── 카드 1: 방문자 만족도(굴러가는 숫자 + 뼈대 막대) ─────────────────────────────── */

const IDLE_VALUES = [84, 76, 93, 71, 89];

export function SatisfactionDemo({ active, run, still }: DemoState) {
  const [vi, setVi] = useState(0);
  const on = active || still;
  useEffect(() => {
    if (on || !run) return undefined;
    const id = window.setInterval(() => setVi((v) => (v + 1) % IDLE_VALUES.length), 650);
    return () => window.clearInterval(id);
  }, [on, run]);
  const top = Math.max(...SAT.scores);
  const value = on ? top : IDLE_VALUES[vi];
  return (
    <div className={`${s.panel} ${s.p1}`}>
      <div className={s.d1Label}>{on ? SAT.demoLabel : SAT.demoTitle}</div>
      <div className={s.d1Rate}>
        <span className={s.d1Num}>
          <Odometer value={String(value)} />%
          <CheckCircle className={`${s.d1Ck}${on ? ` ${s.on}` : ''}`} />
        </span>
      </div>
      <div className={`${s.d1List}${on ? ` ${s.on}` : ''}${run ? ` ${s.run}` : ''}`}>
        {SAT.rows.map((r, i) => (
          <div className={s.d1Row} key={i}>
            <div className={`${s.d1Bar} ${s[`d1Bar${i}`]}`} />
            <div className={s.d1In} style={{ transitionDelay: on ? `${i * 40}ms` : '0ms' }}>
              <PersonBadge i={i} />
              <span className={s.d1Name}>{r}</span>
              <span className={s.d1Score}>{SAT.scores[i]}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 카드 2: 후기 '언급 키워드' 판(보라 원 안 반짝이 별) ─────────────────────────────
 * 판이 혼자 먼저 재생되지 않게 카드가 켜지고(fired) 화면 안일 때(visible) 붙인다 — 판의 6초 폴백이 화면 밖에서 먼저 터지는 것도 막는다.
 * 마우스를 올리면 판 등장을 한 번 더(직전 재생 뒤 2.6초 안은 무시 — 카드 사이를 오가며 깜빡이지 않게).
 */
export function OrbDemo({ fired, visible, still, delay, hovered }: { fired: boolean; visible: boolean; still: boolean; delay: number; hovered: boolean }) {
  const [armed, setArmed] = useState(false);
  const mount = still || armed;
  useEffect(() => {
    if (mount || !fired || !visible) return undefined;
    const id = window.setTimeout(() => setArmed(true), delay);
    return () => window.clearTimeout(id);
  }, [fired, visible, mount, delay]);

  const [play, setPlay] = useState(0);
  const lastPlay = useRef(0);
  useEffect(() => {
    if (!mount || still) return undefined;
    const now = performance.now();
    if (!lastPlay.current) { lastPlay.current = now; return undefined; }
    if (!hovered || now - lastPlay.current < 2600) return undefined;
    lastPlay.current = now;
    // 다음 틀에 올려 렌더 중 연쇄 갱신을 피한다
    const id = window.requestAnimationFrame(() => setPlay((p) => p + 1));
    return () => window.cancelAnimationFrame(id);
  }, [hovered, mount, still]);

  return (
    <>
      <div className={s.orbp} />
      <div className={`${s.orbw}${mount && !visible && !still ? ` ${s.paused}` : ''}`}>
        {mount && <KeywordOrb key={play} text={ORB_TEXT} still={still} />}
      </div>
    </>
  );
}

/* ── 카드 3: 시술 리포트(돌기 → 점수 배지, 5.0 은 '최고') ─────────────────────────────── */

export function ReportDemo({ active, run, still }: DemoState) {
  const on = active || still;
  const top = Math.max(...REPORT.scores);
  return (
    <div className={`${s.panel} ${s.p3}${on ? ` ${s.on}` : ''}${run ? ` ${s.run}` : ''}`}>
      <div className={s.d3Status}>
        {on ? (
          <span className={s.d3Done}><CheckCircle size={16} />{REPORT.best} {top.toFixed(1)}</span>
        ) : REPORT.analyzing}
      </div>
      <div className={s.d3Title}>{REPORT.demoTitle}</div>
      <div className={s.d3List}>
        {REPORT.rows.map((r, i) => {
          const best = REPORT.scores[i] >= top;
          const badgeDelay = 300 + i * 80;
          return (
            <div
              className={`${s.d3Row}${best ? ` ${s.best}` : ''}`}
              key={i}
              style={{ transitionDelay: on && best ? `${badgeDelay + 285}ms` : '0ms' }}
            >
              <span className={s.d3Left}>
                <ReportIcon i={i} on={on} />
                <span className={s.d3Label}>{r}</span>
              </span>
              {on ? (
                <span className={`${s.d3Badge}${best ? ` ${s.best}` : ''}`} style={{ animationDelay: `${badgeDelay}ms` }}>
                  {best ? `${REPORT.best} ${REPORT.scores[i].toFixed(1)}` : REPORT.scores[i].toFixed(1)}
                </span>
              ) : <Spinner />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
