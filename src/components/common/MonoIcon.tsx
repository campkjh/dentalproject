// 토스 흑백 아이콘(public/icons/mono, 사장 제공 261031) — 마스크로 칠해 색을 고른다.
export default function MonoIcon({ name, size = 20, color = '#4E5968', className = '' }: { name: string; size?: number; color?: string; className?: string }) {
  const url = `url(/icons/mono/${name}.svg)`;
  return (
    <i
      aria-hidden
      className={`inline-block shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: color, WebkitMaskImage: url, maskImage: url, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }}
    />
  );
}
