const provinces: Record<string, string[]> = {
  서울: ['서울', '서울특별시'], 경기: ['경기', '경기도'], 인천: ['인천', '인천광역시'],
  부산: ['부산', '부산광역시'], 대구: ['대구', '대구광역시'], 대전: ['대전', '대전광역시'],
  광주: ['광주', '광주광역시'], 울산: ['울산', '울산광역시'], 세종: ['세종', '세종특별자치시'],
  강원: ['강원', '강원도', '강원특별자치도'], 충북: ['충북', '충청북도'], 충남: ['충남', '충청남도'],
  전북: ['전북', '전라북도', '전북특별자치도'], 전남: ['전남', '전라남도'],
  경북: ['경북', '경상북도'], 경남: ['경남', '경상남도'], 제주: ['제주', '제주도', '제주특별자치도'],
};

export function matchesSearchRegion(address: string, selected: string[]) {
  if (!selected.length) return true;
  const normalized = address.trim().replace(/\s+/g, ' ');
  return selected.some(entry => {
    const [province, ...parts] = entry.trim().split(/\s+/);
    const aliases = provinces[province] ?? [province];
    const inProvince = aliases.some(alias => normalized === alias || normalized.startsWith(`${alias} `));
    if (!inProvince) return false;
    const district = parts.join(' ');
    if (!district || district === '전체') return true;
    return normalized.includes(district) || normalized.split(' ').some(token => token.replace(/[시군구]$/, '') === district.replace(/[시군구]$/, ''));
  });
}
