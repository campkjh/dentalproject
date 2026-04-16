-- Admin role flag + minimal admin policies
-- Run this once after the initial schema.sql is applied.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Allow admins to read all hospitals (regardless of status) and update status
drop policy if exists "admin_read_all_hospitals" on public.hospitals;
create policy "admin_read_all_hospitals" on public.hospitals
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "admin_update_hospitals" on public.hospitals;
create policy "admin_update_hospitals" on public.hospitals
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- To grant admin to a user (run in SQL Editor):
--   update public.profiles set is_admin = true where id = (select id from auth.users where email = 'you@example.com');
