import { areaLabel, areaOfAddress, type NearArea } from './home-area';

/** Read administrative areas from the map service, never infer a district from its office. */
export function regionFromReverseGeocode(value: unknown): NearArea | null {
  const data = value as { status?: { code?: number }; results?: { region?: { area1?: { name?: string }; area2?: { name?: string } } }[] };
  if (data?.status?.code !== 0) return null;
  for (const result of data.results ?? []) {
    const province = result.region?.area1?.name;
    const district = result.region?.area2?.name;
    if (!province) continue;
    const area = areaOfAddress(`${province} ${district ?? ''}`);
    if (area) return { ...area, label: areaLabel(area) };
  }
  return null;
}

export function validKoreaCoordinates(lat: unknown, lng: unknown): lat is number {
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= 32 && lat <= 39.5 && lng >= 124 && lng <= 132;
}
