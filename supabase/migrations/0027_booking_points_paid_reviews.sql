-- Prices, coupon redemption and point holds are committed as one server-only operation.
alter table public.products add column if not exists options jsonb not null default '[]';
do $$ begin
  if to_regclass('public.product_options') is not null then
    execute 'update public.products p set options = (select jsonb_agg(jsonb_build_object(''id'', o.id::text, ''name'', o.name, ''price'', o.price) order by o.sort_order) from public.product_options o where o.product_id = p.id) where p.options = ''[]''::jsonb and exists(select 1 from public.product_options o where o.product_id = p.id)';
  end if;
end $$;
alter table public.reservations add column if not exists points_used integer not null default 0 check (points_used >= 0);
alter table public.reservations add column if not exists points_refunded boolean not null default false;
alter table public.reservations add column if not exists coupon_id uuid references public.coupons(id);
alter table public.reservations add column if not exists booking_notice_sent boolean not null default false;
alter table public.reservations add column if not exists option_id text;
alter table public.point_history add column if not exists reservation_id uuid;
create unique index if not exists point_history_booking_type_unique on public.point_history(reservation_id, type) where reservation_id is not null;

-- Existing rows have already had their booking notice sent by the old API.
update public.reservations set booking_notice_sent = true where not booking_notice_sent;

create or replace function public.customer_booking_effects()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_owner uuid; v_hospital text;
begin
  if tg_op = 'UPDATE' and not old.points_refunded
     and (new.status = 'cancelled' or new.payment_status in ('failed', 'canceled')) then
    new.points_refunded := true;
    if old.points_used > 0 then
      update public.profiles set points = points + old.points_used where id = old.user_id;
      insert into public.point_history(user_id, type, description, amount, reservation_id)
        values(old.user_id, 'earn', '예약취소 포인트 반환', old.points_used, old.id);
    end if;
    if old.coupon_id is not null then
      update public.coupons set status = case when expiry_date < (now() at time zone 'Asia/Seoul')::date then 'expired' else 'available' end, used_at = null where id = old.coupon_id and user_id = old.user_id and status = 'used';
    end if;
  end if;
  if not new.booking_notice_sent and new.order_id like 'mydoc_%' and new.status <> 'cancelled'
     and (new.payment_method = '후불결제' or new.payment_status = 'paid') then
    new.booking_notice_sent := true;
    insert into public.notifications(user_id, type, title, content, link) values
      (new.user_id, 'info', '예약이 접수되었습니다', '예약이 정상적으로 접수되었습니다. 병원 확인 후 알려드릴게요.', '/reservations/' || new.id);
    select owner_id, name into v_owner, v_hospital from public.hospitals where id = new.hospital_id;
    if v_owner is not null then
      insert into public.notifications(user_id, type, title, content, link) values
        (v_owner, 'important', '새 예약이 들어왔습니다', new.customer_name || '님이 ' || v_hospital || '에 예약을 신청했습니다.', '/hospital/appointments');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists customer_booking_effects on public.reservations;
create trigger customer_booking_effects before insert or update on public.reservations for each row execute function public.customer_booking_effects();

create or replace function public.create_customer_booking(p_user_id uuid, p_booking jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid := gen_random_uuid(); v_hospital uuid := (p_booking->>'hospital_id')::uuid;
  v_product public.products%rowtype; v_balance integer; v_price integer; v_discount integer := 0;
  v_points integer := coalesce((p_booking->>'points_used')::integer, 0);
  v_coupon uuid := (p_booking->>'coupon_id')::uuid; v_amount integer; v_order text := 'mydoc_' || replace(v_id::text, '-', '');
  v_method text := p_booking->>'payment_method'; v_option text := p_booking->>'option_id';
begin
  select points into v_balance from public.profiles where id = p_user_id for update;
  if not found then raise exception '회원 정보를 찾을 수 없습니다.' using errcode = '22023'; end if;
  select * into v_product from public.products where id = (p_booking->>'product_id')::uuid and hospital_id = v_hospital and status = 'active' and approval_status = 'approved' for share;
  if not found then raise exception '예약 가능한 상품을 찾을 수 없습니다.' using errcode = '22023'; end if;
  v_price := v_product.price;
  if v_option is not null then
    select (item->>'price')::integer into v_price from jsonb_array_elements(v_product.options) item where item->>'id' = v_option;
    if v_price is null then raise exception '상품 옵션을 다시 선택해주세요.' using errcode = '22023'; end if;
  end if;
  if v_coupon is not null then
    select discount_amount into v_discount from public.coupons where id = v_coupon and user_id = p_user_id and status = 'available' and (expiry_date is null or expiry_date >= (now() at time zone 'Asia/Seoul')::date) for update;
    if not found then raise exception '사용할 수 없는 쿠폰입니다.' using errcode = '22023'; end if;
  end if;
  v_discount := least(greatest(v_discount, 0), v_price);
  if v_points < 0 or v_points > coalesce(v_balance, 0) or v_points > v_price - v_discount then raise exception '사용할 포인트를 다시 확인해주세요.' using errcode = '22023'; end if;
  v_amount := v_price - v_discount - v_points;
  if (p_booking->>'amount')::integer is distinct from v_amount then raise exception '상품 금액이 변경되었습니다. 금액을 다시 확인해주세요.' using errcode = '22023'; end if;
  if v_method not in ('앱결제', '후불결제') or v_method is null then raise exception '결제 방식을 확인해주세요.' using errcode = '22023'; end if;
  insert into public.reservations(id, user_id, hospital_id, product_id, doctor_id, visit_at, amount, customer_name, customer_phone, payment_type, payment_method, status, payment_status, order_id, points_used, coupon_id, option_id)
    values(v_id, p_user_id, v_hospital, v_product.id, (p_booking->>'doctor_id')::uuid, (p_booking->>'visit_at')::timestamptz, v_amount, p_booking->>'customer_name', p_booking->>'customer_phone', p_booking->>'payment_type', v_method, 'pending', case when v_amount = 0 then 'paid' when v_method = '앱결제' then 'ready' else null end, v_order, v_points, v_coupon, v_option);
  if v_points > 0 then
    update public.profiles set points = points - v_points where id = p_user_id returning points into v_balance;
    insert into public.point_history(user_id, type, description, amount, reservation_id) values(p_user_id, 'use', '예약 포인트 사용', -v_points, v_id);
  end if;
  if v_coupon is not null then update public.coupons set status = 'used', used_at = now() where id = v_coupon; end if;
  return jsonb_build_object('id', v_id, 'amount', v_amount, 'orderId', v_order, 'points', v_balance);
end $$;
revoke all on function public.create_customer_booking(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_customer_booking(uuid, jsonb) to service_role;

create or replace function public.require_paid_customer_review()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- Hospital owners may still create the explicitly labelled initial reviews.
  if exists(select 1 from public.hospitals where id = new.hospital_id and owner_id = new.author_id) and new.reservation_id is null then return new; end if;
  perform 1 from public.reservations r where r.id = new.reservation_id and r.user_id = new.author_id
    and r.hospital_id = new.hospital_id and r.product_id = new.product_id and r.payment_status = 'paid' and r.status in ('confirmed', 'completed') for share;
  if not found then raise exception '결제가 완료된 확정 또는 완료 예약만 후기를 작성할 수 있습니다.' using errcode = '22023'; end if;
  return new;
end $$;
drop trigger if exists require_paid_customer_review on public.reviews;
create trigger require_paid_customer_review before insert on public.reviews for each row execute function public.require_paid_customer_review();

-- Hospital cards and details must read the same aggregate, including old reviews.
create or replace function public.refresh_review_totals()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare h uuid; p uuid;
begin
  for h in select distinct value from unnest(array[case when tg_op <> 'DELETE' then new.hospital_id end, case when tg_op <> 'INSERT' then old.hospital_id end]) value where value is not null loop
    update public.hospitals set rating = coalesce((select round(avg(r.rating), 1) from public.reviews r where r.hospital_id = h and coalesce(to_jsonb(r)->>'hidden', 'false') <> 'true'), 0),
      review_count = (select count(*) from public.reviews r where r.hospital_id = h and coalesce(to_jsonb(r)->>'hidden', 'false') <> 'true') where id = h;
  end loop;
  for p in select distinct value from unnest(array[case when tg_op <> 'DELETE' then new.product_id end, case when tg_op <> 'INSERT' then old.product_id end]) value where value is not null loop
    update public.products set rating = coalesce((select round(avg(r.rating), 1) from public.reviews r where r.product_id = p and coalesce(to_jsonb(r)->>'hidden', 'false') <> 'true'), 0),
      review_count = (select count(*) from public.reviews r where r.product_id = p and coalesce(to_jsonb(r)->>'hidden', 'false') <> 'true') where id = p;
  end loop;
  return null;
end $$;
drop trigger if exists refresh_review_totals on public.reviews;
create trigger refresh_review_totals after insert or update or delete on public.reviews for each row execute function public.refresh_review_totals();
update public.hospitals h set rating = coalesce((select round(avg(r.rating), 1) from public.reviews r where r.hospital_id = h.id and coalesce(to_jsonb(r)->>'hidden', 'false') <> 'true'), 0),
  review_count = (select count(*) from public.reviews r where r.hospital_id = h.id and coalesce(to_jsonb(r)->>'hidden', 'false') <> 'true');
update public.products p set rating = coalesce((select round(avg(r.rating), 1) from public.reviews r where r.product_id = p.id and coalesce(to_jsonb(r)->>'hidden', 'false') <> 'true'), 0),
  review_count = (select count(*) from public.reviews r where r.product_id = p.id and coalesce(to_jsonb(r)->>'hidden', 'false') <> 'true');
