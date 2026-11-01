-- 커뮤니티 글 포켓(261101) — 상품 포켓(wishlists)처럼 마음에 드는 글을 담아 둔다. 포켓 화면 '커뮤니티' 탭.
-- 본인 행만 보고 넣고 뺀다(wishlists 의 own_wishlist 와 같은 결). 열람 판정(의사 라운지·비밀글)은 API 가 한 번 더 거른다.
CREATE TABLE IF NOT EXISTS public.post_pockets (
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id    uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS post_pockets_user_created_idx ON public.post_pockets(user_id, created_at DESC);

ALTER TABLE public.post_pockets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS post_pockets_select_own ON public.post_pockets;
CREATE POLICY post_pockets_select_own ON public.post_pockets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS post_pockets_insert_own ON public.post_pockets;
CREATE POLICY post_pockets_insert_own ON public.post_pockets FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS post_pockets_delete_own ON public.post_pockets;
CREATE POLICY post_pockets_delete_own ON public.post_pockets FOR DELETE USING (auth.uid() = user_id);
