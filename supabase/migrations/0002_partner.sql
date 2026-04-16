-- =========================================================================
-- Partner-side tables (events, event_qa, ads, hospital points, settlements)
-- Run after 0001_admin.sql.
-- =========================================================================

-- 1. Events --------------------------------------------------------------
create table if not exists public.events (
  id              uuid primary key default uuid_generate_v4(),
  hospital_id     uuid not null references public.hospitals(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  title           text not null,
  description     text,
  image_url       text,
  original_price  integer,
  sale_price      integer,
  discount_percent integer,
  start_at        timestamptz,
  end_at          timestamptz,
  status          text not null default 'draft'
                  check (status in ('draft', 'pending', 'approved', 'rejected', 'active', 'ended')),
  view_count      integer not null default 0,
  like_count      integer not null default 0,
  reject_reason   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_events_hospital on public.events(hospital_id);
create index if not exists idx_events_status on public.events(status);

-- 2. Event Q&A -----------------------------------------------------------
create table if not exists public.event_qa (
  id          uuid primary key default uuid_generate_v4(),
  event_id    uuid not null references public.events(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  question    text not null,
  answer      text,
  answered_by uuid references public.profiles(id) on delete set null,
  answered_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_event_qa_event on public.event_qa(event_id);
create index if not exists idx_event_qa_unanswered on public.event_qa(event_id) where answer is null;

-- 3. Hospital Ad Campaigns ----------------------------------------------
create table if not exists public.hospital_ads (
  id           uuid primary key default uuid_generate_v4(),
  hospital_id  uuid not null references public.hospitals(id) on delete cascade,
  event_id     uuid references public.events(id) on delete set null,
  name         text not null,
  type         text not null default 'cpv' check (type in ('cpv', 'banner', 'featured')),
  budget       integer not null default 0,
  spent        integer not null default 0,
  start_at     timestamptz,
  end_at       timestamptz,
  status       text not null default 'draft' check (status in ('draft', 'active', 'paused', 'ended')),
  created_at   timestamptz not null default now()
);

create index if not exists idx_ads_hospital on public.hospital_ads(hospital_id);

-- 4. Hospital Points (separate from user points) -------------------------
create table if not exists public.hospital_points (
  hospital_id  uuid primary key references public.hospitals(id) on delete cascade,
  balance      integer not null default 0,
  updated_at   timestamptz not null default now()
);

create table if not exists public.hospital_point_tx (
  id          uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  type        text not null check (type in ('charge', 'spend', 'refund')),
  description text,
  amount      integer not null,
  balance_after integer not null,
  ref_id      uuid,
  created_at  timestamptz not null default now()
);

create index if not exists idx_hpoint_tx_hospital on public.hospital_point_tx(hospital_id, created_at desc);

-- 5. Settlements (in-app payment payouts) -------------------------------
create table if not exists public.hospital_settlements (
  id            uuid primary key default uuid_generate_v4(),
  hospital_id   uuid not null references public.hospitals(id) on delete cascade,
  period_start  date not null,
  period_end    date not null,
  total_revenue integer not null default 0,
  vat           integer not null default 0,
  fee           integer not null default 0,
  payout        integer not null default 0,
  bank_account  text,
  status        text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_settle_hospital on public.hospital_settlements(hospital_id, period_end desc);

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.events enable row level security;
alter table public.event_qa enable row level security;
alter table public.hospital_ads enable row level security;
alter table public.hospital_points enable row level security;
alter table public.hospital_point_tx enable row level security;
alter table public.hospital_settlements enable row level security;

-- Events: public read for approved/active; owner can read all + write
drop policy if exists "read_active_events" on public.events;
create policy "read_active_events" on public.events
  for select using (
    status in ('approved', 'active')
    or exists (select 1 from public.hospitals h where h.id = events.hospital_id and h.owner_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "owner_write_events" on public.events;
create policy "owner_write_events" on public.events
  for all using (
    exists (select 1 from public.hospitals h where h.id = events.hospital_id and h.owner_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.hospitals h where h.id = events.hospital_id and h.owner_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Event Q&A: public read + own write + owner answer
drop policy if exists "read_event_qa" on public.event_qa;
create policy "read_event_qa" on public.event_qa for select using (true);

drop policy if exists "ask_event_qa" on public.event_qa;
create policy "ask_event_qa" on public.event_qa
  for insert with check (auth.uid() = user_id);

drop policy if exists "answer_event_qa" on public.event_qa;
create policy "answer_event_qa" on public.event_qa
  for update using (
    exists (
      select 1 from public.events e
      join public.hospitals h on h.id = e.hospital_id
      where e.id = event_qa.event_id and h.owner_id = auth.uid()
    )
  );

-- Hospital ads / points / settlements: owner-only read & write
drop policy if exists "owner_ads" on public.hospital_ads;
create policy "owner_ads" on public.hospital_ads
  for all using (
    exists (select 1 from public.hospitals h where h.id = hospital_ads.hospital_id and h.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.hospitals h where h.id = hospital_ads.hospital_id and h.owner_id = auth.uid())
  );

drop policy if exists "owner_hospital_points" on public.hospital_points;
create policy "owner_hospital_points" on public.hospital_points
  for all using (
    exists (select 1 from public.hospitals h where h.id = hospital_points.hospital_id and h.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.hospitals h where h.id = hospital_points.hospital_id and h.owner_id = auth.uid())
  );

drop policy if exists "owner_hpoint_tx" on public.hospital_point_tx;
create policy "owner_hpoint_tx" on public.hospital_point_tx
  for select using (
    exists (select 1 from public.hospitals h where h.id = hospital_point_tx.hospital_id and h.owner_id = auth.uid())
  );

drop policy if exists "owner_settlements" on public.hospital_settlements;
create policy "owner_settlements" on public.hospital_settlements
  for select using (
    exists (select 1 from public.hospitals h where h.id = hospital_settlements.hospital_id and h.owner_id = auth.uid())
  );

-- Updated_at trigger
do $$
declare t text;
begin
  for t in select unnest(array['events']) loop
    execute format('drop trigger if exists trg_touch_updated_at on public.%I;', t);
    execute format(
      'create trigger trg_touch_updated_at before update on public.%I
       for each row execute function public.touch_updated_at();', t
    );
  end loop;
end $$;
