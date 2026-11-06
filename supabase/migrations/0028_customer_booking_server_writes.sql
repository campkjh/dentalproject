-- Apply only AFTER the new reservation API deployment is READY.
-- Keeping this separate lets the old API continue serving during the additive migration/build.
drop policy if exists insert_own_reservation on public.reservations;
drop policy if exists update_own_reservation on public.reservations;
drop policy if exists insert_own_review on public.reviews;

-- Profile self-service cannot create or erase a point balance directly.
create or replace function public.protect_customer_point_balance()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') = 'authenticated' and new.points is distinct from old.points then
    raise exception '포인트 잔액은 서버에서만 변경할 수 있습니다.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists protect_customer_point_balance on public.profiles;
create trigger protect_customer_point_balance before update on public.profiles for each row execute function public.protect_customer_point_balance();
