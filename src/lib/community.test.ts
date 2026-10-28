import test from 'node:test';
import assert from 'node:assert/strict';
import { communityPostFromRow, communityRelativeTime, getWeeklyPopularPosts, type CommunityPostRow } from './community';
import type { Post } from '@/types';

const row: CommunityPostRow = {
  id: 'post-one', board_type: 'question', title: '질문', content: '본문', author_id: 'user-one',
  created_at: '2026-10-27T09:00:00+09:00', author: { name: '김의사', is_doctor: true, profile_image: '/doctor.png' },
};
const post = (id: string, createdAt: string, views: number, answered = true): Post => ({
  ...communityPostFromRow(row), id, createdAt, viewCount: views, hasAnswer: answered, answerCount: answered ? 1 : 0,
});
const now = new Date('2026-10-28T12:00:00+09:00');

test('maps dates, images and counts without dropping profile images', () => {
  const value = communityPostFromRow(row);
  assert.equal(value.createdAt, row.created_at);
  assert.equal(value.authorProfileImage, '/doctor.png');
  assert.equal(value.authorTitle, '의사');
  assert.deepEqual(value.tags, []);
  assert.equal(value.likeCount, 0);
});

test('does not expose identifying name or profile image on anonymous cards', () => {
  const value = communityPostFromRow({ ...row, is_anonymous: true, anonymous_id: '1234' });
  assert.equal(value.authorName, '익명');
  assert.equal(value.authorProfileImage, undefined);
  assert.equal(value.authorTitle, undefined);
  assert.equal(value.anonymousId, '1234');
});

test('excludes legacy embedded images but keeps uploaded URLs', () => {
  assert.equal(communityPostFromRow({ ...row, image_url: 'data:image/png;base64,abc' }).imageUrl, undefined);
  assert.equal(communityPostFromRow({ ...row, image_url: 'https://example.test/photo.webp' }).imageUrl, 'https://example.test/photo.webp');
});

test('weekly popular posts require answers and rank by views', () => {
  const result = getWeeklyPopularPosts([
    post('unanswered', '2026-10-28T09:00:00+09:00', 999, false),
    post('old', '2026-10-20T09:00:00+09:00', 800),
    post('second', '2026-10-27T09:00:00+09:00', 20),
    post('first', '2026-10-27T09:00:00+09:00', 50),
  ], now);
  assert.deepEqual(result.map(p => p.id), ['first', 'second']);
});

test('keeps previous answered popular posts when the new week has none', () => {
  const result = getWeeklyPopularPosts([
    post('old', '2026-10-20T09:00:00+09:00', 800),
    post('new-unanswered', '2026-10-28T09:00:00+09:00', 999, false),
  ], now);
  assert.deepEqual(result.map(p => p.id), ['old']);
});

test('limits popular cards to five without mutating the feed', () => {
  const posts = Array.from({ length: 8 }, (_, i) => post(String(i), '2026-10-27T09:00:00+09:00', i));
  assert.deepEqual(getWeeklyPopularPosts(posts, now).map(p => p.id), ['7', '6', '5', '4', '3']);
  assert.equal(posts[0].id, '0');
});

test('handles missing and future timestamps without invalid labels', () => {
  assert.equal(communityRelativeTime({ date: '날짜 없음' }), '날짜 없음');
  assert.equal(communityRelativeTime({ date: '', createdAt: new Date(Date.now() + 3600000).toISOString() }), '방금 전');
});
