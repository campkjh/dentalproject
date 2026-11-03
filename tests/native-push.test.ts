import assert from 'node:assert/strict';
import test from 'node:test';
import { nativePushLink, nativePushPolicy, pushPreferences } from '../src/lib/push/policy';

test('푸시 링크는 앱 내부 경로만 허용하고 외부·스크립트·잘못된 경로는 알림함으로 보낸다', () => {
  assert.equal(nativePushLink('/partner/community/post-a'), '/partner/community/post-a');
  for (const link of ['//evil.example', '/\\evil.example', 'https://evil.example', 'javascript:alert(1)', '/\nevil', null]) {
    assert.equal(nativePushLink(link), '/notifications');
  }
});

test('활동 알림은 기본 허용하고 마케팅은 명시적으로 동의해야 보낸다', () => {
  const settings = pushPreferences(null);
  assert.equal(nativePushPolicy({ type: 'info', title: '새 댓글', link: '/community/a' }, settings).allowed, true);
  assert.equal(nativePushPolicy({ type: 'recommendation', title: '추천' }, settings).allowed, false);
  assert.equal(nativePushPolicy({ type: 'recommendation', title: '추천' }, pushPreferences({ marketing: true })).allowed, true);
});

test('각 활동 알림 설정은 실제 예약·커뮤니티·쪽지 발송을 제어한다', () => {
  const settings = pushPreferences({ reservation: false, community: false, message: false });
  for (const notice of [
    { type: 'info', title: '새 댓글', link: '/partner/community/a' },
    { type: 'important', title: '예약이 접수되었습니다', link: '/reservations/a' },
    { type: 'info', title: '답변이 도착했습니다', link: '/consult/a' },
  ]) assert.equal(nativePushPolicy(notice, settings).allowed, false);
});

test('야간 방해 금지는 한국 시간 22시부터 오전 8시 전까지 소리만 끈다', () => {
  const notice = { type: 'info', title: '알림' };
  const settings = pushPreferences(null);
  assert.equal(nativePushPolicy(notice, settings, new Date('2026-11-03T12:59:00Z')).quiet, false);
  assert.equal(nativePushPolicy(notice, settings, new Date('2026-11-03T13:00:00Z')).quiet, true);
  assert.equal(nativePushPolicy(notice, settings, new Date('2026-11-03T22:59:00Z')).quiet, true);
  assert.equal(nativePushPolicy(notice, settings, new Date('2026-11-03T23:00:00Z')).quiet, false);
  assert.equal(nativePushPolicy(notice, pushPreferences({ night: false }), new Date('2026-11-03T15:00:00Z')).quiet, false);
});
