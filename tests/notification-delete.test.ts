import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { notificationDeleteInput, readOwnNotifications, removeOwnNotifications } from '../src/lib/notification-management';
import { useStore } from '../src/store';
import type { Notification, User } from '../src/types';

const mine = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const message = (id: string): Notification => ({ id, title: '테스트 알림', content: '', date: '2026. 11. 4.', isRead: false, type: 'info' });

test('삭제 입력은 명시적인 전체 삭제 또는 유효한 알림 ID만 허용한다', () => {
  for (const input of [null, {}, { ids: [] }, { ids: ['invalid'] }, { all: false }, { ids: [mine], all: true }, { all: true, user_id: 'other' }]) {
    assert.equal(notificationDeleteInput.safeParse(input).success, false);
  }
  assert.equal(notificationDeleteInput.safeParse({ ids: [mine] }).success, true);
  assert.equal(notificationDeleteInput.safeParse({ all: true }).success, true);
});

test('개별·전체 삭제 모두 로그인한 사용자로 범위를 제한하고 실제 삭제 ID만 반환한다', async () => {
  const rows = [{ id: mine, user_id: 'me' }, { id: other, user_id: 'someone-else' }];
  const client = createClient('https://notifications.example.test', 'test-only-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      assert.equal(init?.method, 'DELETE');
      assert.equal(url.pathname, '/rest/v1/notifications');
      assert.equal(url.searchParams.get('user_id'), 'eq.me');
      assert.equal(url.searchParams.get('select'), 'id');
      const ids = url.searchParams.get('id')?.slice(4, -1).split(',');
      const deleted = rows.filter(row => row.user_id === 'me' && (!ids || ids.includes(row.id)));
      for (const row of deleted) rows.splice(rows.indexOf(row), 1);
      return Response.json(deleted.map(row => ({ id: row.id })));
    } },
  });
  assert.deepEqual((await removeOwnNotifications(client, 'me', [mine, other, mine])).data, [{ id: mine }]);
  assert.deepEqual((await removeOwnNotifications(client, 'me', null)).data, []);
  assert.deepEqual(rows, [{ id: other, user_id: 'someone-else' }]);
});

test('서버 삭제 성공 후 목록·미읽음 수를 갱신하고 오래된 GET이 알림을 되살리지 않는다', async t => {
  const previous = useStore.getState();
  let finish!: (response: Response) => void;
  t.mock.method(globalThis, 'fetch', async (_url: string, init?: RequestInit) => {
    if (init?.method === 'DELETE') return Response.json({ ok: true, deletedIds: [mine] });
    return new Promise<Response>(resolve => { finish = resolve; });
  });
  try {
    useStore.setState({ user: { id: 'me' } as User, notifications: [message(mine), message(other)] });
    const refresh = useStore.getState().refreshNotifications();
    await useStore.getState().deleteNotifications([mine]);
    finish(Response.json({ notifications: [{ id: mine, title: 'old', is_read: false }] }));
    await refresh;
    assert.deepEqual(useStore.getState().notifications.map(n => n.id), [other]);
    assert.equal(useStore.getState().notifications.filter(n => !n.isRead).length, 1);
  } finally { useStore.setState(previous); }
});

test('삭제 실패는 기존 알림을 보존하고 전체 삭제는 명시적 요청으로만 보낸다', async t => {
  const previous = useStore.getState();
  let shouldFail = true;
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    assert.equal(init.method, 'DELETE');
    assert.deepEqual(JSON.parse(String(init.body)), { all: true });
    return shouldFail ? Response.json({ error: 'denied' }, { status: 500 }) : Response.json({ ok: true, deletedIds: [mine] });
  });
  try {
    useStore.setState({ user: { id: 'me' } as User, notifications: [message(mine)] });
    await assert.rejects(useStore.getState().deleteNotifications());
    assert.equal(useStore.getState().notifications.length, 1);
    shouldFail = false;
    await useStore.getState().deleteNotifications();
    assert.deepEqual(useStore.getState().notifications, []);
  } finally { useStore.setState(previous); }
});

test('삭제 응답 중 계정이 바뀌면 새 계정의 알림을 건드리지 않는다', async t => {
  const previous = useStore.getState();
  let finish!: (response: Response) => void;
  t.mock.method(globalThis, 'fetch', () => new Promise<Response>(resolve => { finish = resolve; }));
  try {
    useStore.setState({ user: { id: 'me' } as User, notifications: [message(mine)] });
    const deletion = useStore.getState().deleteNotifications([mine]);
    useStore.setState({ user: { id: 'new-user' } as User, notifications: [message(mine)] });
    finish(Response.json({ ok: true, deletedIds: [mine] }));
    await deletion;
    assert.equal(useStore.getState().notifications.length, 1);
  } finally { useStore.setState(previous); }
});

test('모두 읽음은 본인의 미읽음 알림만 하나의 DB 요청으로 갱신한다', async () => {
  let requests = 0;
  const client = createClient('https://notifications.example.test', 'test-only-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      requests++;
      const url = new URL(String(input));
      assert.equal(init?.method, 'PATCH');
      assert.equal(url.searchParams.get('user_id'), 'eq.me');
      assert.equal(url.searchParams.get('is_read'), 'eq.false');
      assert.deepEqual(JSON.parse(String(init?.body)), { is_read: true });
      return Response.json([{ id: mine }]);
    } },
  });
  assert.deepEqual((await readOwnNotifications(client, 'me')).data, [{ id: mine }]);
  assert.equal(requests, 1);
});

test('모두 읽음은 HTTP 요청 한 번으로 처리하며 오래된 목록 응답이 미읽음으로 되돌리지 않는다', async t => {
  const previous = useStore.getState();
  let requests = 0;
  let finish!: (response: Response) => void;
  t.mock.method(globalThis, 'fetch', async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      requests++;
      assert.deepEqual(JSON.parse(String(init.body)), { all: true });
      return Response.json({ ok: true, readIds: [mine, other] });
    }
    return new Promise<Response>(resolve => { finish = resolve; });
  });
  try {
    useStore.setState({ user: { id: 'me' } as User, notifications: [message(mine), message(other)] });
    const refresh = useStore.getState().refreshNotifications();
    await useStore.getState().markAllNotificationsRead();
    finish(Response.json({ notifications: [{ id: mine, is_read: false }] }));
    await refresh;
    assert.equal(requests, 1);
    assert.equal(useStore.getState().notifications.length, 2);
    assert.equal(useStore.getState().notifications.filter(n => !n.isRead).length, 0);
  } finally { useStore.setState(previous); }
});

test('모두 읽음 실패 시 알림 상태를 보존한다', async t => {
  const previous = useStore.getState();
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'failed' }, { status: 500 }));
  try {
    useStore.setState({ user: { id: 'me' } as User, notifications: [message(mine)] });
    await assert.rejects(useStore.getState().markAllNotificationsRead());
    assert.equal(useStore.getState().notifications[0].isRead, false);
  } finally { useStore.setState(previous); }
});
