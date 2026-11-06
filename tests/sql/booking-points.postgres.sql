-- Run only in an empty, disposable local database named mydoc_test_*.
\set ON_ERROR_STOP on
do $$ begin if current_database() not like 'mydoc_test_%' then raise exception 'Refusing non-test database'; end if; end $$;

do $$ begin if not exists(select 1 from pg_roles where rolname = 'anon') then create role anon; end if; if not exists(select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if; if not exists(select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if; end $$;
create table public.profiles(id uuid primary key, points integer not null default 0);
create table public.hospitals(id uuid primary key, owner_id uuid, name text, rating numeric default 0, review_count integer default 0);
create table public.products(id uuid primary key, hospital_id uuid, price integer, status text, approval_status text, rating numeric default 0, review_count integer default 0);
create table public.coupons(id uuid primary key, user_id uuid, discount_amount integer, status text, expiry_date date, used_at timestamptz);
create table public.reservations(id uuid primary key default gen_random_uuid(), user_id uuid, hospital_id uuid, product_id uuid, doctor_id uuid, visit_at timestamptz, amount integer, customer_name text, customer_phone text, payment_type text, payment_method text, status text, payment_status text, order_id text);
create table public.point_history(id uuid primary key default gen_random_uuid(), user_id uuid, type text, description text, amount integer);
create table public.notifications(id uuid primary key default gen_random_uuid(), user_id uuid, type text, title text, content text, link text);
create table public.reviews(id uuid primary key default gen_random_uuid(), author_id uuid, hospital_id uuid, product_id uuid, reservation_id uuid, doctor_id uuid, rating numeric, content text, treatment_name text, treatment_date date, total_cost integer, before_image text, after_image text);
insert into public.profiles values ('11111111-1111-4111-8111-111111111111',500),('22222222-2222-4222-8222-222222222222',0);
insert into public.hospitals(id,owner_id,name) values ('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','검증병원');
insert into public.products(id,hospital_id,price,status,approval_status) values ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333',200,'active','approved');

\ir ../../supabase/migrations/0026_review_point_award.sql
\ir ../../supabase/migrations/0027_booking_points_paid_reviews.sql
\ir ../../supabase/migrations/0028_customer_booking_server_writes.sql

create function public.test_booking(points integer, expected integer, method text default '앱결제') returns jsonb language sql as $$
select public.create_customer_booking('11111111-1111-4111-8111-111111111111',jsonb_build_object('hospital_id','33333333-3333-4333-8333-333333333333','product_id','44444444-4444-4444-8444-444444444444','visit_at','2026-12-01T10:00:00+09:00','amount',expected,'points_used',points,'payment_method',method,'customer_name','테스트','customer_phone','01000000000')) $$;
do $$
declare a jsonb; b jsonb; r uuid; before_count integer;
begin
 a:=public.test_booking(200,0); r:=(a->>'id')::uuid;
 assert (select points=300 from profiles where id='11111111-1111-4111-8111-111111111111'), 'point deduction';
 assert (select count(*)=2 from notifications), 'zero payment booking notices';
 update reservations set status='cancelled' where id=r;
 update reservations set status='cancelled' where id=r;
 assert (select points=500 from profiles where id='11111111-1111-4111-8111-111111111111'), 'refund exactly once';
 assert (select count(*)=2 from point_history where reservation_id=r), 'one debit and one refund';
 select count(*) into before_count from notifications;
 b:=public.test_booking(100,100);r:=(b->>'id')::uuid;
 assert (select count(*)=before_count from notifications), 'no notification before payment';
 update reservations set payment_status='paid',status='confirmed' where id=r;
 update reservations set payment_status='paid' where id=r;
 assert (select count(*)=before_count+2 from notifications), 'paid notice once';
 begin perform public.test_booking(201,0); raise exception 'over cap was accepted'; exception when sqlstate '22023' then null; end;
 begin perform public.test_booking(0,1); raise exception 'tampered amount was accepted'; exception when sqlstate '22023' then null; end;
 begin insert into reviews(author_id,hospital_id,product_id,rating) values('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444',5); raise exception 'unpaid review accepted'; exception when sqlstate '22023' then null; end;
 a:=public.create_review_with_points('11111111-1111-4111-8111-111111111111',jsonb_build_object('reservation_id',r,'hospital_id','33333333-3333-4333-8333-333333333333','product_id','44444444-4444-4444-8444-444444444444','rating',5,'content','검증'));
 assert (select points=900 from profiles where id='11111111-1111-4111-8111-111111111111'), 'paid review reward';
 assert (select rating=5 and review_count=1 from hospitals), 'hospital aggregate';
 begin perform public.create_review_with_points('11111111-1111-4111-8111-111111111111',jsonb_build_object('reservation_id',r,'hospital_id','33333333-3333-4333-8333-333333333333','product_id','44444444-4444-4444-8444-444444444444','rating',5)); raise exception 'duplicate review reward accepted'; exception when unique_violation then null; end;
 assert not has_function_privilege('authenticated','public.create_customer_booking(uuid,jsonb)','EXECUTE'), 'client cannot invoke server booking';
 assert has_function_privilege('service_role','public.create_customer_booking(uuid,jsonb)','EXECUTE'), 'server can book';
 update reservations set payment_status='failed' where id=r;
 assert (select points=1000 from profiles where id='11111111-1111-4111-8111-111111111111'), 'payment failure refund';
 raise notice 'PASS: point cap, tampered amount, debit/refund, notices, paid review, duplicate reward, privilege and rating aggregate';
end $$;
do $$
declare booking jsonb; reservation uuid;
begin
  insert into coupons(id,user_id,discount_amount,status,expiry_date) values('66666666-6666-4666-8666-666666666666','11111111-1111-4111-8111-111111111111',100,'available','2099-12-31');
  booking:=public.create_customer_booking('11111111-1111-4111-8111-111111111111',jsonb_build_object('hospital_id','33333333-3333-4333-8333-333333333333','product_id','44444444-4444-4444-8444-444444444444','visit_at','2026-12-01T10:00:00+09:00','amount',0,'points_used',100,'coupon_id','66666666-6666-4666-8666-666666666666','payment_method','앱결제','customer_name','검증','customer_phone','01000000000'));
  reservation:=(booking->>'id')::uuid;
  assert (select status='used' from coupons where id='66666666-6666-4666-8666-666666666666'), 'coupon reserved';
  update reservations set status='cancelled' where id=reservation;
  update reservations set status='cancelled' where id=reservation;
  assert (select status='available' from coupons where id='66666666-6666-4666-8666-666666666666'), 'coupon released';
  assert (select points=1000 from profiles where id='11111111-1111-4111-8111-111111111111'), 'coupon booking points restored';
  update products set options='[{"id":"plan-a","name":"검증 옵션","price":300}]';
  booking:=public.create_customer_booking('11111111-1111-4111-8111-111111111111',jsonb_build_object('hospital_id','33333333-3333-4333-8333-333333333333','product_id','44444444-4444-4444-8444-444444444444','visit_at','2026-12-01T10:00:00+09:00','amount',300,'option_id','plan-a','payment_method','앱결제','customer_name','검증','customer_phone','01000000000'));
  assert (booking->>'amount')::integer=300, 'server option price';
  begin
    perform public.create_customer_booking('11111111-1111-4111-8111-111111111111',jsonb_build_object('hospital_id','33333333-3333-4333-8333-333333333333','product_id','44444444-4444-4444-8444-444444444444','amount',1,'option_id','unknown','payment_method','앱결제'));
    raise exception 'unknown option accepted';
  exception when sqlstate '22023' then null;
  end;
  raise notice 'PASS: coupon hold/release, point restoration and server-owned option prices';
end $$;

do $$
begin
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
 begin update public.profiles set points = points + 1; raise exception 'client changed balance'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
end $$;
