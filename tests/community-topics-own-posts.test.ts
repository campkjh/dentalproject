import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { communityTopicTags, customerPostTags, selectedCustomerTags, postInCategory, TIP_TAG } from '../src/lib/community';
import { loadOwnPostRows, ownPosts } from '../src/lib/own-posts';

test('고객이 선택한 카테고리는 해당 탭에만 표시된다', () => {
  for (const topic of communityTopicTags) {
    const tags = selectedCustomerTags([topic]);
    assert.deepEqual(tags, [topic]);
    for (const tab of communityTopicTags) assert.equal(postInCategory({ boardType: 'question', tags: tags!, authorTitle: undefined }, tab), tab === topic);
  }
  assert.deepEqual(customerPostTags('병원추천', ['시술질문', TIP_TAG, '교정']), ['병원추천', '교정']);
  assert.deepEqual(selectedCustomerTags(['자유수다', TIP_TAG]), ['자유수다']);
  for (const tags of [[], ['시술질문', '자유수다'], ['unknown'], [TIP_TAG], null]) assert.equal(selectedCustomerTags(tags), null);
});

test('내 글은 작성자 ID로 분리하고 로그아웃 시 비운다', () => {
  const posts = [{ id: 'mine', authorId: 'a' }, { id: 'other', authorId: 'b' }];
  assert.deepEqual(ownPosts(posts, 'a'), [posts[0]]);
  assert.deepEqual(ownPosts(posts, 'b'), [posts[1]]);
  assert.deepEqual(ownPosts(posts, null), []);
  assert.deepEqual(ownPosts(posts, 'empty'), []);
});

test('개인 글 조회는 작성자와 게시판 접근 권한을 제한한다', async () => {
  for (const doctor of [false, true]) {
    const client = createClient('https://own-posts.example.test', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: async input => {
        const url = new URL(String(input));
        assert.equal(url.searchParams.get('author_id'), 'eq.me');
        assert.equal(url.searchParams.get('order'), 'created_at.desc');
        assert.equal(url.searchParams.get('board_type'), doctor ? null : 'eq.question');
        return Response.json([{ id: 'mine', author_id: 'me' }]);
      } },
    });
    assert.equal((await loadOwnPostRows(client, 'me', doctor)).data?.length, 1);
    await assert.rejects(loadOwnPostRows(client, '', doctor), /로그인/);
  }
});

test('구형 비밀글 컬럼 재조회도 작성자 제한을 유지한다', async () => {
  let count = 0;
  const client = createClient('https://own-posts.example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async input => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('author_id'), 'eq.me');
      if (++count === 1) return Response.json({ code: '42703', message: 'is_secret missing' }, { status: 400 });
      assert.ok(!url.searchParams.get('select')?.includes('is_secret'));
      return Response.json([]);
    } },
  });
  assert.equal((await loadOwnPostRows(client, 'me', false)).error, null);
  assert.equal(count, 2);
});
