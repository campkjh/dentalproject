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
select
  '미리 여름, 먼저 준비하고 즐기자',
  '강남언니 단독가 + 최대 49% 할인',
  '/home-banners/summer-2026.png',
  '/search',
  '최대 49%',
  0,
  true
where not exists (select 1 from public.home_banners);
