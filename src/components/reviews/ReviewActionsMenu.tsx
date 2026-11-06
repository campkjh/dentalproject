'use client';
import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useStore } from '@/store';
import { Sheet } from '@/components/mypage/screens/ScreenKit';
import { REVIEW_REPORT_REASONS } from '@/lib/review-moderation';
import { maskReviewAuthor } from '@/lib/review-display';

export default function ReviewActionsMenu({reviewId,authorId,authorName,allowShare=false}: {reviewId:string;authorId?:string;authorName:string;allowShare?:boolean}) {
 const {user,showToast,showModal,blockReviewAuthor}=useStore();
 const [open,setOpen]=useState(false); const [reporting,setReporting]=useState(false);const [busy,setBusy]=useState(false);
 const mine=!!user&&user.id===authorId;
 if(mine&&!allowShare) return null;
 function requireLogin(){if(user)return true;window.dispatchEvent(new Event('dental:login'));return false;}
 async function report(reason:string){
  if(!requireLogin()||busy)return;setBusy(true);
  try{
   const response=await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/report`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason})});
   const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'신고하지 못했습니다.');
   setReporting(false);showToast('리뷰 신고가 접수되었습니다.');
  }catch(error){showToast(error instanceof Error?error.message:'신고하지 못했습니다.');}finally{setBusy(false);}
 }
 async function share(){
  try{const url=`${window.location.origin}/review/${encodeURIComponent(reviewId)}`;if(navigator.share)await navigator.share({title:'마이닥 시술 후기',url});else{await navigator.clipboard.writeText(url);showToast('리뷰 링크를 복사했습니다.');}}catch(error){if(!(error instanceof Error&&error.name==='AbortError'))showToast('리뷰를 공유하지 못했습니다.');}
 }
 function block(){
  if(!requireLogin()||!authorId)return;
  showModal('리뷰 작성자를 차단할까요?',`${maskReviewAuthor(authorName)}님의 리뷰가 내 화면에서 숨겨져요. 프로필 설정에서 차단을 해제할 수 있어요.`,async()=>{
   try{await blockReviewAuthor(authorId);showToast('리뷰 작성자를 차단했습니다.');}catch(error){showToast(error instanceof Error?error.message:'차단하지 못했습니다.');}
  });
 }
 return <div className="relative">
  <button type="button" aria-label="리뷰 메뉴" className="flex h-9 w-9 items-center justify-center rounded-full" onClick={()=>setOpen(v=>!v)}><MoreHorizontal size={20} className="text-[#8B95A1]"/></button>
  {open&&<><div className="fixed inset-0 z-40" onClick={()=>setOpen(false)}/><div role="menu" className="pop-menu absolute right-0 top-9 z-50">
   {allowShare&&<button type="button" role="menuitem" className="pop-menu-item" onClick={()=>{setOpen(false);void share();}}>공유하기</button>}
   {!mine&&<button type="button" role="menuitem" className="pop-menu-item" onClick={()=>{setOpen(false);if(requireLogin())setReporting(true);}}>신고하기</button>}
   {!mine&&authorId&&<button type="button" role="menuitem" className="pop-menu-item" onClick={()=>{setOpen(false);block();}}>차단하기</button>}
  </div></>}
  <Sheet open={reporting} title="리뷰 신고 사유" onClose={()=>{if(!busy)setReporting(false);}}>
   <p className="mb-3 text-[14px] text-[#8B95A1]">신고 내용은 관리자가 확인한 뒤 조치합니다.</p>
   {REVIEW_REPORT_REASONS.map(reason=><button type="button" key={reason} disabled={busy} className="block min-h-12 w-full rounded-xl px-3 text-left text-[16px] disabled:opacity-50" onClick={()=>void report(reason)}>{reason}</button>)}
  </Sheet>
 </div>;
}
