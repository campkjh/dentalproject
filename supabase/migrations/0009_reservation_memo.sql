alter table public.reservations
  add column if not exists memo text;
