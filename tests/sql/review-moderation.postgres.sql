\set ON_ERROR_STOP on
SELECT current_database() LIKE 'mydoc_test_%' AS safe_database \gset
\if :safe_database
\else
 \echo 'Refusing to run outside mydoc_test_* database'
 \quit 1
\endif
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
CREATE TABLE public.profiles(id uuid PRIMARY KEY);
INSERT INTO profiles VALUES('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333');
CREATE TABLE public.reviews(id uuid PRIMARY KEY,author_id uuid REFERENCES profiles(id),hidden boolean NOT NULL DEFAULT false);
INSERT INTO reviews(id,author_id) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222'),('cccccccc-cccc-4ccc-8ccc-cccccccccccc','33333333-3333-4333-8333-333333333333');
INSERT INTO reviews(id,author_id,hidden) VALUES('dddddddd-dddd-4ddd-8ddd-dddddddddddd','33333333-3333-4333-8333-333333333333',true);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_all_reviews ON reviews FOR SELECT USING(true);
GRANT SELECT ON reviews,profiles TO anon,authenticated;
\ir ../../supabase/migrations/0031_review_reports_and_author_blocks.sql
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$ BEGIN
 INSERT INTO review_reports(review_id,reporter_id,reason) VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',auth.uid(),'광고·스팸');
 INSERT INTO review_reports(review_id,reporter_id,reason) VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',auth.uid(),'광고·스팸') ON CONFLICT(review_id,reporter_id) DO NOTHING;
 IF (SELECT count(*) FROM review_reports)<>1 THEN RAISE EXCEPTION 'duplicate report'; END IF;
 BEGIN
  INSERT INTO review_reports(review_id,reporter_id,reason) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',auth.uid(),'self');
  RAISE EXCEPTION 'self report allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO review_reports(review_id,reporter_id,reason) VALUES('cccccccc-cccc-4ccc-8ccc-cccccccccccc','33333333-3333-4333-8333-333333333333','forged');
  RAISE EXCEPTION 'forged reporter allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF has_table_privilege(current_user,'review_reports','UPDATE') OR has_table_privilege(current_user,'review_reports','DELETE') THEN RAISE EXCEPTION 'customer can moderate reports'; END IF;
 INSERT INTO review_author_blocks(user_id,blocked_user_id) VALUES(auth.uid(),'22222222-2222-4222-8222-222222222222');
 IF EXISTS(SELECT 1 FROM reviews WHERE author_id='22222222-2222-4222-8222-222222222222') THEN RAISE EXCEPTION 'blocked author visible'; END IF;
 IF (SELECT count(*) FROM reviews)<>2 THEN RAISE EXCEPTION 'other authors hidden'; END IF;
 BEGIN
  INSERT INTO review_author_blocks(user_id,blocked_user_id) VALUES('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222');
  RAISE EXCEPTION 'forged block allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO review_author_blocks(user_id,blocked_user_id) VALUES(auth.uid(),auth.uid());
  RAISE EXCEPTION 'self block allowed';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM review_reports)<>0 OR (SELECT count(*) FROM review_author_blocks)<>0 THEN RAISE EXCEPTION 'another user private data exposed'; END IF;
 IF (SELECT count(*) FROM reviews)<>3 THEN RAISE EXCEPTION 'block changed another user view'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DELETE FROM review_author_blocks WHERE user_id=auth.uid() AND blocked_user_id='22222222-2222-4222-8222-222222222222';
DO $$ BEGIN IF (SELECT count(*) FROM reviews)<>3 THEN RAISE EXCEPTION 'unblock did not restore'; END IF; END $$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM review_author_blocks)<>0 THEN RAISE EXCEPTION 'anonymous blocks exposed'; END IF;
 IF has_table_privilege(current_user,'review_reports','SELECT') OR has_table_privilege(current_user,'review_reports','INSERT') THEN RAISE EXCEPTION 'anonymous reports access'; END IF;
 IF (SELECT count(*) FROM reviews)<>3 THEN RAISE EXCEPTION 'anonymous review read broken'; END IF;
 IF EXISTS(SELECT 1 FROM reviews WHERE hidden) THEN RAISE EXCEPTION 'moderated review exposed'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE review_reports SET status='resolved',resolved_by='33333333-3333-4333-8333-333333333333',resolved_at=now();
DO $$ BEGIN IF (SELECT count(*) FROM review_reports WHERE status='resolved')<>1 THEN RAISE EXCEPTION 'admin resolve failed'; END IF; END $$;
RESET ROLE;
SELECT 'reports, duplicate prevention, ownership, blocking, unblock, anonymous access and admin resolution verified' AS result;
ROLLBACK;
