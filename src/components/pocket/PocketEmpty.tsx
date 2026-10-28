'use client';

// 포켓 빈 화면 — 사장 시안: 위는 은은한 하늘빛 그라데이션(왼쪽 위 흰 빛 번짐) 위에 장바구니 · 체크 동전 · 유리 동전,
//  아래로 갈수록 흰 바탕으로 녹아 제목 · 부제 · 둘러보기 버튼.
//  인터랙션(은은하게): 들어올 때 장바구니는 오른쪽에서 미끄러져 들어오고 동전은 톡 떠오른다 → 이후 각자 다른 박자로 둥실,
//  손가락·마우스를 움직이면 겹마다 조금씩 다르게 따라 기울어진다(깊이감). 움직임 줄이기면 모두 멈춘 그림.
import { useRef } from 'react';
import Link from 'next/link';
import styles from './pocket-empty.module.css';

export default function PocketEmpty({ title, sub, href = '/', cta = '시술 둘러보기' }: { title: string; sub: string; href?: string; cta?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // 손 위치 → -1~1 값을 CSS 변수로(겹마다 다른 깊이로 옮긴다)
  const move = (x: number, y: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', String(Math.max(-1, Math.min(1, ((x - r.left) / r.width) * 2 - 1))));
    el.style.setProperty('--py', String(Math.max(-1, Math.min(1, ((y - r.top) / r.height) * 2 - 1))));
  };
  const reset = () => {
    ref.current?.style.setProperty('--px', '0');
    ref.current?.style.setProperty('--py', '0');
  };

  return (
    <div
      ref={ref}
      className={styles.wrap}
      onPointerMove={(e) => move(e.clientX, e.clientY)}
      onPointerLeave={reset}
    >
      <div className={styles.stage} aria-hidden>
        <span className={styles.glow} />
        <span className={`${styles.layer} ${styles.glassCoin}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pocket/glass-coin.webp" alt="" draggable={false} />
        </span>
        <span className={`${styles.layer} ${styles.cart}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pocket/cart.webp" alt="" draggable={false} />
        </span>
        <span className={styles.cartShadow} />
        <span className={`${styles.layer} ${styles.checkCoin}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pocket/check-coin.webp" alt="" draggable={false} />
        </span>
      </div>
      <div className={styles.copy}>
        <p className={styles.title}>{title}</p>
        <p className={styles.sub}>{sub}</p>
        <Link href={href} className={styles.cta}>
          {cta}
        </Link>
      </div>
    </div>
  );
}
