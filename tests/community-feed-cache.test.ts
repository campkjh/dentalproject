import assert from 'node:assert/strict';
import test from 'node:test';
import { communityViewerKey, useStore } from '../src/store';
import type { Post, User } from '../src/types';

const post = (id: string) => ({ id, title: id, boardType: 'question' } as Post);
const emptyFeed = () => ({ key: null, updatedAt: 0, loading: false, error: '' });

test('커뮤니티→포켓→커뮤니티 복귀는 완료된 목록과 진행 중 요청을 재사용한다', async t => {
  const previous = useStore.getState();
  useStore.setState({ user: null, isDoctor: false, isAdmin: false, communityFeed: emptyFeed() });
  let finish!: (response: Response) => void;
  let requests = 0;
  t.mock.method(globalThis, 'fetch', () => { requests++; return new Promise<Response>(resolve => { finish = resolve; }); });
  try {
    const first = useStore.getState().hydrateCommunity();
    const returningDuringLoad = useStore.getState().hydrateCommunity();
    assert.equal(requests, 1);
    finish(Response.json({ posts: [post('community')] }));
    await Promise.all([first, returningDuringLoad]);
    const loaded = useStore.getState().posts;
    await useStore.getState().hydrateCommunity();
    assert.equal(requests, 1);
    assert.equal(useStore.getState().posts, loaded);
    assert.equal(useStore.getState().communityFeed.loading, false);
  } finally { useStore.setState(previous); }
});

test('늦게 도착한 공통 카탈로그가 커뮤니티 목록을 다른 글로 덮어쓰지 않는다', async t => {
  const previous = useStore.getState();
  useStore.setState({ catalogHydrated: true, communityFeed: emptyFeed() });
  let finishCatalog!: (response: Response) => void;
  t.mock.method(globalThis, 'fetch', (url: string) => url === '/api/catalog'
    ? new Promise<Response>(resolve => { finishCatalog = resolve; })
    : Promise.resolve(Response.json({ posts: [post('full-community')] })));
  try {
    const catalog = useStore.getState().hydrateCatalog({ force: true });
    await useStore.getState().hydrateCommunity({ force: true });
    finishCatalog(Response.json({ posts: [post('partial-catalog')], products: [] }));
    await catalog;
    assert.deepEqual(useStore.getState().posts.map(p => p.id), ['full-community']);
  } finally { useStore.setState(previous); }
});

test('10초 이상 응답이 없으면 기존 목록을 보존하고 로딩을 종료해 재시도할 수 있다', async t => {
  const previous = useStore.getState();
  useStore.setState({ communityFeed: { key: communityViewerKey(previous), updatedAt: 1, loading: false, error: '' }, posts: [post('keep')] });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fetchMock = t.mock.method(globalThis, 'fetch', (_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
    options.signal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  try {
    const request = useStore.getState().hydrateCommunity({ force: true });
    t.mock.timers.tick(10000);
    await request;
    assert.deepEqual(useStore.getState().posts.map(p => p.id), ['keep']);
    assert.equal(useStore.getState().communityFeed.loading, false);
    assert.match(useStore.getState().communityFeed.error, /다시 시도/);
    fetchMock.mock.mockImplementation(async () => Response.json({ posts: [post('retry-success')] }));
    await useStore.getState().hydrateCommunity();
    assert.deepEqual(useStore.getState().posts.map(p => p.id), ['retry-success']);
    assert.equal(useStore.getState().communityFeed.error, '');
  } finally { useStore.setState(previous); }
});

test('계정·권한 변경 후 이전 요청이 도착해도 이전 계정의 글을 표시하지 않는다', async t => {
  const previous = useStore.getState();
  useStore.setState({ user: { id: 'member-a' } as User, isDoctor: true, isAdmin: false, communityFeed: emptyFeed() });
  const responses: ((response: Response) => void)[] = [];
  t.mock.method(globalThis, 'fetch', () => new Promise<Response>(resolve => { responses.push(resolve); }));
  try {
    const oldRequest = useStore.getState().hydrateCommunity();
    useStore.setState({ user: null, isDoctor: false, isAdmin: false });
    const newRequest = useStore.getState().hydrateCommunity();
    assert.deepEqual(useStore.getState().posts, []);
    responses[1](Response.json({ posts: [post('public')] }));
    await newRequest;
    responses[0](Response.json({ posts: [post('private-old')] }));
    await oldRequest;
    assert.deepEqual(useStore.getState().posts.map(p => p.id), ['public']);
    assert.equal(useStore.getState().communityFeed.key, communityViewerKey(useStore.getState()));
  } finally { useStore.setState(previous); }
});
