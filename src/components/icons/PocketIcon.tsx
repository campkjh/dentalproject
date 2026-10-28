// 포켓(장바구니) 가방 아이콘 — 사장 견본(토스 쇼핑 카드 오른쪽 아래 가방) 모양 그대로:
//  둥근 손잡이 반원 + 위는 살짝 좁고 아래로 조금 벌어지며 아래 모서리가 크게 둥근 몸통 · 굵은 둥근 선.
//  filled = 몸통을 채운다(선택된 탭·담긴 상품). 색은 currentColor.
export function PocketIcon({
  size = 24,
  filled = false,
  strokeWidth = 1.9,
  className,
  style,
}: {
  size?: number | string;
  filled?: boolean;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <path
        d="M6.4 9h11.2a1.2 1.2 0 0 1 1.19 1.05l1.11 7.55a3 3 0 0 1-2.97 3.4H7.07a3 3 0 0 1-2.97-3.4l1.11-7.55A1.2 1.2 0 0 1 6.4 9z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path d="M8.6 9V7.6a3.4 3.4 0 0 1 6.8 0V9" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}
