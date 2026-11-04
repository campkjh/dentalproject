\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create role service_role;
create table public.profiles(id uuid primary key, points integer not null default 0);
create table public.reviews(id uuid primary key default gen_random_uuid(), author_id uuid references profiles, hospital_id uuid, product_id uuid, reservation_id uuid, doctor_id uuid, rating numeric, content text, treatment_name text, treatment_date date, total_cost integer, before_image text, after_image text);
create table public.point_history(id uuid primary key default gen_random_uuid(), user_id uuid references profiles, type text, description text, amount integer, created_at timestamptz default now());
alter table point_history enable row level security;
create policy own_history_select on point_history for select using (false);
grant select on point_history to authenticated;
\ir ../../supabase/migrations/0026_review_point_award.sql
insert into profiles(id, points) values('00000000-0000-0000-0000-000000000001',100);
set role service_role;
select public.create_review_with_points('00000000-0000-0000-0000-000000000001','{"hospital_id":"00000000-0000-0000-0000-000000000002","product_id":"00000000-0000-0000-0000-000000000003","rating":5,"content":"test","treatment_date":"2026-11-04"}');
reset role;
do $$ begin
 if (select points from profiles limit 1) <> 600 then raise exception 'balance did not increase'; end if;
 if (select count(*) from point_history where amount=500 and review_id is not null) <> 1 then raise exception 'reward missing'; end if;
 begin
  perform public.create_review_with_points('00000000-0000-0000-0000-000000000001','{"hospital_id":"00000000-0000-0000-0000-000000000002","product_id":"00000000-0000-0000-0000-000000000003","rating":5,"content":"duplicate","treatment_date":"2026-11-04"}');
  raise exception 'duplicate accepted';
 exception when unique_violation then null; end;
 if (select points from profiles limit 1) <> 600 then raise exception 'duplicate reward'; end if;
 if has_function_privilege('authenticated','public.create_review_with_points(uuid,jsonb)','execute') then raise exception 'untrusted user can award points'; end if;
 if has_function_privilege('anon','public.create_review_with_points(uuid,jsonb)','execute') then raise exception 'anonymous user can award points'; end if;
end $$;
create function fail_reward() returns trigger language plpgsql as $$begin raise exception 'test reward failure'; end$$;
create trigger test_failure before insert on point_history for each row execute function fail_reward();
do $$begin
 begin
  perform public.create_review_with_points('00000000-0000-0000-0000-000000000001','{"hospital_id":"00000000-0000-0000-0000-000000000002","product_id":"00000000-0000-0000-0000-000000000004","rating":5,"content":"must roll back"}');
  raise exception 'failure was ignored';
 exception when raise_exception then
  if sqlerrm <> 'test reward failure' then raise; end if;
 end;
 if (select count(*) from reviews) <> 1 then raise exception 'review not rolled back'; end if;
 if (select points from profiles limit 1) <> 600 then raise exception 'balance not rolled back'; end if;
end$$;
drop trigger test_failure on point_history;
select 'reward, duplicate, permissions and rollback checks passed' as result;
