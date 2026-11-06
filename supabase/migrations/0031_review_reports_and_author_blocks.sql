-- 신고와 개인별 리뷰 작성자 차단을 실제로 저장한다.
CREATE TABLE public.review_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
 reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 500),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved','rejected')),
 resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 resolved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(review_id,reporter_id)
);
CREATE INDEX review_reports_status_created ON public.review_reports(status,created_at DESC);
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_reports FROM anon, authenticated;
GRANT SELECT, INSERT ON public.review_reports TO authenticated;
GRANT ALL ON public.review_reports TO service_role;
CREATE POLICY review_reports_read_own ON public.review_reports FOR SELECT TO authenticated USING(reporter_id=auth.uid());
CREATE POLICY review_reports_insert_own ON public.review_reports FOR INSERT TO authenticated WITH CHECK(
 reporter_id=auth.uid() AND EXISTS(SELECT 1 FROM public.reviews r WHERE r.id=review_id AND r.author_id IS DISTINCT FROM auth.uid() AND NOT coalesce(r.hidden,false))
);

CREATE TABLE public.review_author_blocks (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 blocked_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,blocked_user_id),
 CHECK(user_id<>blocked_user_id)
);
ALTER TABLE public.review_author_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_author_blocks FROM anon, authenticated;
-- 리뷰 조회 정책이 이 표를 참조하므로 anon에도 SELECT 권한은 필요하지만 RLS로 모든 행을 숨긴다.
GRANT SELECT ON public.review_author_blocks TO anon;
GRANT SELECT, INSERT, DELETE ON public.review_author_blocks TO authenticated;
GRANT ALL ON public.review_author_blocks TO service_role;
CREATE POLICY review_author_blocks_read_own ON public.review_author_blocks FOR SELECT USING(user_id=auth.uid());
CREATE POLICY review_author_blocks_insert_own ON public.review_author_blocks FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
CREATE POLICY review_author_blocks_delete_own ON public.review_author_blocks FOR DELETE TO authenticated USING(user_id=auth.uid());
-- 기존 공개 조회 정책과 AND로 적용한다. 다른 고객의 화면이나 원본 리뷰는 변경하지 않는다.
CREATE POLICY reviews_respect_author_blocks ON public.reviews AS RESTRICTIVE FOR SELECT USING(
 NOT coalesce(hidden,false) AND (auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.review_author_blocks b WHERE b.user_id=auth.uid() AND b.blocked_user_id=reviews.author_id))
);
