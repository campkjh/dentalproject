-- ① 조회수 원자적 증가 (SECURITY DEFINER: RLS 우회)
CREATE OR REPLACE FUNCTION public.increment_view_count(p_post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.posts SET view_count = view_count + 1 WHERE id = p_post_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO anon, authenticated;

-- ② 의사 답변 카운트 자동 동기화 트리거
CREATE OR REPLACE FUNCTION public.update_doctor_answer_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.author_id AND is_doctor = true) THEN
      UPDATE posts
        SET has_answer  = true,
            answer_count = answer_count + 1
        WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM profiles WHERE id = OLD.author_id AND is_doctor = true) THEN
      UPDATE posts
        SET answer_count = GREATEST(0, answer_count - 1),
            has_answer   = (answer_count - 1 > 0)
        WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_doctor_answer_count ON public.comments;
CREATE TRIGGER trg_doctor_answer_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_doctor_answer_count();
