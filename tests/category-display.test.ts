import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeCategory, normalizeHospital, normalizeProduct } from '../src/lib/api/normalize';
import { categoryLabel, specialtyLabel, toCategoryCode } from '../src/lib/category-code';

test('한글 표시로 바꿔도 기존·신규 상품이 같은 고객 카테고리 필터에 매칭된다', () => {
  const category = normalizeCategory({ id: 'internal', name: 'internal' });
  const coded = normalizeProduct({ id: 'p1', category: 'internal' });
  const named = normalizeProduct({ id: 'p2', category: '내과' });
  assert.equal(category.name, '내과');
  assert.equal(coded.category, category.id);
  assert.equal(named.category, category.id);
  assert.equal(normalizeHospital({ id: 'h1', name: '병원명', category: 'internal' }).name, '병원명');
  assert.equal(normalizeHospital({ id: 'h1', category: 'internal' }).category, '내과');
});

test('옛 진료과 코드도 표시명과 필터 ID를 함께 정규화한다', () => {
  const category = normalizeCategory({ id: 'skin', name: 'dermatology' });
  const product = normalizeProduct({ id: 'p1', category: 'skin' });
  assert.equal(category.name, '피부과');
  assert.equal(product.category, category.id);
  assert.equal(toCategoryCode(' Internal_Medicine '), 'internal');
  assert.equal(categoryLabel('unknown-code'), '기타');
});

test('의사 자유 입력 타이틀과 사용자 정의 한글 카테고리는 보존한다', () => {
  assert.equal(specialtyLabel('pediatric'), '소아과');
  assert.equal(specialtyLabel('치과교정과 전문의'), '치과교정과 전문의');
  assert.equal(specialtyLabel('DDS, PhD'), 'DDS, PhD');
  const category = normalizeCategory({ id: 'custom-care', name: '맞춤 진료' });
  assert.equal(category.id, 'custom-care');
  assert.equal(category.name, '맞춤 진료');
});
