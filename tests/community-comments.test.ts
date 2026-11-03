import assert from 'node:assert/strict';
import test from 'node:test';
import { communityCommentCount } from '../src/lib/community';
import { communityCommentNotifications } from '../src/lib/community-comment-notification';

const event = {
  commentId: 'comment-a', postId: 'post-a', board: 'question',
  actorId: 'commenter', postAuthorId: 'writer', secret: false,
};

test('실제 댓글 수가 오래된 저장값보다 우선하며 마지막 댓글 삭제도 0으로 반영한다', () => {
  assert.equal(communityCommentCount({ comment_count: 0, comments: [{ count: 3 }] }), 3);
  assert.equal(communityCommentCount({ comment_count: 7, comments: [{ count: 0 }] }), 0);
  assert.equal(communityCommentCount({ comment_count: 2 }), 2);
});

test('댓글 알림은 글쓴이에게, 답글 알림은 글쓴이와 원댓글 작성자에게 전달한다', () => {
  const comment = communityCommentNotifications(event);
  assert.deepEqual(comment.map(n => n.user_id), ['writer']);
  assert.equal(comment[0].link, '/community/post-a');
  const reply = communityCommentNotifications({ ...event, parentAuthorId: 'parent' });
  assert.deepEqual(reply.map(n => n.user_id), ['writer', 'parent']);
  assert.match(reply[1].title, /답글/);
});

test('자기 댓글은 자신에게 알리지 않고 글쓴이와 답글 대상이 같으면 한 번만 알린다', () => {
  assert.deepEqual(communityCommentNotifications({ ...event, actorId: 'writer' }), []);
  assert.equal(communityCommentNotifications({ ...event, parentAuthorId: 'writer' }).length, 1);
  assert.deepEqual(communityCommentNotifications({ ...event, actorId: 'writer', parentAuthorId: 'parent' }).map(n => n.user_id), ['parent']);
});

test('비밀 답글은 볼 수 없는 원댓글 작성자에게 알리지 않는다', () => {
  const messages = communityCommentNotifications({ ...event, secret: true, parentAuthorId: 'parent' });
  assert.deepEqual(messages.map(n => n.user_id), ['writer']);
  assert.ok(messages.every(n => !n.content.includes('commenter')));
});

test('재시도는 같은 알림 ID를 사용하고 수신자·댓글이 다르면 별도 ID를 사용한다', () => {
  const message = communityCommentNotifications(event)[0];
  assert.match(message.id, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(message.id, communityCommentNotifications(event)[0].id);
  assert.notEqual(message.id, communityCommentNotifications({ ...event, commentId: 'comment-b' })[0].id);
  assert.notEqual(message.id, communityCommentNotifications({ ...event, postAuthorId: 'other' })[0].id);
});

test('의사 전용 글 알림은 의사 커뮤니티 상세로 연결한다', () => {
  for (const board of ['free', 'dental']) {
    assert.equal(communityCommentNotifications({ ...event, board })[0].link, '/partner/community/post-a');
  }
});
