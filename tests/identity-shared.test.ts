import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { IDV_ID_PATTERN, MIN_AGE, isIdentityVerificationId, koreanAge, safeNextPath } from '../src/lib/identity-shared';

/** 한국 시간 정오 — 날짜 경계에서 먼 시각 */
function kstNoon(date: string) {
  return new Date(`${date}T12:00:00+09:00`);
}

test('서버가 발급하는 idv + 32hex 인증 ID와 KCP 한도(40자)까지의 ID를 받는다', () => {
  // /api/identity/start 와 같은 방식으로 만든 ID
  const issued = `idv${randomUUID().replace(/-/g, '')}`;
  assert.equal(issued.length, 35);
  assert.ok(IDV_ID_PATTERN.test(issued));
  assert.ok(isIdentityVerificationId(issued));
  assert.ok(isIdentityVerificationId('idv0123456789abcdef0123456789abcdef'));
  assert.ok(isIdentityVerificationId(`idv${'a'.repeat(37)}`));
});

test('밑줄·하이픈이 있거나 40자를 넘는 등 KCP가 받지 않는 ID는 거부한다', () => {
  const hex = '0123456789abcdef0123456789abcdef';
  for (const value of [
    'idv_1731745600000_ab12cd34', // 예전 형식(밑줄)
    `idv_${hex}`,
    `idv${randomUUID()}`, // 하이픈이 남은 UUID
    `idv-${hex}`,
    `idv${'a'.repeat(38)}`, // 41자
    'idv',
    'idv1234567',
    `IDV${hex}`,
    `pay${hex}`,
    ` idv${hex}`,
    `idv${hex}\n`,
    '',
  ]) {
    assert.equal(IDV_ID_PATTERN.test(value), false, JSON.stringify(value));
    assert.equal(isIdentityVerificationId(value), false, JSON.stringify(value));
  }
});

test('문자열이 아닌 값은 문자열로 바꾸면 형식이 맞아도 거부한다', () => {
  const valid = `idv${'0'.repeat(32)}`;
  for (const value of [undefined, null, 35, {}, [valid], { toString: () => valid }]) {
    assert.equal(isIdentityVerificationId(value), false);
  }
});

test('같은 사이트 안의 경로는 그대로 돌려준다', () => {
  assert.equal(safeNextPath('/booking?productId=1'), '/booking?productId=1');
  assert.equal(safeNextPath('/'), '/');
  assert.equal(safeNextPath('/mypage/reservations'), '/mypage/reservations');
  // 정확히 /verify-identity 와 그 쿼리·하위 경로만 막고, 이름만 비슷한 다른 경로는 막지 않는다
  assert.equal(safeNextPath('/verify-identityx'), '/verify-identityx');
});

test('빈 값이나 다른 사이트로 해석될 수 있는 값은 홈으로 돌린다', () => {
  for (const value of [
    null,
    undefined,
    '',
    'booking',
    'https://x',
    'https://evil.com/booking',
    'javascript:alert(1)',
    '//evil.com',
    '//evil.com/booking',
    '/\\evil.com', // 브라우저는 '/\'를 '//'처럼 해석한다
    '/booking\\..\\..',
  ]) {
    assert.equal(safeNextPath(value), '/', JSON.stringify(value));
  }
});

test('제어문자가 섞인 경로는 홈으로 돌린다 — 브라우저가 탭·줄바꿈을 지우면 //가 될 수 있다', () => {
  for (const value of ['/\t/evil.com', '/\n/evil.com', '/\r/evil.com', '/booking\u0000', '/booking\u001F', '/booking\u007F']) {
    assert.equal(safeNextPath(value), '/', JSON.stringify(value));
  }
});

test('인증 페이지 자신으로는 돌아가지 않는다', () => {
  for (const value of [
    '/verify-identity',
    '/verify-identity?next=/x',
    `/verify-identity?identityVerificationId=idv${'0'.repeat(32)}`,
    '/verify-identity/',
  ]) {
    assert.equal(safeNextPath(value), '/', value);
  }
});

test('만 나이는 한국 날짜로 센다 — UTC로는 전날이어도 KST로 생일이면 한 살 더', () => {
  // 2026-11-15T15:00Z = 2026-11-16 00:00 KST
  assert.equal(koreanAge('2007-11-16', new Date('2026-11-15T14:59:59.999Z')), 18);
  assert.equal(koreanAge('2007-11-16', new Date('2026-11-15T15:00:00.000Z')), 19);
});

test('만 19세 생일 전날은 18세, 생일 당일부터 19세', () => {
  assert.equal(MIN_AGE, 19);
  assert.equal(koreanAge('2007-11-16', kstNoon('2026-11-15')), 18);
  assert.equal(koreanAge('2007-11-16', kstNoon('2026-11-16')), MIN_AGE);
  assert.equal(koreanAge('2007-11-16', kstNoon('2026-11-17')), 19);
  // 생일 달이 아직 안 왔거나 이미 지난 경우
  assert.equal(koreanAge('2007-12-01', kstNoon('2026-11-16')), 18);
  assert.equal(koreanAge('2007-01-31', kstNoon('2026-11-16')), 19);
});

test('2월 29일생은 평년에 2월 28일까지 생일 전, 3월 1일부터 생일이 지난 것으로 본다', () => {
  assert.equal(koreanAge('2004-02-29', kstNoon('2023-02-28')), 18);
  assert.equal(koreanAge('2004-02-29', kstNoon('2023-03-01')), 19);
  // KST 3월 1일 0시(UTC 2월 28일 15시)부터 19세
  assert.equal(koreanAge('2004-02-29', new Date('2023-02-28T14:59:59.999Z')), 18);
  assert.equal(koreanAge('2004-02-29', new Date('2023-02-28T15:00:00.000Z')), 19);
  // 윤년에는 2월 29일 당일에 한 살 더
  assert.equal(koreanAge('2004-02-29', kstNoon('2024-02-28')), 19);
  assert.equal(koreanAge('2004-02-29', kstNoon('2024-02-29')), 20);
});

test('YYYY-MM-DD 형식의 실제 날짜가 아니면 null — NaN으로 나이 검사를 통과하지 않는다', () => {
  const now = kstNoon('2026-11-16');
  for (const value of [
    '2007.11.16',
    '2007-02-30',
    '',
    '2005-02-29', // 평년의 2월 29일
    '2007-11-31',
    '2007-11-00',
    '2007-13-01',
    '2007-00-10',
    '2007-1-6',
    '20071116',
    ' 2007-11-16',
    '2007-11-16T00:00:00Z',
  ]) {
    assert.equal(koreanAge(value, now), null, JSON.stringify(value));
  }
  // 포트원 응답에 생년월일이 빠져 들어와도 예외 없이 null
  assert.equal(koreanAge(undefined as unknown as string, now), null);
  assert.equal(koreanAge(null as unknown as string, now), null);
});

test('미래 날짜는 null, 오늘 태어났으면 0세', () => {
  const now = kstNoon('2026-11-16');
  assert.equal(koreanAge('2027-01-01', now), null);
  assert.equal(koreanAge('2026-12-01', now), null); // 올해지만 아직 오지 않은 날
  assert.equal(koreanAge('2026-11-17', now), null);
  assert.equal(koreanAge('2026-11-16', now), 0);
});
