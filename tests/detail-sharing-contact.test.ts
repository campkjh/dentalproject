import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPhone } from '../src/lib/phone';
import { detailMetadata, unavailableDetailMetadata } from '../src/lib/share-metadata';

test('병원 전화번호는 서울·지역·휴대전화·대표번호를 구분하고 알 수 없는 형식은 보존한다', () => {
  for (const [value, expected] of [['021234567','02-123-4567'], ['0212345678','02-1234-5678'], ['0311234567','031-123-4567'], ['01012345678','010-1234-5678'], ['15881234','1588-1234'], ['031-123-4567','031-123-4567'], ['123','123']]) assert.equal(formatPhone(value), expected);
});

test('공유 미리보기는 상품 사진·상품명·가격·병원 설명과 공개 상품 URL을 사용한다', () => {
  const metadata = detailMetadata({ path: '/product/p1', title: '테스트 시술', description: '테스트 병원 · 50,000원', image: '/product-photo.jpg' });
  assert.equal(metadata.title, '테스트 시술 | 마이닥');
  assert.equal(metadata.openGraph?.title, '테스트 시술');
  assert.equal(metadata.openGraph?.description, '테스트 병원 · 50,000원');
  assert.equal(metadata.openGraph?.url, 'https://my-doc.co.kr/product/p1');
  assert.deepEqual(metadata.openGraph?.images, [{ url: 'https://my-doc.co.kr/product-photo.jpg', alt: '테스트 시술' }]);
});

test('기기 전용 이미지와 잘못된 이미지 URL을 공유 이미지로 내보내지 않는다', () => {
  for (const image of ['blob:local-photo', 'data:image/png;base64,abc', 'javascript:alert(1)', '//elsewhere/photo.jpg']) {
    assert.deepEqual(detailMetadata({ path: '/product/p', title: '시술', description: '', image }).openGraph?.images, []);
  }
  assert.deepEqual(unavailableDetailMetadata().robots, { index: false, follow: false });
});
