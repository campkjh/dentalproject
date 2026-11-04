export function validKoreaCoordinates(lat: unknown, lng: unknown): lat is number {
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= 32 && lat <= 39.5 && lng >= 124 && lng <= 132;
}
