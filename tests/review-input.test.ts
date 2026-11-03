import assert from 'node:assert/strict';
import test from 'node:test';
import { initialReviewLimitError, reviewInput } from '../src/lib/review-input';
import { reviewPhotoSources } from '../src/lib/review-photos';

const base = { rating: 5, content: '시술 전 상담부터 안내와 진료까지 모두 친절하게 설명해 주셨고 결과도 만족스러웠습니다. 다음에도 방문하고 싶습니다.' };

test('사진 한 장 모드에서는 편집된 한 장만 업로드하고 비활성 전후 사진은 제외한다', () => {
  assert.deepEqual(reviewPhotoSources({ mode: 'single', before: 'old-before', after: 'old-after', single: 'mosaic-edited' }), { beforeImage: '', afterImage: 'mosaic-edited' });
  assert.deepEqual(reviewPhotoSources({ mode: 'before-after', before: 'before-edited', after: 'after-edited', single: 'unused-single' }), { beforeImage: 'before-edited', afterImage: 'after-edited' });
});

test('사진 한 장을 기존 리뷰 이미지 필드에 보존하고 텍스트 리뷰도 허용한다', () => {
  const parsed = reviewInput.parse({ ...base, afterImage: 'https://example.com/edited.jpg' });
  assert.equal(parsed.afterImage, 'https://example.com/edited.jpg');
  assert.equal(parsed.beforeImage, undefined);
  assert.equal(reviewInput.safeParse(base).success, true);
});

test('전후 비교 사진과 날짜·비용을 보존한다', () => {
  const parsed = reviewInput.parse({ ...base, beforeImage: 'https://example.com/before.jpg', afterImage: 'https://example.com/after.jpg', treatmentDate: '2026-11-03', totalCost: 120000 });
  assert.equal(parsed.treatmentDate, '2026-11-03');
  assert.equal(parsed.totalCost, 120000);
  assert.ok(parsed.beforeImage && parsed.afterImage);
});

test('업로드되지 않은 원본 데이터·잘못된 날짜·별점·빈 리뷰는 저장하지 않는다', () => {
  for (const patch of [{ afterImage: 'data:image/jpeg;base64,original' }, { afterImage: 'javascript:alert(1)' }, { treatmentDate: '1달 전' }, { treatmentDate: '2026-02-31' }, { rating: 0 }, { content: ' '.repeat(100) }, { totalCost: -1 }]) {
    assert.equal(reviewInput.safeParse({ ...base, ...patch }).success, false, JSON.stringify(patch));
  }
});

test('병원 초기 리뷰 제한은 등록 후 30일과 이미지10개·텍스트20개로 구분한다', () => {
  const now = new Date('2026-11-03T03:00:00Z').getTime();
  const recent = '2026-11-01T03:00:00Z';
  assert.equal(initialReviewLimitError(recent, 9, 20, true, now), null);
  assert.equal(initialReviewLimitError(recent, 10, 19, false, now), null);
  assert.ok(initialReviewLimitError(recent, 10, 0, true, now));
  assert.ok(initialReviewLimitError(recent, 0, 20, false, now));
  assert.ok(initialReviewLimitError('2026-10-04T03:00:00Z', 0, 0, false, now));
  assert.ok(initialReviewLimitError('invalid', 0, 0, false, now));
});
