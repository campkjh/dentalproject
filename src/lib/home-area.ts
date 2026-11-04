// 병원 주소를 홈·검색 지역 필터와 같은 시·군·구 이름으로 정규화한다.

export type HospitalArea = { city: string; district: string | null };

/** 고른 지역 — 'near' = 내 위치, 'all' = 전체, 그 밖엔 'city|district' */
export type AreaChoice = 'near' | 'all' | string;

export type NearArea = { label: string; city: string; district: string | null };

const CITY_ALIASES: Record<string, string> = {
  서울특별시: '서울', 서울시: '서울',
  부산광역시: '부산', 부산시: '부산',
  대구광역시: '대구', 대구시: '대구',
  인천광역시: '인천', 인천시: '인천',
  광주광역시: '광주', 광주시: '광주',
  대전광역시: '대전', 대전시: '대전',
  울산광역시: '울산', 울산시: '울산',
  세종특별자치시: '세종', 세종시: '세종',
  경기도: '경기', 강원도: '강원', 강원특별자치도: '강원',
  충청북도: '충북', 충청남도: '충남', 전라북도: '전북', 전북특별자치도: '전북', 전라남도: '전남',
  경상북도: '경북', 경상남도: '경남', 제주특별자치도: '제주', 제주도: '제주',
};

export function areaOfAddress(address?: string | null): HospitalArea | null {
  const tokens = (address ?? '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const city = CITY_ALIASES[tokens[0]] ?? tokens[0];
  const second = tokens[1] ?? '';
  const district = /(구|군|시)$/.test(second) ? second : null;
  return { city, district };
}

export function areaKey(area: HospitalArea) {
  return `${area.city}|${area.district ?? ''}`;
}

/** 메뉴·머리에 쓰는 이름 — 서울은 구만('서초구'), 다른 곳은 도시까지('광주 남구') */
export function areaLabel(area: HospitalArea) {
  if (!area.district) return area.city;
  return area.city === '서울' ? area.district : `${area.city} ${area.district}`;
}

export function parseAreaKey(key: string): HospitalArea {
  const [city, district] = key.split('|');
  return { city, district: district || null };
}

export function hospitalInArea(address: string | null | undefined, target: { city: string; district: string | null }) {
  const area = areaOfAddress(address);
  if (!area || area.city !== target.city) return false;
  return !target.district || area.district === target.district;
}

export function catalogForArea<P extends { hospitalId: string }, H extends { id: string; address?: string | null }>(
  products: P[], hospitals: H[], target: HospitalArea | null,
) {
  if (!target) return { products, hospitals, ids: null };
  const matching = hospitals.filter(hospital => hospitalInArea(hospital.address, target));
  const ids = new Set(matching.map(hospital => hospital.id));
  return { products: products.filter(product => ids.has(product.hospitalId)), hospitals: matching, ids };
}
