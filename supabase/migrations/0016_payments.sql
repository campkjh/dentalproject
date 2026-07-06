-- 토스페이먼츠 일반결제(단건) 승인 결과를 예약에 기록하기 위한 컬럼.
-- 앱결제(선결제) 흐름: 예약 생성(pending) → 토스 결제창 → 서버 승인(confirm) → 아래 컬럼 갱신.

alter table public.reservations
  add column if not exists payment_status text;

alter table public.reservations
  add column if not exists payment_key text;

alter table public.reservations
  add column if not exists order_id text;

alter table public.reservations
  add column if not exists paid_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_payment_status_check'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_payment_status_check
      check (payment_status is null or payment_status in ('ready', 'paid', 'canceled', 'failed'));
  end if;
end $$;

create unique index if not exists idx_reservations_order_id
  on public.reservations(order_id)
  where order_id is not null;

create index if not exists idx_reservations_payment_key
  on public.reservations(payment_key)
  where payment_key is not null;
