-- 0019 비밀 상담글 · 비밀 댓글 · 의사 전용 게시판 읽기 막기 (261101)
--  · posts.is_secret    : 고객 질문(question)을 비밀로 — 글쓴이 본인 + 의사(관리자)만 읽는다
--  · comments.is_secret : 비밀 댓글 — 댓글 쓴이 본인 + 그 글의 작성자(관리자)만 읽는다
--  · 자유·과별(free·dental) 게시판은 의사·관리자만 읽는다(앱 API 에서도 거르지만 DB 에서도 막는다)
-- Supabase SQL 편집기에서 한 번 실행. 여러 번 실행해도 안전.

alter table public.posts    add column if not exists is_secret boolean not null default false;
alter table public.comments add column if not exists is_secret boolean not null default false;

-- 지금 사람이 의사 또는 관리자인지(정책 안에서 profiles 를 다시 읽을 때 재귀·권한 문제를 피하려 definer 함수로)
create or replace function public.viewer_is_doctor_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_doctor or p.is_admin));
$$;

drop policy if exists "read_all_posts" on public.posts;
drop policy if exists "read_visible_posts" on public.posts;
create policy "read_visible_posts" on public.posts
  for select using (
    author_id = auth.uid()
    or public.viewer_is_doctor_or_admin()
    or (board_type = 'question' and not is_secret)
  );

drop policy if exists "read_all_comments" on public.comments;
drop policy if exists "read_visible_comments" on public.comments;
create policy "read_visible_comments" on public.comments
  for select using (
    author_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    or (
      not is_secret
      and exists (select 1 from public.posts po where po.id = comments.post_id) -- 글을 볼 수 있어야 댓글도(위 posts 정책을 따른다)
    )
    or (is_secret and exists (select 1 from public.posts po where po.id = comments.post_id and po.author_id = auth.uid()))
  );
