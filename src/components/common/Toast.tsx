'use client';

// 시스템 안내(토스트) — 프리티풀 말풍선 결(261031): 흰 유리 알약 + 넓게 퍼지는 그림자 · 왼쪽 토스 컬러 아이콘 ·
// 머리 줄 아래에서 톡 튀어 내려오고(정비율 팝 + 흐림→선명) 사라질 땐 위로 빠진다. 누르면 바로 닫힌다.
// 아이콘은 문구로 고른다 — 실패·거부·오류=빨강 느낌표 · 확인 필요=노랑 · 했어요·완료=파랑 체크 · 그 밖=파랑 안내.
import { useStore } from '@/store';

function toastIcon(msg: string) {
  if (/실패|거부|오류|에러|못했|못 했|없어요|안 돼|안돼|만료|제한/.test(msg)) return '/icons/color/warning-red.svg';
  if (/해 주세요|해주세요|확인해|입력해|골라|선택해|필요/.test(msg)) return '/icons/color/exclamation-yellow.svg';
  if (/했어요|됐어요|되었|완료|복사|담았|저장|보냈|등록/.test(msg)) return '/icons/color/check-circle.svg';
  return '/icons/color/info-blue.svg';
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
