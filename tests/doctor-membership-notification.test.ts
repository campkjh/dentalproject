import assert from 'node:assert/strict';
import test from 'node:test';
import { doctorAcceptedNotification } from '../src/lib/doctor-membership-notification';

test('수락 쪽지는 신청 원장에게 발송되며 소속 병원과 이동 화면을 포함한다', () => {
  const message = doctorAcceptedNotification('doctor-a', 'applicant-a', '테스트치과');
  assert.equal(message.user_id, 'applicant-a');
  assert.equal(message.type, 'important');
  assert.match(message.title, /수락/);
  assert.match(message.content, /테스트치과/);
  assert.equal(message.link, '/partner/account');
});

test('수락 재시도는 같은 알림 ID를 사용하고 다른 원장에게는 별도 알림을 보낸다', () => {
  const message = doctorAcceptedNotification('doctor-a', 'applicant-a', '테스트치과');
  assert.match(message.id, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(message.id, doctorAcceptedNotification('doctor-a', 'applicant-a', '테스트치과').id);
  assert.notEqual(message.id, doctorAcceptedNotification('doctor-b', 'applicant-b', '테스트치과').id);
});
