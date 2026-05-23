-- Customer home carousel banners managed from /admin/banners.

create extension if not exists "uuid-ossp";

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create table if not exists public.home_banners (
  id               uuid primary key default uuid_generate_v4(),
  title            text not null,
  subtitle         text,
  image_url        text not null,
  mobile_image_url text,
  target_url       text,
  badge_text       text,
  sort_order       integer not null default 0,
  is_active        boolean not null default true,
  starts_at        timestamptz,
  ends_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_home_banners_visible
  on public.home_banners(is_active, sort_order, starts_at, ends_at);

drop trigger if exists trg_touch_updated_at on public.home_banners;
create trigger trg_touch_updated_at before update on public.home_banners
  for each row execute function public.touch_updated_at();

alter table public.home_banners enable row level security;

drop policy if exists "read_visible_home_banners" on public.home_banners;
create policy "read_visible_home_banners" on public.home_banners
  for select using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists "admin_manage_home_banners" on public.home_banners;
create policy "admin_manage_home_banners" on public.home_banners
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

insert into public.home_banners (
  title,
  subtitle,
  image_url,
  target_url,
  badge_text,
  sort_order,
  is_active
)
select *
from (values
  (
    '리쥬란 정품인증 안심 시술의 시작',
    'REJURAN',
    '/home-banners/rejuran-certified.png',
    '/search',
    '제휴',
    0,
    true
  ),
  (
    '전문의 시술 이벤트 한 번에 확인하세요',
    '원하는 시술 이벤트 쉽게 찾아보세요',
    '/home-banners/specialist-event.png',
    '/search',
    '이벤트',
    1,
    true
  ),
  (
    '고객들이 선택한 5월 고객평가 우수병원',
    '상담부터 시술 결과까지, 오직 고객 후기로만',
    '/home-banners/review-awards.png',
    '/search',
    '우수병원',
    2,
    true
  ),
  (
    '첫방문 체험가 이벤트만 모았어요',
    '첫방문 뱃지를 확인하세요',
    '/home-banners/first-visit.png',
    '/search',
    '첫방문',
    3,
    true
  )
) as seed(title, subtitle, image_url, target_url, badge_text, sort_order, is_active)
where not exists (select 1 from public.home_banners);
