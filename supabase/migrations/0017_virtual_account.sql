-- 토스페이먼츠 가상계좌(무통장입금) 지원.
-- 흐름: 결제창에서 계좌 발급 → confirm 응답이 WAITING_FOR_DEPOSIT → payment_status = 'waiting_deposit'
--       → 입금 웹훅(/api/payments/webhook) → 'paid' / 기한 만료·취소 시 'canceled'.

alter table public.reservations
  add column if not exists virtual_account jsonb;

alter table public.reservations
  drop constraint if exists reservations_payment_status_check;

alter table public.reservations
  add constraint reservations_payment_status_check
  check (payment_status is null or payment_status in ('ready', 'waiting_deposit', 'paid', 'canceled', 'failed'));
