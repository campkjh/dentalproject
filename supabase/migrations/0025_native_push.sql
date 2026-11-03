-- Native device registrations are private. All writes go through authenticated server routes.
create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  platform text not null check (platform in ('android', 'ios')),
  token text not null unique,
  updated_at timestamptz not null default now(),
  unique(user_id, device_id)
);
create index if not exists push_devices_user_idx on public.push_devices(user_id);
alter table public.push_devices enable row level security;

create table if not exists public.push_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{"reservation":true,"message":true,"community":true,"event":true,"marketing":false,"night":true}',
  updated_at timestamptz not null default now()
);
alter table public.push_preferences enable row level security;

create table if not exists public.native_push_queue (
  notification_id uuid primary key references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','sent','skipped','failed')),
  attempts int not null default 0,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  lease_id uuid,
  last_error text
);
create index if not exists native_push_pending_idx on public.native_push_queue(status, available_at);
alter table public.native_push_queue enable row level security;

-- Queue only NEW notifications: never send a backlog of historical alerts.
create or replace function public.enqueue_native_push()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.native_push_queue(notification_id, user_id) values (new.id, new.user_id)
    on conflict do nothing;
  return new;
end; $$;
drop trigger if exists trg_enqueue_native_push on public.notifications;
create trigger trg_enqueue_native_push after insert on public.notifications
  for each row execute function public.enqueue_native_push();

-- A lease prevents simultaneous request/cron workers from sending the same alert.
create or replace function public.claim_native_push(batch_size int default 25, notification_ids uuid[] default null)
returns setof public.native_push_queue
language sql security definer set search_path = public as $$
  update public.native_push_queue q
  set status = 'processing', attempts = q.attempts + 1,
      available_at = now() + interval '2 minutes', lease_id = gen_random_uuid()
  where q.notification_id in (
    select p.notification_id from public.native_push_queue p
    where p.status in ('pending','processing') and p.available_at <= now()
      and (notification_ids is null or p.notification_id = any(notification_ids))
    order by p.created_at limit greatest(1, least(batch_size, 50))
    for update skip locked
  )
  returning q.*;
$$;
revoke all on public.push_devices, public.push_preferences, public.native_push_queue from anon, authenticated;
grant all on public.push_devices, public.push_preferences, public.native_push_queue to service_role;
revoke execute on function public.enqueue_native_push() from public, anon, authenticated;
revoke execute on function public.claim_native_push(int, uuid[]) from public, anon, authenticated;
grant execute on function public.claim_native_push(int, uuid[]) to service_role;
