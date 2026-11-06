import assert from 'node:assert/strict';
import test from 'node:test';
import { visibleReviews } from '../src/lib/review-moderation';
import { useStore } from '../src/store';
import type { Review, User } from '../src/types';
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
const user:User={id:a,name:'검증',phone:'',loginType:'email',points:0,coupons:[]};
const reviews:Review[]=[{id:'one',authorId:b,authorName:'B',date:'',rating:5,content:'one',treatmentName:'',totalCost:0,treatmentDate:''},{id:'two',authorId:a,authorName:'A',date:'',rating:5,content:'two',treatmentName:'',totalCost:0,treatmentDate:''}];

test('차단은 해당 작성자의 모든 후기만 숨기며 원본 배열을 바꾸지 않는다',()=>{
 assert.deepEqual(visibleReviews(reviews,[b]).map(r=>r.id),['two']);
 assert.equal(reviews.length,2);
});
test('차단 저장 실패는 완료 상태를 만들거나 리뷰를 지우지 않는다',async()=>{
 const before=useStore.getState();const original=globalThis.fetch;
 try{
  useStore.setState({user,reviews,blockedReviewAuthorIds:[]});
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'실패'}),{status:500});
  await assert.rejects(useStore.getState().blockReviewAuthor(b),/실패/);
  assert.equal(useStore.getState().reviews.length,2);assert.deepEqual(useStore.getState().blockedReviewAuthorIds,[]);
 }finally{globalThis.fetch=original;useStore.setState(before);}
});
test('저장된 차단은 즉시 숨기며 뒤늦은 카탈로그 응답도 복구시키지 않는다',async()=>{
 const before=useStore.getState();const original=globalThis.fetch;
 try{
  useStore.setState({user,reviews,blockedReviewAuthorIds:[],catalogHydrated:false});
  globalThis.fetch=async input=>String(input).includes('/api/catalog')?new Response(JSON.stringify({reviews})):new Response(JSON.stringify({ok:true}));
  await useStore.getState().blockReviewAuthor(b);
  assert.deepEqual(useStore.getState().reviews.map(r=>r.id),['two']);
  assert.deepEqual(useStore.getState().blockedReviewAuthorIds,[b]);
  await useStore.getState().unblockReviewAuthor(b);
  assert.deepEqual(useStore.getState().blockedReviewAuthorIds,[]);
  assert.equal(useStore.getState().reviews.length,2);
 }finally{globalThis.fetch=original;useStore.setState(before);}
});
test('계정이 바뀐 뒤 도착한 이전 계정의 차단 목록은 반영하지 않는다',async()=>{
 const before=useStore.getState();const original=globalThis.fetch;
 let finish!:(response:Response)=>void;
 try{
  useStore.setState({user,blockedReviewAuthorIds:[]});globalThis.fetch=()=>new Promise(resolve=>{finish=resolve;});
  const pending=useStore.getState().hydrateMe();
  useStore.setState({user:{...user,id:b}});finish(new Response(JSON.stringify({user:{authId:a},blockedReviewAuthorIds:[b]})));await pending;
  assert.deepEqual(useStore.getState().blockedReviewAuthorIds,[]);
  useStore.setState({blockedReviewAuthorIds:[a]});useStore.getState().logout();assert.deepEqual(useStore.getState().blockedReviewAuthorIds,[]);
  useStore.setState({blockedReviewAuthorIds:[a]});useStore.getState().resetMe();assert.deepEqual(useStore.getState().blockedReviewAuthorIds,[]);
 }finally{globalThis.fetch=original;useStore.setState(before);}
});
