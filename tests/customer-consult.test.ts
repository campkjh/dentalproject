import assert from 'node:assert/strict';
import test from 'node:test';
import { postInCategory, postInCustomerConsult, TIP_TAG } from '../src/lib/community';
import type { Post } from '../src/types';

const question = { boardType: 'question' as Post['boardType'], tags: ['시술질문'], authorId: 'customer', hasAnswer: false, answerCount: 0 };
const tip = { ...question, tags: [TIP_TAG], authorId: 'doctor-a', authorTitle: '의사' };

test('고객상담 전체 글은 내 꿀팁과 다른 의사의 꿀팁 및 고객 질문을 모두 보여준다', () => {
  for (const post of [question, tip, { ...tip, authorId: 'doctor-b' }]) {
    assert.equal(postInCustomerConsult(post, 'all', 'doctor-a'), true);
    assert.equal(postInCategory(post, '전체'), true);
  }
});

test('답변 대기는 꿀팁과 답변 완료 질문을 제외한다', () => {
  assert.equal(postInCustomerConsult(question, 'waiting', 'doctor-a'), true);
  assert.equal(postInCustomerConsult(tip, 'waiting', 'doctor-a'), false);
  assert.equal(postInCustomerConsult({ ...question, hasAnswer: true }, 'waiting'), false);
  assert.equal(postInCustomerConsult({ ...question, answerCount: 1 }, 'waiting'), false);
});

test('내 꿀팁은 현재 의사의 글만 보여주며 태그 없는 기존 의사 글도 포함한다', () => {
  assert.equal(postInCustomerConsult(tip, 'mytips', 'doctor-a'), true);
  assert.equal(postInCustomerConsult({ ...tip, tags: [] }, 'mytips', 'doctor-a'), true);
  assert.equal(postInCustomerConsult(tip, 'mytips', 'doctor-b'), false);
  assert.equal(postInCustomerConsult(tip, 'mytips'), false);
  assert.equal(postInCustomerConsult(question, 'mytips', 'customer'), false);
});

test('의사 라운지의 자유·과별 글은 고객상담에 노출하지 않는다', () => {
  for (const boardType of ['free', 'dental'] as const) {
    for (const filter of ['all', 'waiting', 'mytips'] as const) {
      assert.equal(postInCustomerConsult({ ...tip, boardType }, filter, 'doctor-a'), false);
    }
  }
});
