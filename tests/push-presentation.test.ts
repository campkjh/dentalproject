import assert from 'node:assert/strict';
import test from 'node:test';
import { nativePushPresentation } from '../src/lib/push/presentation';
import { communityCommentNotifications } from '../src/lib/community-comment-notification';
import { doctorAcceptedNotification } from '../src/lib/doctor-membership-notification';

test('고객·의사 커뮤니티 댓글과 답글은 실제 알림 생성 결과로 출처와 동작을 표시한다', () => {
  for (const board of ['question', 'free', 'dental']) {
    const notices = communityCommentNotifications({ commentId: 'a', postId: 'p', board, actorId: 'writer', postAuthorId: 'owner', parentAuthorId: 'parent', secret: false });
    const comment = nativePushPresentation(notices[0]);
    assert.equal(comment.title, '커뮤니티 · 새 댓글이 등록되었습니다');
    assert.equal(comment.body, '내 게시글에 새 댓글이 달렸어요.');
    const reply = nativePushPresentation(notices[1]);
    assert.equal(reply.title, '커뮤니티 · 새 답글이 등록되었습니다');
    assert.equal(reply.body, '내 댓글에 새 답글이 달렸어요.');
  }
});

test('각 알림은 상담·예약·리뷰·결제·병원·원장 등 올바른 항목으로 구분한다', () => {
  const cases = [
    ['새 상담 메시지가 도착했습니다', '/consult/h', '상담'],
    ['새 상담 메시지가 도착했습니다', '/partner/chat?roomId=r', '상담'],
    ['예약이 접수되었습니다', '/reservations/r', '예약'],
    ['새 예약이 들어왔습니다', '/hospital/appointments', '예약'],
    ['예약 스케줄이 변경되었습니다', '/partner/reservations/r', '예약'],
    ['후기 작성 완료', '/mypage/points', '리뷰'],
    ['새 후기가 등록되었습니다', '/hospital/manage', '리뷰'],
    ['입금이 확인되었습니다', '/reservations/r', '결제'],
    ['포인트가 적립되었습니다', '/mypage/points', '포인트'],
    ['병원 신청이 정상적으로 접수되었습니다', '/mypage', '병원 등록'],
    ['병원 등록이 승인되었습니다', '/partner', '병원 등록'],
    ['병원 등록 신청이 반려되었습니다', '/mypage', '병원 등록'],
    ['병원이 일시 정지되었습니다', '/mypage', '병원 등록'],
    ['병원 상태가 검토 중으로 변경되었습니다', '/mypage', '병원 등록'],
    ['문의가 접수되었습니다', '/partner/contact', '고객센터'],
    ['[파트너 문의] 병원 등록', '/admin/notifications', '고객센터'],
    ['예약 관련 공지', '/mypage/announcements/a', '공지'],
    ['새 팔로워', '/user/u', '커뮤니티'],
  ];
  for (const [title, link, label] of cases) {
    assert.equal(nativePushPresentation({ type: 'info', title, link }).title, `${label} · ${title}`);
  }
  const accepted = nativePushPresentation(doctorAcceptedNotification('d', 'u', '병원명'));
  assert.match(accepted.title, /^원장 등록 · .*수락/);
  assert.match(accepted.body, /수락/);
});

test('예약 취소·변경·확정은 각각 해당 상태를 안내한다', () => {
  for (const state of ['취소', '변경', '확정']) {
    const result = nativePushPresentation({ type: 'important', title: `예약이 ${state}되었습니다`, link: '/reservations/r' });
    assert.ok(result.body.includes(state));
  }
});

test('명시된 이벤트·추천과 알 수 없는 시스템 알림도 원래 제목을 보존한다', () => {
  assert.equal(nativePushPresentation({ type: 'event', title: '예약 이벤트' }).title, '이벤트 · 예약 이벤트');
  assert.equal(nativePushPresentation({ type: 'recommendation', title: '맞춤 추천' }).title, '추천 · 맞춤 추천');
  assert.equal(nativePushPresentation({ type: 'info', title: 'iOS 푸시 수신 테스트', link: '/notifications' }).title, '마이닥 · iOS 푸시 수신 테스트');
});

test('비밀 댓글·상담 내용과 의료 정보는 푸시 본문에 포함하지 않는다', () => {
  const secret = '개인 이름과 비밀 상담 및 시술 내용';
  for (const link of ['/community/p', '/partner/community/p', '/consult/h', '/partner/chat?roomId=r']) {
    const notice = { type: 'info', title: '새 댓글이 등록되었습니다', link, content: secret };
    assert.ok(!JSON.stringify(nativePushPresentation(notice)).includes(secret));
  }
  const long = nativePushPresentation({ type: 'info', title: '긴 제목\n'.repeat(1000) });
  assert.ok(Array.from(long.title).length <= 80);
  assert.ok(!long.title.includes('\n'));
});
