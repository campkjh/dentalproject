import assert from 'node:assert/strict';
import test from 'node:test';
import { bookingPricing } from '../src/lib/booking-pricing';
import { matchesSearchRegion } from '../src/lib/search-region';
import { naverMarkerURL } from '../src/lib/hospital-map';
import { nativePushPolicy, pushPreferences } from '../src/lib/push/policy';
import { reviewDraft, tidyReviewSpacing } from '../src/lib/review-draft';

test('외부 전송 없는 후기 초안은 부정적 평가를 유지하고 입력하지 않은 효과를 추가하지 않는다', () => {
  const draft = reviewDraft({ hospital: '검증병원', treatment: '임플란트', rating: 1, content: '', aspects: { kindness: 1, cleanliness: 0, price: 0, revisit: 0 } });
  assert.ok(draft.length >= 50);
  assert.match(draft, /아쉬운 경험/);
  assert.doesNotMatch(draft, /빠른 회복|통증|추천|결과도 기대/);
  assert.equal(tidyReviewSpacing('정말친절했어요.다음에도  방문할 것같아요.'), '정말 친절했어요. 다음에도 방문할 것 같아요.');
  assert.equal(reviewDraft({ hospital: '검증병원', treatment: '시술', rating: 5, content: '결과는 아쉬웠어요.', aspects: { kindness: 0, cleanliness: 0, price: 0, revisit: 0 } }), '결과는 아쉬웠어요.');
});

test('보유 500P라도 10원 상품에서는 10P만 사용하며 쿠폰을 먼저 차감한다', () => {
  assert.deepEqual(bookingPricing(10, 500, 0, 500), { coupon: 0, maxPoints: 10, points: 10, amount: 0 });
  assert.deepEqual(bookingPricing(200, 500, 150, 500), { coupon: 150, maxPoints: 50, points: 50, amount: 0 });
  assert.equal(bookingPricing(200, 50, 0, 500).amount, 150);
  assert.equal(bookingPricing(200, 0, 300, -100).amount, 0);
});

test('경기 전체는 수원 주소를 포함하며 다른 도의 동명 시·군을 섞지 않는다', () => {
  const suwon = '경기도 수원시 권선구 권선로357번길 30';
  assert.equal(matchesSearchRegion(suwon, ['경기']), true);
  assert.equal(matchesSearchRegion(suwon, ['경기 전체']), true);
  assert.equal(matchesSearchRegion(suwon, ['경기 수원시']), true);
  assert.equal(matchesSearchRegion('경기 수원시 권선구', ['경기']), true);
  assert.equal(matchesSearchRegion('광주광역시 북구', ['경기 광주시']), false);
  assert.equal(matchesSearchRegion('경기도 광주시', ['광주']), false);
  assert.equal(matchesSearchRegion('강원특별자치도 춘천시', ['강원']), true);
});

test('포인트 적립은 혜택 설정에 따르고 광고는 별도 동의가 필요하다', () => {
  const points = { type: 'info', title: '후기 작성 포인트 적립', link: '/mypage/points' };
  assert.equal(nativePushPolicy(points, pushPreferences({ event: false, message: true })).allowed, false);
  assert.equal(nativePushPolicy(points, pushPreferences({ event: true, message: false })).allowed, true);
  assert.equal(nativePushPolicy({ type: 'recommendation', title: '맞춤 광고' }, pushPreferences({ event: true, marketing: false })).allowed, false);
  assert.equal(nativePushPolicy({ type: 'recommendation', title: '예약 할인 혜택', link: '/reservations/a' }, pushPreferences({ reservation: true, marketing: false })).allowed, false);
  assert.equal(nativePushPolicy(points, pushPreferences({ night: true })).quiet, false);
});

test('네이버 지도 호출에는 목적지 좌표와 이름을 넣어 핀을 표시한다', () => {
  const url = new URL(naverMarkerURL(37.25, 127.01, '테스트병원'));
  assert.equal(url.protocol, 'nmap:');
  assert.equal(url.hostname, 'place');
  assert.equal(url.searchParams.get('lat'), '37.25');
  assert.equal(url.searchParams.get('lng'), '127.01');
  assert.equal(url.searchParams.get('name'), '테스트병원');
});
