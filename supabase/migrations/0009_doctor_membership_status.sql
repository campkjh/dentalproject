alter table public.doctors
  add column if not exists is_active boolean not null default true;

alter table public.doctors
  add column if not exists member_status text not null default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'doctors_member_status_check'
      and conrelid = 'public.doctors'::regclass
  ) then
    alter table public.doctors
      add constraint doctors_member_status_check
      check (member_status in ('pending', 'active', 'rejected', 'left'));
  end if;
end $$;

update public.doctors
set member_status = 'active'
where member_status is null;

create index if not exists idx_doctors_member_status on public.doctors(member_status);
