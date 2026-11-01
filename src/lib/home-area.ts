// 홈 지역 거르기(261101) — 머리 '서초구 ⌄' 를 누르면 그 지역 병원(과 그 병원 상품)만 보인다.
//  · 병원 지역 = 주소 앞 두 마디('서울 서초구 강남대로 399' → 서울 · 서초구). '서울특별시'·'광주광역시' 는 '서울'·'광주' 로 맞춘다.
//  · 내 위치 = 브라우저 좌표 → 가장 가까운 서울 구(구청 좌표) 또는 큰 도시. 병원 좌표가 DB 에 없고 네이버 역지오코딩은
//    이 키로 막혀 있어(403) 대략 판정만 한다.

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

// 서울 25개 구 — 구청 좌표(대략)
const SEOUL_GU: Array<[string, number, number]> = [
  ['강남구', 37.5172, 127.0473], ['강동구', 37.5301, 127.1238], ['강북구', 37.6396, 127.0257], ['강서구', 37.5509, 126.8495],
  ['관악구', 37.4784, 126.9516], ['광진구', 37.5385, 127.0823], ['구로구', 37.4954, 126.8874], ['금천구', 37.4569, 126.8955],
  ['노원구', 37.6542, 127.0568], ['도봉구', 37.6688, 127.0471], ['동대문구', 37.5744, 127.04], ['동작구', 37.5124, 126.9393],
  ['마포구', 37.5663, 126.9019], ['서대문구', 37.5791, 126.9368], ['서초구', 37.4837, 127.0324], ['성동구', 37.5633, 127.0371],
  ['성북구', 37.5894, 127.0167], ['송파구', 37.5145, 127.1059], ['양천구', 37.517, 126.8665], ['영등포구', 37.5264, 126.8962],
  ['용산구', 37.5324, 126.9907], ['은평구', 37.6027, 126.9291], ['종로구', 37.5735, 126.979], ['중구', 37.5641, 126.9979],
  ['중랑구', 37.6066, 127.0927],
];

// 서울 밖 — 광역시는 도시 단위, 도는 큰 시 단위(주소 둘째 마디와 맞춘다)
const CITIES: Array<{ label: string; city: string; district: string | null; lat: number; lng: number }> = [
  { label: '부산', city: '부산', district: null, lat: 35.1796, lng: 129.0756 },
  { label: '대구', city: '대구', district: null, lat: 35.8714, lng: 128.6014 },
  { label: '인천', city: '인천', district: null, lat: 37.4563, lng: 126.7052 },
  { label: '광주', city: '광주', district: null, lat: 35.1595, lng: 126.8526 },
  { label: '대전', city: '대전', district: null, lat: 36.3504, lng: 127.3845 },
  { label: '울산', city: '울산', district: null, lat: 35.5384, lng: 129.3114 },
  { label: '세종', city: '세종', district: null, lat: 36.48, lng: 127.289 },
  { label: '수원시', city: '경기', district: '수원시', lat: 37.2636, lng: 127.0286 },
  { label: '성남시', city: '경기', district: '성남시', lat: 37.42, lng: 127.1265 },
  { label: '고양시', city: '경기', district: '고양시', lat: 37.6584, lng: 126.832 },
  { label: '용인시', city: '경기', district: '용인시', lat: 37.2411, lng: 127.1776 },
  { label: '부천시', city: '경기', district: '부천시', lat: 37.5034, lng: 126.766 },
  { label: '안양시', city: '경기', district: '안양시', lat: 37.3943, lng: 126.9568 },
  { label: '청주시', city: '충북', district: '청주시', lat: 36.6424, lng: 127.489 },
  { label: '천안시', city: '충남', district: '천안시', lat: 36.8151, lng: 127.1139 },
  { label: '전주시', city: '전북', district: '전주시', lat: 35.8242, lng: 127.148 },
  { label: '창원시', city: '경남', district: '창원시', lat: 35.228, lng: 128.6811 },
  { label: '포항시', city: '경북', district: '포항시', lat: 36.019, lng: 129.3435 },
  { label: '춘천시', city: '강원', district: '춘천시', lat: 37.8813, lng: 127.7298 },
  { label: '제주', city: '제주', district: null, lat: 33.4996, lng: 126.5312 },
];

/** 좌표 → 대략 지역. 서울 안이면 가장 가까운 구, 아니면 30km 안의 큰 도시, 그것도 없으면 null */
export function detectNearArea(lat: number, lng: number): NearArea | null {
  const inSeoul = lat > 37.41 && lat < 37.72 && lng > 126.76 && lng < 127.19;
  if (inSeoul) {
    let best = SEOUL_GU[0];
    let min = Infinity;
    for (const gu of SEOUL_GU) {
      const d = Math.hypot(lat - gu[1], lng - gu[2]);
      if (d < min) { min = d; best = gu; }
    }
    return { label: best[0], city: '서울', district: best[0] };
  }
  let near: (typeof CITIES)[number] | null = null;
  let min = Infinity;
  for (const c of CITIES) {
    const d = Math.hypot(lat - c.lat, lng - c.lng);
    if (d < min) { min = d; near = c; }
  }
  if (!near || min > 0.3) return null;
  return { label: near.label, city: near.city, district: near.district };
}
