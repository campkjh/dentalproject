'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { maskReviewAuthor } from '@/lib/review-display';

type Block = {blocked_user_id:string;author?:{name?:string}|null};
export default function BlockedReviewAuthors(){
 const ids=useStore(s=>s.blockedReviewAuthorIds);const userId=useStore(s=>s.user?.id);
 const unblock=useStore(s=>s.unblockReviewAuthor);const toast=useStore(s=>s.showToast);
 const [rows,setRows]=useState<{viewer:string;blocks:Block[]}|null>(null);const [busy,setBusy]=useState<string|null>(null);
 const key=ids.join(',');
 useEffect(()=>{
  if(!userId||!key)return;let alive=true;const controller=new AbortController();
  fetch('/api/review-author-blocks',{cache:'no-store',signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error('load failed');const data=await response.json();
   if(alive)setRows({viewer:userId,blocks:Array.isArray(data.blocks)?data.blocks:[]});
  }).catch(()=>{});
  return()=>{alive=false;controller.abort();};
 },[userId,key]);
 if(!ids.length)return null;
 return <section aria-label="차단한 리뷰 작성자"><h2 className="mb-3 text-[17px] font-bold text-[#333D4B]">차단한 리뷰 작성자</h2>
  <p className="mb-3 text-[14px] text-[#8B95A1]">차단을 해제하면 해당 작성자의 리뷰를 다시 볼 수 있어요.</p>
  <div className="divide-y divide-[#F2F4F6] rounded-2xl border border-[#F2F4F6] px-4">{ids.map(id=>{
   const author=rows&&rows.viewer===userId?rows.blocks.find(b=>b.blocked_user_id===id)?.author:null;
   return <div key={id} className="flex min-h-14 items-center justify-between gap-3"><span className="text-[15px] text-[#4E5968]">{author?.name?maskReviewAuthor(author.name):'리뷰 작성자'}</span><button type="button" disabled={!!busy} className="min-h-10 shrink-0 rounded-lg bg-[#F2F4F6] px-3 text-[13px] font-semibold text-[#4E5968] disabled:opacity-50" onClick={async()=>{
    setBusy(id);try{await unblock(id);toast('차단을 해제했습니다.');}catch(error){toast(error instanceof Error?error.message:'차단 해제에 실패했습니다.');}finally{setBusy(null);}
   }}>{busy===id?'처리 중…':'차단 해제'}</button></div>;
  })}</div>
 </section>;
}
