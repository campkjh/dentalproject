'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type RefObject } from 'react';
import { OrbDemo, ReportDemo, SatisfactionDemo } from './ReviewShowcase.parts';
import s from './ReviewShowcase.module.css';

/*
 * 상품 상세 '시술 후기' 칸 — 후기를 못 볼 때(로그인 전 · 후기 없음) 보여 주는 쇼케이스.
 * 프리티풀 비즈 '카드 3장' 장면(SceneMatch)의 모양 · 움직임을 그대로 옮기고 글자만 시술 후기로 바꿨다.
 *  - 카드 3장 줄이 화면에 닿으면 차례로 떠오르고, 각 카드 속 데모는 화면 안에 있을 때만 돈다.
 *  - 마우스 기기는 올리면 결과 상태로, 터치 기기는 화면 안에서 '분석 중 ↔ 결과'를 저절로 오간다(언급 키워드 판은 제 등장만).
 *  - 줄인 움직임 설정이면 처음부터 완성 상태로 멈춘다.
 * 데모 숫자는 예시 그림이라 카드마다 '예시 화면' 표시를 붙인다.
 * 가로 줄은 부모 옆 여백(기본 20px, 상품 상세 px-5)만큼 바깥으로 넓힌다 — 다르면 style 의 --gut 로 맞춘다.
 */

type Props = {
  /** login = 로그인하면 후기를 볼 수 있음, empty = 아직 후기 없음 */
  mode: 'login' | 'empty';
  /** mode=login 버튼: '3초만에 로그인하고 보기' */
  onLogin?: () => void;
  /** mode=empty 버튼: '첫 후기 남기기'(있을 때만) */
  writeHref?: string;
};

type CardKey = 'sat' | 'orb' | 'report';

const CARDS: { key: CardKey; caption: [string, string] }[] = [
  { key: 'sat', caption: ['실제로 방문한 분들의', '만족도를 모아 보여드려요'] },
  { key: 'orb', caption: ['후기에 자주 나온 말로', '시술 만족 포인트를 한눈에'] },
  { key: 'report', caption: ['시술 전 고민부터 결과까지', '꼼꼼한 후기를 읽어보세요'] },
];

const MESSAGE: Record<Props['mode'], [string, string]> = {
  login: ['로그인하면 실제로 방문한 분들의', '자세한 후기를 모두 볼 수 있어요'],
  empty: ['아직 등록된 후기가 없어요', '시술 후 첫 후기를 남겨 주세요'],
};

/* ── 미디어 조건(서버에선 기본값) ─────────────────────────────── */

function useMedia(query: string, fallback: boolean) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

/** 요소 위 끝이 화면 위에서 line(0~1) 지점을 지나면 한 번 true — 이미 지나 있으면 바로 */
function useFire(ref: RefObject<Element | null>, line: number) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (on) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        if (e.isIntersecting || e.boundingClientRect.bottom < 0) { setOn(true); io.disconnect(); }
      }
    }, { rootMargin: `0px 0px -${Math.round((1 - line) * 100)}% 0px`, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, line, on]);
  return on;
}

/** 화면 안에 있는 동안 true(반복 움직임은 이때만) — 가로 줄 밖으로 밀려난 카드도 false */
function useVisible(ref: RefObject<Element | null>) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setV(e.isIntersecting), { rootMargin: '80px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return v;
}

/* ── 카드 ─────────────────────────────── */

function DemoCard({
  i, kind, caption, still, canHover, hovered, setHover, fired,
}: {
  i: number; kind: CardKey; caption: [string, string]; still: boolean; canHover: boolean; hovered: boolean;
  setHover: (i: number | null) => void; fired: boolean;
}) {
  const visRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const run = useVisible(visRef);
  const [auto, setAuto] = useState(false);

  // 무대 배율 — 원본 모바일 비율(카드 350 일 때 0.645, 패널 아래 모서리가 보이게)
  useEffect(() => {
    const vis = visRef.current, st = stageRef.current;
    if (!vis || !st) return undefined;
    const apply = () => st.style.setProperty('--s', String((vis.clientWidth * 0.645) / 350));
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(vis);
    return () => ro.disconnect();
  }, []);

  // 터치 기기 — 화면 안에서 분석 중 ↔ 결과를 저절로 오간다. 언급 키워드 판은 결과 상태가 따로 없어 안 돌린다
  const cycling = !canHover && !still && run && kind !== 'orb';
  useEffect(() => {
    if (!cycling) return undefined;
    let alive = true;
    let tm = 0;
    const step = (next: boolean) => {
      tm = window.setTimeout(() => {
        if (!alive) return;
        setAuto(next);
        step(!next);
      }, next ? 1800 + i * 300 : 3600);
    };
    step(true);
    return () => { alive = false; window.clearTimeout(tm); setAuto(false); };
  }, [cycling, i]);

  const active = hovered || (cycling && auto);
  const demo = { active, run, still };
  const dl = i * 200;

  return (
    <div
      className={`${s.item}${fired ? ` ${s.on}` : ''}`}
      style={{ '--dl': `${dl}ms` } as CSSProperties}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHover(i); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHover(null); }}
      data-card={kind}
    >
      <div className={s.vis} ref={visRef}>
        <div className={`${s.bg} ${s[`bg${i + 1}`]}`}>
          {i === 0 && <div className={s.bg1Streak} />}
          {i === 1 && <div className={s.bg2Blob} />}
          {i === 2 && <div className={s.bg3Blob} />}
        </div>
        {kind === 'orb' ? (
          // 언급 키워드 판 — 무대 밖(판이 제 폭을 잰다). 카드가 떠오르고 조금 뒤(카드 지연 + 250ms) 판 등장
          <div className={s.orb} aria-hidden>
            <OrbDemo fired={fired} visible={run} still={still} hovered={hovered} delay={dl + 250} />
          </div>
        ) : (
          <div className={s.stage} ref={stageRef} aria-hidden>
            {kind === 'sat' && <SatisfactionDemo {...demo} />}
            {kind === 'report' && <ReportDemo {...demo} />}
          </div>
        )}
        <span className={s.sample}>예시 화면</span>
      </div>
      <h3 className={s.cap}>
        <span>{caption[0]}</span>
        <span>{caption[1]}</span>
      </h3>
    </div>
  );
}

/* ── 본체 ─────────────────────────────── */

export default function ReviewShowcase({ mode, onLogin, writeHref }: Props) {
  const still = useMedia('(prefers-reduced-motion: reduce)', false);
  const canHover = useMedia('(hover: hover) and (pointer: fine)', true);
  const [hoverCard, setHoverCard] = useState<number | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  // 원본 모바일 트리거 선 — 카드 줄 위 끝이 화면 위에서 73% 지점을 지날 때
  const fired = useFire(rowRef, 0.73) || still;
  const msg = MESSAGE[mode];

  return (
    <section className={`${s.root}${still ? ` ${s.still}` : ''}`} aria-label="시술 후기 안내">
      <div className={s.row} ref={rowRef}>
        {CARDS.map((c, i) => (
          <DemoCard
            key={c.key}
            i={i}
            kind={c.key}
            caption={c.caption}
            still={still}
            canHover={canHover}
            hovered={hoverCard === i}
            setHover={setHoverCard}
            fired={fired}
          />
        ))}
      </div>

      <div className={s.foot}>
        <p className={s.msg}>
          <span>{msg[0]}</span>
          <span>{msg[1]}</span>
        </p>
        {mode === 'login' && (
          <button type="button" className={s.btn} onClick={onLogin}>3초만에 로그인하고 보기</button>
        )}
        {mode === 'empty' && writeHref && (
          <Link href={writeHref} className={s.btn}>첫 후기 남기기</Link>
        )}
      </div>
    </section>
  );
}
