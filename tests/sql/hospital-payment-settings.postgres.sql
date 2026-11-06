-- 임시 로컬 DB에서만 실행: psql -d mydoc_test_booking_methods -f tests/sql/hospital-payment-settings.postgres.sql
\set ON_ERROR_STOP on
SELECT current_database() LIKE 'mydoc_test_%' AS safe_database \gset
\if :safe_database
\else
  \echo 'Refusing to run outside mydoc_test_* database'
  \quit 1
\endif
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
END $$;
CREATE TABLE public.hospitals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, category text, phone text,
 tags text[], cover_images text[], address text, owner_id uuid, status text, submitted_documents jsonb
);
\ir ../../supabase/migrations/0029_hospital_booking_methods.sql
\ir ../../supabase/migrations/0030_hospital_payment_settings.sql
GRANT ALL ON public.hospitals TO service_role;

DO $$ BEGIN
 IF has_table_privilege('anon','public.hospital_payment_settings','SELECT')
 OR has_table_privilege('authenticated','public.hospital_payment_settings','SELECT')
 OR has_function_privilege('anon','public.save_hospital_payment_settings(uuid,text[],jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.create_hospital_application_with_payment(jsonb,jsonb,text[])','EXECUTE')
 THEN RAISE EXCEPTION 'private account permissions exposed'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.hospital_payment_settings'::regclass)
 THEN RAISE EXCEPTION 'RLS disabled'; END IF;
END $$;
SET LOCAL ROLE service_role;
DO $$
DECLARE id_on uuid; id_off uuid; before_count integer;
 settings_on jsonb := '{"appPaymentRequested":true,"bankName":"테스트은행","accountNumber":"01234567890","accountHolder":"병원"}';
 settings_off jsonb := '{"appPaymentRequested":false,"bankName":"","accountNumber":"","accountHolder":""}';
 hospital jsonb := '{"name":"테스트병원","category":"dental","tags":[],"submitted_documents":{}}';
BEGIN
 id_on := public.create_hospital_application_with_payment(hospital,settings_on,ARRAY['앱결제']);
 id_off := public.create_hospital_application_with_payment(hospital,settings_off,ARRAY['현장결제','상담 후 결제']);
 IF (SELECT account_number FROM hospital_payment_settings WHERE hospital_id=id_on) <> '01234567890'
 THEN RAISE EXCEPTION 'account not saved'; END IF;
 IF (SELECT booking_methods FROM hospitals WHERE id=id_off) <> ARRAY['현장결제','상담 후 결제']
 THEN RAISE EXCEPTION 'selection not saved'; END IF;
 SELECT count(*) INTO before_count FROM hospitals;
 BEGIN
  PERFORM public.create_hospital_application_with_payment(hospital, settings_on || '{"accountNumber":""}',ARRAY['앱결제']);
  RAISE EXCEPTION 'invalid account accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF (SELECT count(*) FROM hospitals) <> before_count THEN RAISE EXCEPTION 'partial hospital left behind'; END IF;
 BEGIN
  PERFORM public.save_hospital_payment_settings(id_on,ARRAY['현장결제'],settings_on);
  RAISE EXCEPTION 'mismatch accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM = 'mismatch accepted' THEN RAISE; END IF;
 END;
 IF (SELECT booking_methods FROM hospitals WHERE id=id_on) <> ARRAY['앱결제'] THEN RAISE EXCEPTION 'mismatch changed public filter'; END IF;
 PERFORM public.save_hospital_payment_settings(id_on,ARRAY['상담 후 결제'],settings_off);
 IF (SELECT app_payment_requested FROM hospital_payment_settings WHERE hospital_id=id_on)
 OR (SELECT booking_methods FROM hospitals WHERE id=id_on) <> ARRAY['상담 후 결제'] THEN RAISE EXCEPTION 'settings update failed'; END IF;
 BEGIN
  PERFORM public.save_hospital_payment_settings(id_on,ARRAY[]::text[],settings_off);
  RAISE EXCEPTION 'empty methods accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'hospital application, account, filter, transaction rollback and permissions verified' AS result;
ROLLBACK;
