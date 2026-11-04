import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { adminProductsQuery, removeAdminProducts } from '../src/lib/admin-product-management';

function fixture(options: { legacy?: boolean; denied?: boolean } = {}) {
  const rows = [
    { id: 'active', status: 'active', approval_status: 'approved', pending_changes: null },
    { id: 'pending', status: 'paused', approval_status: 'pending_update', pending_changes: { title: '수정 대기' } },
    { id: 'removed', status: 'removed', approval_status: 'approved', pending_changes: null },
  ];
  const requests: { url: URL; method: string; patch?: Record<string, unknown> }[] = [];
  const client = createClient('https://products.example.test', 'test-only-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const patch = init?.body ? JSON.parse(String(init.body)) : undefined;
      requests.push({ url, method, patch });
      assert.equal(url.pathname, '/rest/v1/products');
      assert.equal(url.searchParams.get('status'), 'neq.removed');
      if (method === 'GET') return Response.json(rows.filter(row => row.status !== 'removed'));
      assert.equal(method, 'PATCH');
      assert.equal(url.searchParams.get('select'), 'id');
      if (options.denied) return Response.json({ code: '42501', message: 'permission denied' }, { status: 403 });
      if (options.legacy && patch.approval_status) return Response.json({ code: 'PGRST204', message: 'approval_status column missing' }, { status: 400 });
      const ids = (url.searchParams.get('id') ?? '').slice(4, -1).split(',');
      const targets = rows.filter(row => row.status !== 'removed' && ids.includes(row.id));
      for (const row of targets) Object.assign(row, patch);
      return Response.json(targets.map(row => ({ id: row.id })));
    } },
  });
  return { client, rows, requests };
}

test('삭제한 상품은 새 목록에서 제외되고 승인 대기 내용도 정리된다', async () => {
  const { client, rows } = fixture();
  assert.equal((await adminProductsQuery(client, '*')).data?.length, 2);
  const result = await removeAdminProducts(client, ['pending']);
  assert.equal(result.error, null);
  assert.deepEqual(result.data, [{ id: 'pending' }]);
  assert.deepEqual(rows.find(row => row.id === 'pending'), { id: 'pending', status: 'removed', approval_status: 'rejected', pending_changes: null });
  const remaining = await adminProductsQuery(client, 'id,status').returns<{ id: string; status: string }[]>();
  assert.deepEqual(remaining.data?.map(row => row.id), ['active']);
});

test('일괄 삭제는 실제 변경한 ID만 반환하고 중복·없는 ID·재시도를 과대 집계하지 않는다', async () => {
  const { client, rows, requests } = fixture();
  const result = await removeAdminProducts(client, ['active', 'pending', 'active', 'removed', 'missing']);
  assert.deepEqual(result.data, [{ id: 'active' }, { id: 'pending' }]);
  assert.equal(requests[0].url.searchParams.get('id'), 'in.(active,pending,removed,missing)');
  assert.equal(rows.length, 3, '예약·리뷰가 참조하는 상품 행은 보존한다');
  assert.deepEqual((await removeAdminProducts(client, ['active', 'pending'])).data, []);
});

test('이전 DB의 승인 컬럼 누락에만 호환 처리를 적용한다', async () => {
  const { client, requests } = fixture({ legacy: true });
  const result = await removeAdminProducts(client, ['active']);
  assert.equal(result.error, null);
  assert.deepEqual(result.data, [{ id: 'active' }]);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[1].patch, { status: 'removed' });
});

test('DB 권한 오류는 삭제 성공으로 숨기거나 호환 재시도로 우회하지 않는다', async () => {
  const { client, rows, requests } = fixture({ denied: true });
  const result = await removeAdminProducts(client, ['active']);
  assert.equal(result.error?.code, '42501');
  assert.equal(requests.length, 1);
  assert.equal(rows[0].status, 'active');
});
