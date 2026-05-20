-- 리뷰 숨기기 컬럼 추가
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- 병원 오너가 소속 리뷰를 숨김 처리할 수 있도록 RLS 정책 추가
DROP POLICY IF EXISTS "hospital_hide_review" ON public.reviews;
CREATE POLICY "hospital_hide_review" ON public.reviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.hospitals h
      WHERE h.id = reviews.hospital_id
      AND h.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hospitals h
      WHERE h.id = reviews.hospital_id
      AND h.owner_id = auth.uid()
    )
  );
