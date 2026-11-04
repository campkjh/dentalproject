import assert from 'node:assert/strict';
import test from 'node:test';
import { useStore } from '../src/store';
import type { Review, User } from '../src/types';

const user = { id: 'review-member', name: '테스트 회원', points: 100 } as User;
const review = { id: 'temporary-review', authorId: user.id, hospitalId: 'hospital', productId: 'product', rating: 5, content: '충분한 길이의 테스트 후기입니다. '.repeat(5), date: '2026-11-04' } as Review;

test('서버 응답 전 가짜 포인트를 더하지 않고 성공 후 실제 잔액과 적립 내역을 함께 갱신한다', async () => {
  const originalFetch = globalThis.fetch;
  const original = useStore.getState();
  useStore.setState({ user, reviews: [], pointHistory: [] });
  let finish!: (response: Response) => void;
  globalThis.fetch = async (input) => {
    if (input === '/api/reviews') return await new Promise<Response>(resolve => { finish = resolve; });
    assert.equal(input, '/api/me');
    return Response.json({ user: { profile: { points: 600 } }, pointHistory: [{ id: 'earned', type: 'earn', description: '후기작성', amount: 500, created_at: '2026-11-04T04:50:00Z' }] });
  };
  try {
    const pending = useStore.getState().addReview(review);
    assert.equal(useStore.getState().user?.points, 100);
    assert.equal(useStore.getState().pointHistory.length, 0);
    finish(Response.json({ id: 'saved-review', points: 600, pointsAwarded: 500 }));
    assert.equal((await pending).error, null);
    assert.equal(useStore.getState().user?.points, 600);
    assert.equal(useStore.getState().pointHistory[0].amount, 500);
    assert.equal(useStore.getState().reviews[0].id, 'saved-review');
  } finally { globalThis.fetch = originalFetch; useStore.setState(original, true); }
});

test('리뷰·적립 트랜잭션 실패 시 리뷰를 취소하고 기존 잔액을 유지한다', async () => {
  const originalFetch = globalThis.fetch;
  const original = useStore.getState();
  useStore.setState({ user, reviews: [], pointHistory: [] });
  globalThis.fetch = async () => Response.json({ error: '적립 실패' }, { status: 500 });
  try {
    assert.equal((await useStore.getState().addReview(review)).error, '적립 실패');
    assert.equal(useStore.getState().user?.points, 100);
    assert.deepEqual(useStore.getState().pointHistory, []);
    assert.deepEqual(useStore.getState().reviews, []);
  } finally { globalThis.fetch = originalFetch; useStore.setState(original, true); }
});
