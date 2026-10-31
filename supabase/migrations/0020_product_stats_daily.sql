-- 0020 상품 인사이트(261101) — 상품별·날짜별(한국 날짜) 노출 수·조회 수
--  · 노출 = 목록에서 상품 카드가 화면에 절반 이상 보인 것(같은 사람·같은 상품은 하루 한 번)
--  · 조회 = 상품 상세를 연 것(같은 사람·같은 상품은 하루 한 번)
--  · 쓰기는 track_product_stats() 로만(한 번에 60개까지), 읽기는 서버(관리자 키)에서만 — 표에는 정책이 없다
create table if not exists public.product_stats_daily (
  product_id  uuid not null references public.products(id) on delete cascade,
  day         date not null,
  impressions integer not null default 0,
  views       integer not null default 0,
  primary key (product_id, day)
);
create index if not exists product_stats_daily_day_idx on public.product_stats_daily(day);
alter table public.product_stats_daily enable row level security;

create or replace function public.track_product_stats(p_impressions uuid[], p_views uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'Asia/Seoul')::date;
begin
  insert into public.product_stats_daily (product_id, day, impressions, views)
  select x.id, d, sum(x.imp)::int, sum(x.vw)::int
  from (
    select unnest((coalesce(p_impressions, '{}'))[1:60]) as id, 1 as imp, 0 as vw
    union all
    select unnest((coalesce(p_views, '{}'))[1:60]), 0, 1
  ) x
  where exists (select 1 from public.products p where p.id = x.id)
  group by x.id
  on conflict (product_id, day) do update
    set impressions = public.product_stats_daily.impressions + excluded.impressions,
        views       = public.product_stats_daily.views + excluded.views;
end;
$$;
revoke all on function public.track_product_stats(uuid[], uuid[]) from public;
grant execute on function public.track_product_stats(uuid[], uuid[]) to anon, authenticated;
