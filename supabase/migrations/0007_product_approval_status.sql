-- Product approval workflow for partner-side product changes.

alter table public.products
  add column if not exists approval_status text not null default 'approved',
  add column if not exists pending_changes jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_approval_status_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_approval_status_check
      check (approval_status in ('approved', 'pending_create', 'pending_update', 'pending_delete', 'rejected'));
  end if;
end $$;

create index if not exists idx_products_approval_status on public.products(approval_status);

drop policy if exists "owner_read_own_products" on public.products;
create policy "owner_read_own_products" on public.products
  for select using (
    exists (select 1 from public.hospitals h where h.id = products.hospital_id and h.owner_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
