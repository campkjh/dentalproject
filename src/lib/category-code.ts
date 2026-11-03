// 진료과 값 맞추기 — DB 에 코드(dental)·한글(치과)·옛 값(skin)이 섞여 있어 한 코드로 모은다.
// 코드는 categories 테이블 id(= /search?category= 값)와 같다.
import { categories } from '@/lib/mock-data';

const ALIASES: Record<string, string> = {
  dentistry: 'dental',
  'internal-medicine': 'internal',
  pediatrics: 'pediatric',
  paediatrics: 'pediatric',
  'plastic-surgery': 'plastic',
  ophthalmology: 'eye',
  otolaryngology: 'ent',
  orthopedics: 'orthopedic',
  orthopaedics: 'orthopedic',
  'rehabilitation-medicine': 'physical-therapy',
  rehabilitation: 'physical-therapy',
  'obstetrics-and-gynecology': 'obstetrics',
  gynecology: 'obstetrics',
  obgyn: 'obstetrics',
  skin: 'dermatology',
  derma: 'dermatology',
  피부과: 'dermatology',
  피부: 'dermatology',
  치과: 'dental',
  치과의원: 'dental',
  성형외과: 'plastic',
  성형: 'plastic',
  소아청소년과: 'pediatric',
  소아과: 'pediatric',
  산부인과: 'obstetrics',
  비뇨의학과: 'urology',
  비뇨기과: 'urology',
  내과: 'internal',
  안과: 'eye',
  이비인후과: 'ent',
  정형외과: 'orthopedic',
  신경외과: 'neurosurgery',
  정신건강의학과: 'psychiatry',
  정신과: 'psychiatry',
  한의원: 'korean-medicine',
  한의학과: 'korean-medicine',
  한방: 'korean-medicine',
  재활의학과: 'physical-therapy',
  물리치료과: 'physical-therapy',
  영상의학과: 'radiology',
};

const CODES = new Set(categories.map((c) => c.id));
export const CATEGORY_OPTIONS = categories.map(({ id, name }) => ({ value: id, label: name }));

/** 'dental' · '치과' · 'skin' → 'dental' · 'dental' · 'dermatology'. 모르는 값은 null */
export function toCategoryCode(value?: string | null): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  const lower = v.toLowerCase().replace(/[_\s]+/g, '-');
  if (CODES.has(lower)) return lower;
  if (ALIASES[lower]) return ALIASES[lower];
  if (ALIASES[v]) return ALIASES[v];
  const byName = categories.find((c) => c.name === v);
  return byName?.id ?? null;
}

export function categoryLabel(value?: string | null) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  const code = toCategoryCode(value);
  return categories.find((c) => c.id === code)?.name ?? (/[가-힣]/.test(trimmed) ? trimmed : '기타');
}

export function categoryName(name?: string | null, id?: string | null) {
  return categoryLabel(toCategoryCode(name) ?? toCategoryCode(id) ?? name) || '기타';
}

/** 전문의 타이틀은 자유 입력을 보존하고, 진료과 코드로 저장된 경우만 한글로 표시한다. */
export function specialtyLabel(value?: string | null) {
  return toCategoryCode(value) ? categoryLabel(value) : (value ?? '').trim();
}
