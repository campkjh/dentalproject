-- 휴대폰 본인인증(포트원 + 다날, PASS 포함) 결과.
-- profiles는 누구나 읽을 수 있으므로 생년월일·CI 같은 민감 정보는 여기에 따로 둔다.
-- 쓰기는 서버(service role)만 한다 — insert/update 정책이 없으므로 클라이언트는 쓸 수 없다.

create table if not exists public.identity_verifications (
  user_id                   uuid primary key references public.profiles(id) on delete cascade,
  -- 같은 사람의 중복 가입 확인용. CI 원문은 저장하지 않고 SHA-256 해시만 둔다.
  ci_hash                   text not null,
  verified_name             text not null,
  birth_date                date not null,
  gender                    text,
  phone                     text,
  is_foreigner              boolean not null default false,
  portone_verification_id   text not null,
  verified_at               timestamptz not null default now()
);

create unique index if not exists identity_verifications_ci_hash_key on public.identity_verifications(ci_hash);
create unique index if not exists identity_verifications_portone_id_key on public.identity_verifications(portone_verification_id);

alter table public.identity_verifications enable row level security;

drop policy if exists identity_verifications_select_own on public.identity_verifications;
create policy identity_verifications_select_own on public.identity_verifications
  for select using (auth.uid() = user_id);
