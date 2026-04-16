-- =========================================================================
-- 키닥터 (Key Doctor) — Supabase schema
-- Run in Supabase SQL Editor (or `supabase db push` via CLI).
-- =========================================================================

-- Extensions ---------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================================================================
-- 1. Profiles (extends auth.users) — replaces the mock User
-- =========================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default '',
  phone         text,
  login_type    text check (login_type in ('kakao', 'apple', 'email')),
  gender        text,
  birth_year    text,
  country       text default '대한민국',
  profile_image text,
  points        integer not null default 0,
  is_doctor     boolean not null default false,
  doctor_id     uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_profiles_is_doctor on public.profiles(is_doctor);

-- Auto-create a profile row when a new auth.users row is inserted
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, login_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_app_meta_data ->> 'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- 2. Categories
-- =========================================================================
create table if not exists public.categories (
  id         text primary key,
  name       text not null,
  icon       text,
  popular    boolean not null default false,
  sort_order integer not null default 0
);

-- =========================================================================
-- 3. Hospitals
-- =========================================================================
create table if not exists public.hospitals (
  id              uuid primary key default uuid_generate_v4(),
  slug            text unique,
  name            text not null,
  category        text references public.categories(id),
  location        text,
  phone           text,
  tags            text[] not null default '{}',
  logo_url        text,
  cover_images    text[] not null default '{}',
  introduction    text,
  holiday_notice  text,
  address         text,
  address_detail  text,
  map_url         text,
  rating          numeric(3,2) not null default 0,
  review_count    integer not null default 0,
  owner_id        uuid references public.profiles(id) on delete set null,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_hospitals_category on public.hospitals(category);
create index if not exists idx_hospitals_status on public.hospitals(status);

-- Operating hours per hospital (one row per day-of-week)
create table if not exists public.operating_hours (
  id           uuid primary key default uuid_generate_v4(),
  hospital_id  uuid not null references public.hospitals(id) on delete cascade,
  day          text not null, -- 월/화/수/목/금/토/일
  start_time   text,
  end_time     text,
  is_closed    boolean not null default false,
  unique (hospital_id, day)
);

-- =========================================================================
-- 4. Doctors
-- =========================================================================
create table if not exists public.doctors (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references public.profiles(id) on delete set null,
  hospital_id    uuid references public.hospitals(id) on delete set null,
  name           text not null,
  title          text,
  specialty      text,
  profile_image  text,
  is_owner       boolean not null default false,
  bio            text,
  careers        text[] not null default '{}',
  certifications text[] not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists idx_doctors_hospital on public.doctors(hospital_id);

alter table public.profiles
  add constraint profiles_doctor_id_fkey
  foreign key (doctor_id) references public.doctors(id) on delete set null
  deferrable initially deferred;

-- =========================================================================
-- 5. Products
-- =========================================================================
create table if not exists public.products (
  id              uuid primary key default uuid_generate_v4(),
  hospital_id     uuid not null references public.hospitals(id) on delete cascade,
  title           text not null,
  location        text,
  price           integer not null,
  original_price  integer,
  discount        integer,
  rating          numeric(3,2) not null default 0,
  review_count    integer not null default 0,
  like_count      integer not null default 0,
  image_url       text,
  tags            text[] not null default '{}',
  category        text,
  sub_category    text,
  status          text not null default 'active' check (status in ('active', 'paused', 'removed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_products_hospital on public.products(hospital_id);
create index if not exists idx_products_category on public.products(category);

create table if not exists public.product_options (
  id         uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  name       text not null,
  price      integer not null,
  sort_order integer not null default 0
);

-- =========================================================================
-- 6. Reviews
-- =========================================================================
create table if not exists public.reviews (
  id              uuid primary key default uuid_generate_v4(),
  author_id       uuid not null references public.profiles(id) on delete cascade,
  hospital_id     uuid references public.hospitals(id) on delete set null,
  doctor_id       uuid references public.doctors(id) on delete set null,
  product_id      uuid references public.products(id) on delete set null,
  reservation_id  uuid,
  rating          numeric(2,1) not null,
  content         text not null,
  treatment_name  text,
  treatment_date  date,
  total_cost      integer not null default 0,
  before_image    text,
  after_image     text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_reviews_hospital on public.reviews(hospital_id);
create index if not exists idx_reviews_doctor on public.reviews(doctor_id);
create index if not exists idx_reviews_product on public.reviews(product_id);
create index if not exists idx_reviews_author on public.reviews(author_id);

-- =========================================================================
-- 7. Reservations
-- =========================================================================
create table if not exists public.reservations (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  hospital_id        uuid not null references public.hospitals(id) on delete restrict,
  product_id         uuid references public.products(id) on delete set null,
  doctor_id          uuid references public.doctors(id) on delete set null,
  status             text not null default 'pending'
                     check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  visit_at           timestamptz,
  reservation_at     timestamptz not null default now(),
  cancel_at          timestamptz,
  cancel_reason      text,
  amount             integer not null default 0,
  customer_name      text not null,
  customer_phone     text not null,
  payment_type       text,
  payment_method     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_reservations_user on public.reservations(user_id);
create index if not exists idx_reservations_hospital on public.reservations(hospital_id);
create index if not exists idx_reservations_status on public.reservations(status);

alter table public.reviews
  add constraint reviews_reservation_fk
  foreign key (reservation_id) references public.reservations(id) on delete set null;

-- =========================================================================
-- 8. Posts & Comments (community)
-- =========================================================================
create table if not exists public.posts (
  id              uuid primary key default uuid_generate_v4(),
  author_id       uuid not null references public.profiles(id) on delete cascade,
  board_type      text not null check (board_type in ('question', 'free', 'dental')),
  title           text not null,
  content         text not null,
  is_anonymous    boolean not null default false,
  anonymous_id    text,
  view_count      integer not null default 0,
  like_count      integer not null default 0,
  comment_count   integer not null default 0,
  image_url       text,
  thumbnail_url   text,
  tags            text[] not null default '{}',
  has_answer      boolean not null default false,
  answer_count    integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_posts_board on public.posts(board_type);
create index if not exists idx_posts_author on public.posts(author_id);
create index if not exists idx_posts_created on public.posts(created_at desc);

create table if not exists public.comments (
  id                 uuid primary key default uuid_generate_v4(),
  post_id            uuid not null references public.posts(id) on delete cascade,
  author_id          uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id  uuid references public.comments(id) on delete cascade,
  content            text not null,
  is_anonymous       boolean not null default false,
  anonymous_id       text,
  like_count         integer not null default 0,
  created_at         timestamptz not null default now()
);

create index if not exists idx_comments_post on public.comments(post_id);
create index if not exists idx_comments_parent on public.comments(parent_comment_id);

create table if not exists public.post_likes (
  post_id    uuid references public.posts(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comment_likes (
  comment_id uuid references public.comments(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- Keep counters in sync
create or replace function public.sync_post_comment_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
  end if;
  return null;
end; $$;

drop trigger if exists trg_sync_post_comment_count on public.comments;
create trigger trg_sync_post_comment_count
  after insert or delete on public.comments
  for each row execute function public.sync_post_comment_count();

create or replace function public.sync_post_like_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  end if;
  return null;
end; $$;

drop trigger if exists trg_sync_post_like_count on public.post_likes;
create trigger trg_sync_post_like_count
  after insert or delete on public.post_likes
  for each row execute function public.sync_post_like_count();

-- =========================================================================
-- 9. Notifications
-- =========================================================================
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('event', 'important', 'recommendation', 'info', 'update')),
  title       text not null,
  content     text,
  is_read     boolean not null default false,
  link        text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

-- =========================================================================
-- 10. Coupons & Points
-- =========================================================================
create table if not exists public.coupons (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  name             text not null,
  description      text,
  discount_amount  integer not null,
  expiry_date      date,
  status           text not null default 'available' check (status in ('available', 'used', 'expired')),
  used_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_coupons_user on public.coupons(user_id, status);

create table if not exists public.point_history (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('earn', 'use')),
  description text,
  amount      integer not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_point_history_user on public.point_history(user_id, created_at desc);

-- =========================================================================
-- 11. User preferences
-- =========================================================================
create table if not exists public.wishlists (
  user_id     uuid references public.profiles(id) on delete cascade,
  product_id  uuid references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.recently_viewed (
  user_id     uuid references public.profiles(id) on delete cascade,
  product_id  uuid references public.products(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists idx_recently_viewed_user on public.recently_viewed(user_id, viewed_at desc);

create table if not exists public.recent_searches (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  keyword    text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_recent_searches_user on public.recent_searches(user_id, created_at desc);

create table if not exists public.interested_categories (
  user_id     uuid references public.profiles(id) on delete cascade,
  category_id text references public.categories(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, category_id)
);

-- =========================================================================
-- 12. Consultation chat (1:1 patient ↔ hospital)
-- =========================================================================
create table if not exists public.consultation_rooms (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  hospital_id   uuid not null references public.hospitals(id) on delete cascade,
  last_message  text,
  last_at       timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (user_id, hospital_id)
);

create table if not exists public.consultation_messages (
  id             uuid primary key default uuid_generate_v4(),
  room_id        uuid not null references public.consultation_rooms(id) on delete cascade,
  sender_type    text not null check (sender_type in ('user', 'hospital', 'system')),
  sender_id      uuid,
  content        text not null,
  image_url      text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_consult_msg_room on public.consultation_messages(room_id, created_at);

-- =========================================================================
-- 13. Community live chat (doctor-only broadcast room)
-- =========================================================================
create table if not exists public.live_messages (
  id         uuid primary key default uuid_generate_v4(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_live_messages_created on public.live_messages(created_at desc);

-- =========================================================================
-- 14. Announcements (global, read-only for users)
-- =========================================================================
create table if not exists public.announcements (
  id         uuid primary key default uuid_generate_v4(),
  title      text not null,
  content    text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Updated_at trigger helper
-- =========================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

do $$
declare t text;
begin
  for t in select unnest(array['profiles','hospitals','products','reservations','posts']) loop
    execute format('drop trigger if exists trg_touch_updated_at on public.%I;', t);
    execute format(
      'create trigger trg_touch_updated_at before update on public.%I
       for each row execute function public.touch_updated_at();', t
    );
  end loop;
end $$;

-- =========================================================================
-- Row-Level Security
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.hospitals enable row level security;
alter table public.operating_hours enable row level security;
alter table public.doctors enable row level security;
alter table public.products enable row level security;
alter table public.product_options enable row level security;
alter table public.reviews enable row level security;
alter table public.reservations enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.comment_likes enable row level security;
alter table public.notifications enable row level security;
alter table public.coupons enable row level security;
alter table public.point_history enable row level security;
alter table public.wishlists enable row level security;
alter table public.recently_viewed enable row level security;
alter table public.recent_searches enable row level security;
alter table public.interested_categories enable row level security;
alter table public.consultation_rooms enable row level security;
alter table public.consultation_messages enable row level security;
alter table public.live_messages enable row level security;
alter table public.categories enable row level security;
alter table public.announcements enable row level security;

-- Public read for catalog tables
drop policy if exists "read_all_categories" on public.categories;
create policy "read_all_categories" on public.categories
  for select using (true);
drop policy if exists "read_approved_hospitals" on public.hospitals;
create policy "read_approved_hospitals" on public.hospitals
  for select using (status = 'approved' or auth.uid() = owner_id);
drop policy if exists "read_all_operating_hours" on public.operating_hours;
create policy "read_all_operating_hours" on public.operating_hours
  for select using (true);
drop policy if exists "read_all_doctors" on public.doctors;
create policy "read_all_doctors" on public.doctors
  for select using (true);
drop policy if exists "read_active_products" on public.products;
create policy "read_active_products" on public.products
  for select using (status = 'active');
drop policy if exists "read_all_product_options" on public.product_options;
create policy "read_all_product_options" on public.product_options
  for select using (true);
drop policy if exists "read_all_reviews" on public.reviews;
create policy "read_all_reviews" on public.reviews
  for select using (true);
drop policy if exists "read_all_posts" on public.posts;
create policy "read_all_posts" on public.posts
  for select using (true);
drop policy if exists "read_all_comments" on public.comments;
create policy "read_all_comments" on public.comments
  for select using (true);
drop policy if exists "read_all_announcements" on public.announcements;
create policy "read_all_announcements" on public.announcements
  for select using (true);
drop policy if exists "read_all_live_messages" on public.live_messages;
create policy "read_all_live_messages" on public.live_messages
  for select using (true);

-- Profiles — everyone can read minimal info, self-update only
drop policy if exists "read_all_profiles" on public.profiles;
create policy "read_all_profiles" on public.profiles
  for select using (true);
drop policy if exists "update_own_profile" on public.profiles;
create policy "update_own_profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "insert_own_profile" on public.profiles;
create policy "insert_own_profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Reviews — authored-only writes
drop policy if exists "insert_own_review" on public.reviews;
create policy "insert_own_review" on public.reviews
  for insert with check (auth.uid() = author_id);
drop policy if exists "update_own_review" on public.reviews;
create policy "update_own_review" on public.reviews
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists "delete_own_review" on public.reviews;
create policy "delete_own_review" on public.reviews
  for delete using (auth.uid() = author_id);

-- Reservations — user owns their rows; hospital owner can read/update
drop policy if exists "read_own_reservation" on public.reservations;
create policy "read_own_reservation" on public.reservations
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.hospitals h where h.id = reservations.hospital_id and h.owner_id = auth.uid())
  );
drop policy if exists "insert_own_reservation" on public.reservations;
create policy "insert_own_reservation" on public.reservations
  for insert with check (auth.uid() = user_id);
drop policy if exists "update_own_reservation" on public.reservations;
create policy "update_own_reservation" on public.reservations
  for update using (
    auth.uid() = user_id
    or exists (select 1 from public.hospitals h where h.id = reservations.hospital_id and h.owner_id = auth.uid())
  );

-- Posts & comments — author writes own
drop policy if exists "insert_own_post" on public.posts;
create policy "insert_own_post" on public.posts
  for insert with check (auth.uid() = author_id);
drop policy if exists "update_own_post" on public.posts;
create policy "update_own_post" on public.posts
  for update using (auth.uid() = author_id);
drop policy if exists "delete_own_post" on public.posts;
create policy "delete_own_post" on public.posts
  for delete using (auth.uid() = author_id);

drop policy if exists "insert_own_comment" on public.comments;
create policy "insert_own_comment" on public.comments
  for insert with check (auth.uid() = author_id);
drop policy if exists "update_own_comment" on public.comments;
create policy "update_own_comment" on public.comments
  for update using (auth.uid() = author_id);
drop policy if exists "delete_own_comment" on public.comments;
create policy "delete_own_comment" on public.comments
  for delete using (auth.uid() = author_id);

-- Likes — self-owned
drop policy if exists "manage_own_post_like" on public.post_likes;
create policy "manage_own_post_like" on public.post_likes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "manage_own_comment_like" on public.comment_likes;
create policy "manage_own_comment_like" on public.comment_likes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notifications / coupons / points — self only
drop policy if exists "own_notifications" on public.notifications;
create policy "own_notifications" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own_coupons" on public.coupons;
create policy "own_coupons" on public.coupons
  for select using (auth.uid() = user_id);
drop policy if exists "own_point_history" on public.point_history;
create policy "own_point_history" on public.point_history
  for select using (auth.uid() = user_id);

-- Preferences — self only
drop policy if exists "own_wishlist" on public.wishlists;
create policy "own_wishlist" on public.wishlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own_recently_viewed" on public.recently_viewed;
create policy "own_recently_viewed" on public.recently_viewed
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own_recent_searches" on public.recent_searches;
create policy "own_recent_searches" on public.recent_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own_interested_categories" on public.interested_categories;
create policy "own_interested_categories" on public.interested_categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Consultation chat — only participants
drop policy if exists "read_own_consult_room" on public.consultation_rooms;
create policy "read_own_consult_room" on public.consultation_rooms
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.hospitals h where h.id = consultation_rooms.hospital_id and h.owner_id = auth.uid())
  );
drop policy if exists "insert_own_consult_room" on public.consultation_rooms;
create policy "insert_own_consult_room" on public.consultation_rooms
  for insert with check (auth.uid() = user_id);
drop policy if exists "read_consult_msg" on public.consultation_messages;
create policy "read_consult_msg" on public.consultation_messages
  for select using (
    exists (
      select 1 from public.consultation_rooms r
      where r.id = consultation_messages.room_id
      and (r.user_id = auth.uid()
           or exists (select 1 from public.hospitals h where h.id = r.hospital_id and h.owner_id = auth.uid()))
    )
  );
drop policy if exists "insert_consult_msg" on public.consultation_messages;
create policy "insert_consult_msg" on public.consultation_messages
  for insert with check (
    exists (
      select 1 from public.consultation_rooms r
      where r.id = room_id
      and (r.user_id = auth.uid()
           or exists (select 1 from public.hospitals h where h.id = r.hospital_id and h.owner_id = auth.uid()))
    )
  );

-- Live messages — authenticated doctors only (enforced on write; read-all above)
drop policy if exists "insert_live_message_doctor" on public.live_messages;
create policy "insert_live_message_doctor" on public.live_messages
  for insert with check (
    auth.uid() = author_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_doctor = true)
  );
