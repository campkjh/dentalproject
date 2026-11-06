import assert from 'node:assert/strict';
import test from 'node:test';
import { loginTypePresentation, resolveLoginType } from '../src/lib/login-type';

test('이메일·카카오·애플을 각각 표시하고 알 수 없는 유형을 애플로 취급하지 않는다', () => {
  assert.deepEqual(loginTypePresentation('email'), { label: '이메일', description: '이메일로 로그인했어요' });
  assert.equal(loginTypePresentation('kakao').label, '카카오');
  assert.equal(loginTypePresentation('apple').label, '애플');
  for (const value of [undefined, null, 'unknown', 'other']) {
    assert.equal(loginTypePresentation(value).label, '확인 필요');
  }
});

test('인증 계정의 제공자를 프로필 저장값보다 우선한다', () => {
  assert.equal(resolveLoginType('email', 'apple'), 'email');
  assert.equal(resolveLoginType('kakao', 'email'), 'kakao');
  assert.equal(resolveLoginType('apple', 'email'), 'apple');
});

test('인증 제공자가 없는 이전 계정은 저장값을 사용하며 정보가 없으면 추측하지 않는다', () => {
  assert.equal(resolveLoginType(undefined, 'email'), 'email');
  assert.equal(resolveLoginType(undefined, 'kakao'), 'kakao');
  assert.equal(resolveLoginType(null, 'apple'), 'apple');
  assert.equal(resolveLoginType(undefined, undefined), 'unknown');
  assert.equal(resolveLoginType('other', 'apple'), 'unknown');
});
