-- Naver Map 전환: 병원 좌표(위도/경도) 저장용 컬럼
-- 주소 저장 시 geocoding으로 채우고, 필요 시 수동 수정 가능
alter table public.hospitals add column if not exists lat double precision;
alter table public.hospitals add column if not exists lng double precision;
