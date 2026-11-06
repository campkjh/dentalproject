import assert from 'node:assert/strict';
import test from 'node:test';
import { maskReviewAuthor } from '../src/lib/review-display';

test('후기 사진 작성자 이름은 가운데를 가려 표시한다', () => {
  assert.equal(maskReviewAuthor('김민수'), '김*수');
  assert.equal(maskReviewAuthor('김철'), '김*');
  assert.equal(maskReviewAuthor('김'), '*');
  assert.equal(maskReviewAuthor('테스트유저'), '테***저');
});

test('마스킹된 이름은 유지하고 빈 이름과 유니코드도 처리한다', () => {
  assert.equal(maskReviewAuthor(' 김*수 '), '김*수');
  assert.equal(maskReviewAuthor(''), '익명');
  assert.equal(maskReviewAuthor('🍎테스트🍏'), '🍎***🍏');
});
