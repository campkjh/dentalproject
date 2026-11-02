// 의료진 이력(261102) — doctors.careers(text[]) 한 칸에 칸 이름을 앞에 붙여 담는다: '[학력] 고려대학교 학사'.
//  · 칸 이름 없는 옛 항목은 '경력'으로 본다(이미 들어 있던 careers 그대로 보임) — 새 DB 칸 없이.
//  · 입력 = 병원 파트너 프로필 수정(칸마다 한 줄에 하나), 표시 = 의사 상세 '의사 소개'.
export const CAREER_SECTIONS = [
  { key: 'education', label: '학력', placeholder: '고려대학교 학사\n고려대학교 임상치의학대학원 치의학 석사' },
  { key: 'training', label: '자격 및 수련', placeholder: '보건복지부 인증 통합치의학과 전문의\n서울중앙보훈병원 치과병원 통합치의학과 전공의 수련' },
  { key: 'society', label: '학회 및 인증', placeholder: '국제임플란트학회(ITI) 정회원\n대한치과보철학회 인증 우수보철치과의사' },
  { key: 'career', label: '경력', placeholder: '前 OO치과 원장\nOO대학교 치과병원 외래교수' },
] as const;

export type CareerSectionKey = (typeof CAREER_SECTIONS)[number]['key'];
export type CareerSections = Record<CareerSectionKey, string[]>;

const MAX_ITEMS = 40;
const MAX_LEN = 120;

const PREFIX = /^\[([^\]]+)\]\s*/;

export function emptyCareerSections(): CareerSections {
  return { education: [], training: [], society: [], career: [] };
}

/** careers → 칸별 목록(칸 이름 없는 항목 = 경력) */
export function parseCareers(careers: readonly string[] | null | undefined): CareerSections {
  const out = emptyCareerSections();
  for (const raw of careers ?? []) {
    if (typeof raw !== 'string') continue;
    const m = raw.match(PREFIX);
    const section = m ? CAREER_SECTIONS.find((s) => s.label === m[1]) : undefined;
    const text = (section ? raw.slice(m![0].length) : raw).trim();
    if (text) out[section?.key ?? 'career'].push(text);
  }
  return out;
}

/** 칸별 목록 → careers(경력은 칸 이름 없이 — 옛 화면에도 그대로 읽힌다) */
export function encodeCareers(sections: Partial<Record<CareerSectionKey, readonly string[]>>): string[] {
  const out: string[] = [];
  for (const s of CAREER_SECTIONS) {
    for (const item of sections[s.key] ?? []) {
      const text = item.trim().slice(0, MAX_LEN);
      if (text) out.push(s.key === 'career' ? text : `[${s.label}] ${text}`);
    }
  }
  return out.slice(0, MAX_ITEMS);
}

/** 서버 — 들어온 careers 를 문자열 목록으로 다듬는다(빈 줄·너무 긴 줄·너무 많은 줄 정리) */
export function sanitizeCareers(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim().slice(0, MAX_LEN + 12))
    .filter(Boolean)
    .slice(0, MAX_ITEMS);
}
