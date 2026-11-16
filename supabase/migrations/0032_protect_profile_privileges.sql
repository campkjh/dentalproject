-- 고객이 자기 profiles 행의 권한 컬럼(is_admin, is_doctor, doctor_id)을 직접 바꾸지 못하게 막는다.
-- update_own_profile 정책은 컬럼을 제한하지 않아서, 로그인한 사용자가 공개 anon 키로
-- `update profiles set is_admin = true where id = auth.uid()` 를 실행할 수 있었다.
-- 권한 컬럼은 서버(service role)에서만 바꾼다:
--   admin/admins, admin/hospitals/[id], my-hospital/doctors, hospital-applications, auth/withdraw.
-- 0028(protect_customer_point_balance)은 UPDATE + 'authenticated'만 검사하므로,
-- 여기서는 INSERT 때 points 도 0으로 고정해 그 빈틈까지 닫는다.
-- fail-closed: 실행 롤(current_user) 또는 JWT role 중 하나라도 anon/authenticated 이면 검사한다.
-- service_role, SQL Editor(postgres), 가입 트리거 handle_new_user(security definer, JWT 없음)는 통과.

set lock_timeout = '5s';

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  jwt_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '');
begin
  if current_user::text not in ('anon', 'authenticated')
     and jwt_role not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- 고객이 직접 만드는 프로필 행은 항상 일반 고객 권한으로 시작
    new.is_admin  := false;
    new.is_doctor := false;
    new.doctor_id := null;
    new.points    := 0;
    return new;
  end if;

  if new.is_admin  is distinct from old.is_admin
     or new.is_doctor is distinct from old.is_doctor
     or new.doctor_id is distinct from old.doctor_id then
    raise exception '권한 정보는 서버에서만 변경할 수 있습니다.' using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileges();

reset lock_timeout;
