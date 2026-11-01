-- 리뷰어 팔로우(261101) — 리뷰 카드 프로필을 누르면 열리는 /user/[id] 의 팔로우 버튼.
-- 숫자(팔로워·팔로잉)는 서버(API)가 관리자 키로 센다. 브라우저 직접 접근은 내 행만.
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX IF NOT EXISTS user_follows_following_idx ON public.user_follows(following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON public.user_follows(follower_id, created_at DESC);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_follows_select_own ON public.user_follows;
CREATE POLICY user_follows_select_own ON public.user_follows FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);
DROP POLICY IF EXISTS user_follows_insert_own ON public.user_follows;
CREATE POLICY user_follows_insert_own ON public.user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS user_follows_delete_own ON public.user_follows;
CREATE POLICY user_follows_delete_own ON public.user_follows FOR DELETE USING (auth.uid() = follower_id);
