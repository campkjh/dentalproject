// 일시 표기 — 스토어 값은 toLocaleString('ko-KR')('2026. 10. 28. 오후 3:00:00') 이라 프리티풀 채팅방 일정처럼 '26년 10월 28일 (수) 오후 3:00' 로 다듬는다.
// 모양이 다르면(옛 데이터) 그대로 보여 준다.
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
export function formatWhen(value?: string | null) {
  const raw = (value || '').trim();
  if (!raw) return '';
  const m = raw.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?(?:\s*(오전|오후)\s*(\d{1,2}):(\d{2}))?/);
  if (!m) return raw;
  const [, y, mo, d, ampm, h, mi] = m;
  const day = new Date(Number(y), Number(mo) - 1, Number(d)).getDay();
  const date = `${y.slice(2)}년 ${Number(mo)}월 ${Number(d)}일 (${WEEKDAYS[day]})`;
  return ampm ? `${date} ${ampm} ${Number(h)}:${mi}` : date;
}

