'use client';

// 상세 화면 머리 — 프리티풀 퀵매칭 어법(MyDetailHeader) 그대로.
//  · 머리 줄 = 56 흰 줄에 40 둥근 뒤로 버튼(퀵매칭 화살표)만 + 오른쪽 자리. 제목은 그 아래 큰 글씨 24 로 아래→위 페이드.
//  · 스크롤하면 머리 아래 흰 그라데이션 그늘. 마이 PC 오른쪽 칸(DetailPanelBackContext) 안에서는 뒤로 = 칸 닫기.
//  · titleNode(제목 대신 직접 그린 머리 내용)가 있으면 옛처럼 머리 줄 안에 둔다.
import { useRouter } from 'next/navigation';
import { useContext, useEffect, useRef, useState } from 'react';
import { DetailPanelBackContext } from './detail-panel-context';

interface TopBarProps {
  title?: string;
  /** 큰 제목 아래 회색 한 줄 */
  sub?: React.ReactNode;
  titleNode?: React.ReactNode;
  showBack?: boolean;
  rightContent?: React.ReactNode;
  transparent?: boolean;
}

/** 퀵매칭 뒤로 화살표(public/quick-match/icons/back.svg)를 글자색으로 칠한다 */
function BackIcon() {
  return (
    <i
      aria-hidden="true"
      className="block h-[26px] w-[26px] bg-[#191F28]"
      style={{
        WebkitMaskImage: 'url(/quick-match/icons/back.svg)',
        maskImage: 'url(/quick-match/icons/back.svg)',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  );
}

export default function TopBar({ title, sub, titleNode, showBack = true, rightContent, transparent = false }: TopBarProps) {
  const router = useRouter();
  const closePanel = useContext(DetailPanelBackContext);
  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // 스크롤하면 머리 아래 그늘 — 창이 아니라 칸(마이 PC 오른쪽 칸)이 스크롤될 수도 있어 가장 가까운 스크롤 칸을 본다
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    let scroller: HTMLElement | Window = window;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const oy = getComputedStyle(p).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) { scroller = p; break; }
    }
    const read = () => setScrolled((scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop) > 4);
    scroller.addEventListener('scroll', read, { passive: true });
    return () => scroller.removeEventListener('scroll', read);
  }, []);

  return (
    <>
      <header
        ref={headerRef}
        className={`qd-header ${closePanel ? 'in-panel' : ''} ${scrolled ? 'is-scrolled' : ''}`}
        style={transparent ? { background: 'transparent' } : undefined}
      >
        {showBack && (
          <button
            type="button"
            onClick={() => { if (closePanel) closePanel(); else router.back(); }}
            className="qd-back"
            aria-label="뒤로 가기"
            title="뒤로 가기"
          >
            <BackIcon />
          </button>
        )}
        {titleNode}
        {rightContent && <div className="ml-auto flex items-center gap-1 pr-2">{rightContent}</div>}
      </header>
      {!titleNode && title && (
        <div className="qd-titlewrap">
          <h1 className="qd-h1 qd-a-title">{title}</h1>
          {sub && <p className="qd-sub qd-a-sub">{sub}</p>}
        </div>
      )}
    </>
  );
}
