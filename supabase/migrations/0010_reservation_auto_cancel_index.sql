create index if not exists idx_reservations_pending_created
  on public.reservations(created_at)
  where status = 'pending';
