-- 기존 병원의 예약/결제 제공 방식을 유지하는 추가 설정이다.
ALTER TABLE public.hospitals
  ADD COLUMN booking_methods text[] NOT NULL
  DEFAULT ARRAY['앱결제', '현장결제', '상담 후 결제']::text[];

ALTER TABLE public.hospitals ADD CONSTRAINT hospitals_booking_methods_valid
  CHECK (
    cardinality(booking_methods) BETWEEN 1 AND 3
    AND booking_methods <@ ARRAY['앱결제', '현장결제', '상담 후 결제']::text[]
    AND array_position(booking_methods, NULL) IS NULL
    AND NOT (booking_methods[1] = booking_methods[2])
    AND NOT (booking_methods[1] = booking_methods[3])
    AND NOT (booking_methods[2] = booking_methods[3])
  );
