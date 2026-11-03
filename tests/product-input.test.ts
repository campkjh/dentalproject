import assert from 'node:assert/strict';
import test from 'node:test';
import { currencyDigits, currencySelection, formatCurrency } from '../src/lib/currency-input';
import { prepareProductImage, PRODUCT_IMAGE_MAX_BYTES } from '../src/lib/product-image-input';
import { productGalleryImages } from '../src/lib/images';

test('상품 갤러리는 고른 썸네일 순서만 유지하고 병원 대문·상세 사진을 섞지 않는다', () => {
  const product = { id: 'p', imageUrl: '/thumb-a.jpg', imageUrls: ['/thumb-a.jpg', '/thumb-b.jpg', '/thumb-a.jpg'], detailImageUrl: '/detail.jpg', coverImages: ['/hospital.jpg'] };
  assert.deepEqual(productGalleryImages(product), ['/thumb-a.jpg', '/thumb-b.jpg']);
  assert.deepEqual(productGalleryImages({ ...product, imageUrls: [] }), ['/thumb-a.jpg']);
});

test('상품 금액은 쉼표를 표시하면서 저장할 숫자와 빈 입력을 보존한다', () => {
  for (const [input, display, stored] of [
    ['', '', ''], ['500000', '500,000', '500000'], ['500,000원', '500,000', '500000'],
    ['0012000', '12,000', '12000'], ['0', '0', '0'], ['9007199254740993', '9,007,199,254,740,993', '9007199254740993'],
  ]) {
    assert.equal(formatCurrency(input), display);
    assert.equal(currencyDigits(display), stored);
  }
});

test('금액 중간 편집과 쉼표 자리 삭제에서 커서가 마지막으로 튀지 않는다', () => {
  assert.deepEqual(currencySelection('500000', 6), { formatted: '500,000', cursor: 7 });
  assert.deepEqual(currencySelection('5100,000', 2), { formatted: '5,100,000', cursor: 3 });
  assert.deepEqual(currencySelection('500000', 3), { formatted: '500,000', cursor: 3 });
  assert.deepEqual(currencySelection('', 0), { formatted: '', cursor: 0 });
});

test('사진 선택기가 MIME을 비워도 확장자가 유효하면 원본과 순서를 보존한다', () => {
  const file = new File(['original'], 'selected.JPG', { lastModified: 123 });
  const prepared = prepareProductImage(file);
  assert.equal(prepared.type, 'image/jpeg');
  assert.equal(prepared.name, file.name);
  assert.equal(prepared.size, file.size);
  assert.equal(prepared.lastModified, file.lastModified);
  const png = new File(['image'], 'selected.png', { type: 'image/png' });
  assert.equal(prepareProductImage(png), png);
});

test('미지원 형식과 25MB 초과 사진은 파일명을 포함해 안내한다', () => {
  assert.throws(() => prepareProductImage(new File(['photo'], 'selected.heic', { type: 'image/heic' })), /selected.heic.*JPG/);
  assert.throws(() => prepareProductImage(new File(['doc'], 'other.pdf', { type: 'application/pdf' })), /other.pdf/);
  const atLimit = new File([new Uint8Array(PRODUCT_IMAGE_MAX_BYTES)], 'limit.png', { type: 'image/png' });
  assert.equal(prepareProductImage(atLimit), atLimit);
  const tooLarge = new File([new Uint8Array(PRODUCT_IMAGE_MAX_BYTES + 1)], 'large.png', { type: 'image/png' });
  assert.throws(() => prepareProductImage(tooLarge), /large.png.*25MB/);
});
