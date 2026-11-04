import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { loadOwnReviewRows, ownReviews } from '../src/lib/own-reviews';

const mine = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';

test('내 리뷰는 작성자 ID로만 분리하고 4개 초과 본인 리뷰도 모두 표시한다', () => {
  const myRows = Array.from({ length: 6 }, (_, index) => ({ id: `mine-${index}`, authorId: mine }));
  const rows = [{ id: 'other', authorId: other }, ...myRows, { id: 'missing-author', authorId: undefined }];
  assert.deepEqual(ownReviews(rows, mine), myRows);
  assert.deepEqual(ownReviews(rows, other), [{ id: 'other', authorId: other }]);
  assert.deepEqual(ownReviews(rows, null), []);
  assert.deepEqual(ownReviews(rows, 'no-reviews'), []);
});

test('서버 조회는 요청 쿼리의 계정 대신 인증된 작성자 ID로 DB를 제한한다', async () => {
  const client = createClient('https://reviews.example.test', 'test-only-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, '/rest/v1/reviews');
      assert.equal(url.searchParams.get('author_id'), `eq.${mine}`);
      assert.equal(url.searchParams.get('order'), 'created_at.desc');
      assert.equal(url.searchParams.has('limit'), false);
      return Response.json([{ id: 'own-review', author_id: mine }]);
    } },
  });
  const { data, error } = await loadOwnReviewRows(client, mine);
  assert.equal(error, null);
  assert.equal(data?.length, 1);
  assert.equal(data?.[0].author_id, mine);
  await assert.rejects(loadOwnReviewRows(client, ''), /로그인/);
});
