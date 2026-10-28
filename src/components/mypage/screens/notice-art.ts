// 공지 카드 그림 — 프리티풀 뉴스룸 카드처럼 공지마다 파스텔 바탕 하나 + 토스 아이콘 하나.
//  · 같은 공지는 늘 같은 바탕(id 해시), 아이콘·태그는 제목 낱말로 고른다(공지에 태그 칸이 없어서).

const BG = ['#FCE3CF', '#D9E8FF', '#DDF3E4', '#FCEFC0', '#E6DDF8', '#FFDCDC', '#D5EEF2', '#F1E6D6'];

const RULES: { re: RegExp; tag: string; icon: string }[] = [
  { re: /이벤트|당첨|경품|선물/, tag: '이벤트', icon: 'gift' },
  { re: /쿠폰|포인트|혜택|할인/, tag: '혜택', icon: 'coin' },
  { re: /점검|업데이트|오류|장애|버전/, tag: '서비스', icon: 'setting' },
  { re: /약관|개정|정책|개인정보/, tag: '정책', icon: 'document' },
  { re: /예약|진료|병원/, tag: '예약', icon: 'calendar-check' },
];

export type NoticeArt = { bg: string; icon: string; tag: string };

export function noticeArt(id: string, title: string): NoticeArt {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const rule = RULES.find((r) => r.re.test(title));
  return { bg: BG[h % BG.length], icon: rule?.icon ?? 'loudspeaker', tag: rule?.tag ?? '안내' };
}

/** '#RRGGBB' → rgba(…, a) */
export function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
