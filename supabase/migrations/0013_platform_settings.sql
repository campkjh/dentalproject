-- =========================================================================
-- Platform-wide settings (single-row key/value config).
-- =========================================================================
create table if not exists public.platform_settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

-- Public can read non-sensitive keys (we'll filter at the API layer too).
drop policy if exists "read_all_platform_settings" on public.platform_settings;
create policy "read_all_platform_settings" on public.platform_settings
  for select using (true);

drop policy if exists "admin_write_platform_settings" on public.platform_settings;
create policy "admin_write_platform_settings" on public.platform_settings
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Seed default fee policy if not present.
insert into public.platform_settings (key, value)
values
  ('fee_policy', '{"base_fee_percent": 15, "premium_fee_percent": 12, "settlement_cycle": "monthly", "minimum_payout": 100000}'::jsonb)
on conflict (key) do nothing;
