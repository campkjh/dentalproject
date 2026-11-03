import { createHash } from 'node:crypto';

type CommentEvent = {
  commentId: string;
  postId: string;
  board: string;
  actorId: string;
  postAuthorId: string;
  parentAuthorId?: string;
  secret: boolean;
};

export function communityCommentNotifications(event: CommentEvent) {
  const recipients = new Set([event.postAuthorId]);
  // A secret reply is only visible to its writer and the post author.
  if (!event.secret && event.parentAuthorId) recipients.add(event.parentAuthorId);
  recipients.delete(event.actorId);
  return [...recipients].map(userId => {
    const hash = createHash('sha256').update(`community-comment:${event.commentId}:${userId}`).digest('hex');
    const reply = userId === event.parentAuthorId;
    return {
      id: `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`,
      user_id: userId,
      type: 'info',
      title: reply ? '새 답글이 등록되었습니다' : '새 댓글이 등록되었습니다',
      content: reply ? '회원님의 댓글에 새 답글이 등록됐어요.' : '회원님의 게시글에 새 댓글이 등록됐어요.',
      link: `${event.board === 'question' ? '/community' : '/partner/community'}/${event.postId}`,
    };
  });
}
