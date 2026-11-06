import assert from 'node:assert/strict';
import test from 'node:test';
import { interestedProducts } from '../src/lib/interested-products';
const products=[{id:'a',category:'dental',likeCount:2,reviewCount:1},{id:'b',category:'internal',likeCount:100,reviewCount:10},{id:'c',category:'dental',likeCount:5,reviewCount:2}];
test('관심 진료과목의 상품만 인기순으로 추천하며 다른 상품 순서는 바꾸지 않는다',()=>{
 assert.deepEqual(interestedProducts(products,['dental']).map(p=>p.id),['c','a']);
 assert.deepEqual(products.map(p=>p.id),['a','b','c']);
});
test('선택하지 않았거나 해당 지역 목록에 없는 진료과목은 다른 지역 상품으로 채우지 않는다',()=>{
 assert.deepEqual(interestedProducts(products,[]),[]);
 assert.deepEqual(interestedProducts(products,['eye']),[]);
 assert.deepEqual(interestedProducts(products.filter(p=>p.id==='a'),['dental']).map(p=>p.id),['a']);
});
test('여러 관심 진료과목을 합쳐도 같은 상품을 중복하지 않고 최대 8개를 보여준다',()=>{
 const list=Array.from({length:12},(_,i)=>({id:i,category:i%2?'internal':'dental',likeCount:i,reviewCount:0}));
 const selected=interestedProducts(list,['internal','dental','dental']);
 assert.equal(selected.length,8); assert.equal(new Set(selected.map(p=>p.id)).size,8);
 assert.equal(selected[0].id,11);
});
