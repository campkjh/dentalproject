export const BOOKING_METHODS = ['앱결제', '현장결제', '상담 후 결제'] as const;
export type BookingMethod = typeof BOOKING_METHODS[number];

export function isBookingMethods(value: unknown): value is BookingMethod[] {
  return Array.isArray(value) && value.length > 0 && value.length <= BOOKING_METHODS.length
    && new Set(value).size === value.length
    && value.every((method) => BOOKING_METHODS.includes(method as BookingMethod));
}

// 기존 병원은 현재 제공 중인 세 방식을 유지한다. 저장 요청 검증에는 사용하지 않는다.
export function getBookingMethods(value: unknown): BookingMethod[] {
  return isBookingMethods(value) ? [...value] : [...BOOKING_METHODS];
}

export function matchesBookingMethod(methods: unknown, selected: string): boolean {
  return selected === '전체' || getBookingMethods(methods).some((method) => method === selected);
}
