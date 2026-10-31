-- 상품 좋아요(261031) — 상세 바닥 하트. 포켓(wishlists)과 별개.
-- 좋아요를 넣고 빼면 products.like_count 를 같이 올리고 내린다(post_likes 트리거와 같은 방식).
CREATE TABLE IF NOT EXISTS public.product_likes (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS product_likes_product_idx ON public.product_likes(product_id);

ALTER TABLE public.product_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_likes_select_own ON public.product_likes;
CREATE POLICY product_likes_select_own ON public.product_likes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS product_likes_insert_own ON public.product_likes;
CREATE POLICY product_likes_insert_own ON public.product_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS product_likes_delete_own ON public.product_likes;
CREATE POLICY product_likes_delete_own ON public.product_likes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_product_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products SET like_count = like_count + 1 WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_like_count ON public.product_likes;
CREATE TRIGGER trg_sync_product_like_count
  AFTER INSERT OR DELETE ON public.product_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_like_count();
