import assert from 'node:assert/strict';
import test from 'node:test';
import { constrainPhotoTransform, pinchPhotoTransform } from '../src/lib/photo-zoom';
const bounds = { width: 300, height: 400 };
test('두 손가락 벌리기는 터치 지점을 기준으로 사진을 확대한다', () => {
  assert.deepEqual(pinchPhotoTransform({scale:1,x:0,y:0},{x:50,y:20},{x:50,y:20},2,bounds), {scale:2,x:-50,y:-20});
});
test('축소하면 원래 크기로 돌아가며 최대 4배를 넘기지 않는다', () => {
  assert.deepEqual(pinchPhotoTransform({scale:2,x:50,y:20},{x:0,y:0},{x:0,y:0},.2,bounds),{scale:1,x:0,y:0});
  assert.equal(pinchPhotoTransform({scale:1,x:0,y:0},{x:0,y:0},{x:0,y:0},20,bounds).scale,4);
});
test('확대한 사진은 끝을 넘겨 끌어도 화면 밖으로 사라지지 않는다', () => {
  assert.deepEqual(constrainPhotoTransform({scale:2,x:10000,y:-10000},bounds),{scale:2,x:150,y:-200});
  assert.deepEqual(constrainPhotoTransform({scale:1.01,x:15,y:15},bounds),{scale:1,x:0,y:0});
});
