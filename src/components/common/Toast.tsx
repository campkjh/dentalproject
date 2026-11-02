'use client';

// 시스템 안내(토스트) — 프리티풀 말풍선 결(261031): 흰 유리 알약 + 넓게 퍼지는 그림자 · 왼쪽 토스 컬러 아이콘 ·
// 머리 줄 아래에서 톡 튀어 내려오고(정비율 팝 + 흐림→선명) 사라질 땐 위로 빠진다. 누르면 바로 닫힌다.
// 아이콘은 문구로 고른다 — 실패·거부·오류=빨강 느낌표 · 확인 필요=노랑 · 했어요·완료=파랑 체크 · 그 밖=파랑 안내.
import { useStore } from '@/store';
import { toneOfMessage } from '@/lib/haptics';

const TOAST_ICONS = {
  error: '/icons/color/warning-red.svg',
  warning: '/icons/color/exclamation-yellow.svg',
  success: '/icons/color/check-circle.svg',
  info: '/icons/color/info-blue.svg',
} as const;

function toastIcon(msg: string) {
  return TOAST_ICONS[toneOfMessage(msg)];
}

export default function Toast() {
  const toast = useStore((s) => s.toast);
  const toastKey = useStore((s) => s.toastKey);
  const leaving = useStore((s) => s.toastLeaving);
  const hideToast = useStore((s) => s.hideToast);
  if (!toast) return null;

  return (
    <div className="sys-toast-wrap" role="status" aria-live="polite">
      <button key={toastKey} type="button" className={`sys-toast${leaving ? ' is-leaving' : ''}`} onClick={hideToast}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={toastIcon(toast)} alt="" width={24} height={24} className="sys-toast-ic" />
        <span className="sys-toast-text">{toast}</span>
      </button>
    </div>
  );
}
