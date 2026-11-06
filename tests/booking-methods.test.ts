import assert from 'node:assert/strict';
import test from 'node:test';
import { BOOKING_METHODS, getBookingMethods, isBookingMethods, matchesBookingMethod } from '../src/lib/booking-methods';
import { normalizeHospital, normalizeProduct } from '../src/lib/api/normalize';

test('병원 예약방식은 한 개 이상 복수 선택할 수 있으며 잘못된 저장값을 거절한다', () => {
  assert.equal(isBookingMethods(['현장결제']), true);
  assert.equal(isBookingMethods(['앱결제', '상담 후 결제']), true);
  for (const value of [[], null, '앱결제', ['card'], ['앱결제', '앱결제'], ['앱결제', null]]) {
    assert.equal(isBookingMethods(value), false);
  }
});

test('서로 다른 병원의 상품은 소유 병원의 방식으로 필터링한다', () => {
  const products = [
    normalizeProduct({ id: 'a', hospitals: { id: 'hospital-a', booking_methods: ['현장결제'] } }),
    normalizeProduct({ id: 'b', hospitals: { id: 'hospital-b', booking_methods: ['앱결제', '상담 후 결제'] } }),
  ];
  const ids = (selected: string) => products.filter((p) => matchesBookingMethod(p.bookingMethods, selected)).map((p) => p.id);
  assert.deepEqual(ids('전체'), ['a', 'b']);
  assert.deepEqual(ids('현장결제'), ['a']);
  assert.deepEqual(ids('앱결제'), ['b']);
  assert.deepEqual(ids('상담 후 결제'), ['b']);
  assert.deepEqual(ids('unknown'), []);
});

test('병원과 상품의 공개 데이터에 저장된 방식이 유지된다', () => {
  assert.deepEqual(normalizeHospital({ booking_methods: ['현장결제'] }).bookingMethods, ['현장결제']);
  assert.deepEqual(getBookingMethods(undefined), [...BOOKING_METHODS]);
  const defaults = getBookingMethods(null);
  defaults.pop();
  assert.equal(getBookingMethods(null).length, 3);
});
