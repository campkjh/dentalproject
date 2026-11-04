import assert from 'node:assert/strict';
import test from 'node:test';
import { useStore } from '../src/store';

test('승인 뒤 강제 갱신은 이미 불러온 카탈로그도 교체하고 빈 목록도 반영한다', async (t) => {
  const previous = useStore.getState();
  useStore.setState({ catalogHydrated: true });
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    requests++;
    assert.equal(options.cache, 'no-store');
    return Response.json({ products: [], hospitals: [], categories: [] });
  });
  try {
    await useStore.getState().hydrateCatalog();
    assert.equal(requests, 0);
    await useStore.getState().hydrateCatalog({ force: true });
    assert.equal(requests, 1);
    assert.deepEqual(useStore.getState().products, []);
    assert.deepEqual(useStore.getState().hospitals, []);
  } finally { useStore.setState(previous); }
});

test('화면 복귀와 주기 갱신이 겹쳐도 같은 요청을 한 번만 보낸다', async (t) => {
  const previous = useStore.getState();
  let finish!: (response: Response) => void;
  let requests = 0;
  t.mock.method(globalThis, 'fetch', () => { requests++; return new Promise<Response>(resolve => { finish = resolve; }); });
  try {
    const first = useStore.getState().hydrateCatalog({ force: true });
    const second = useStore.getState().hydrateCatalog({ force: true });
    finish(Response.json({ products: [] }));
    await Promise.all([first, second]);
    assert.equal(requests, 1);
  } finally { useStore.setState(previous); }
});

test('갱신이 실패하면 현재 목록을 보존하고 다음 요청을 다시 실행한다', async (t) => {
  const previous = useStore.getState();
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => { requests++; return new Response(null, { status: 503 }); });
  try {
    await useStore.getState().hydrateCatalog({ force: true });
    assert.deepEqual(useStore.getState().products, previous.products);
    await useStore.getState().hydrateCatalog({ force: true });
    assert.equal(requests, 2);
  } finally { useStore.setState(previous); }
});
