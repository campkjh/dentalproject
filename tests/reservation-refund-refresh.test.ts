import assert from 'node:assert/strict';
import test from 'node:test';
import { useStore } from '../src/store';
import type { Reservation, User } from '../src/types';

test('예약 취소 성공 후 서버가 반환한 포인트 잔액과 내역을 화면에 다시 반영한다', async t => {
  const previous = useStore.getState();
  const calls: string[] = [];
  useStore.setState({ user: { id: 'member', points: 300 } as User, reservations: [{ id: '11111111-1111-4111-8111-111111111111', status: 'pending' } as Reservation] });
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    calls.push(url);
    return Response.json(url === '/api/me'
      ? { user: { profile: { points: 500 } }, pointHistory: [{ id: 'refund', type: 'earn', amount: 200, description: '예약취소 포인트 반환', created_at: '2026-11-06T01:00:00Z' }] }
      : { ok: true });
  });
  try {
    assert.deepEqual(await useStore.getState().updateReservationStatus('11111111-1111-4111-8111-111111111111', 'cancelled'), {});
    assert.deepEqual(calls, ['/api/reservations/11111111-1111-4111-8111-111111111111', '/api/me']);
    assert.equal(useStore.getState().user?.points, 500);
    assert.equal(useStore.getState().pointHistory[0].amount, 200);
  } finally { useStore.setState(previous); }
});

test('예약 취소가 실패하면 임의로 포인트를 반환하거나 잔액을 바꾸지 않는다', async t => {
  const previous = useStore.getState();
  useStore.setState({ user: { id: 'member', points: 300 } as User, reservations: [{ id: '11111111-1111-4111-8111-111111111111', status: 'pending' } as Reservation] });
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: '취소 실패' }, { status: 503 }));
  try {
    assert.equal((await useStore.getState().updateReservationStatus('11111111-1111-4111-8111-111111111111', 'cancelled')).error, '취소 실패');
    assert.equal(useStore.getState().user?.points, 300);
    assert.equal(useStore.getState().reservations[0].status, 'pending');
  } finally { useStore.setState(previous); }
});
