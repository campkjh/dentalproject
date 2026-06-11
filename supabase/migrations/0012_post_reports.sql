-- =========================================================================
-- Community post reports — users can flag posts; admins can process.
-- =========================================================================
create table if not exists public.post_reports (
  id           uuid primary key default uuid_generate_v4(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  reporter_id  uuid references public.profiles(id) on delete set null,
  reason       text not null,
  status       text not null default 'pending'
                check (status in ('pending', 'resolved', 'rejected')),
  resolution   text,
  resolved_by  uuid references public.profiles(id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_post_reports_post on public.post_reports(post_id);
create index if not exists idx_post_reports_status on public.post_reports(status, created_at desc);

alter table public.post_reports enable row level security;

-- Authenticated users can create reports for any post
drop policy if exists "auth_insert_post_reports" on public.post_reports;
create policy "auth_insert_post_reports" on public.post_reports
  for insert with check (auth.role() = 'authenticated');

-- Reporters can read their own reports; admins read all
drop policy if exists "read_post_reports" on public.post_reports;
create policy "read_post_reports" on public.post_reports
  for select using (
    reporter_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Only admins can update / delete
drop policy if exists "admin_update_post_reports" on public.post_reports;
create policy "admin_update_post_reports" on public.post_reports
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "admin_delete_post_reports" on public.post_reports;
create policy "admin_delete_post_reports" on public.post_reports
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
