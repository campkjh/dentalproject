'use client';
import { useCallback,useEffect,useState } from 'react';
import { useStore } from '@/store';
type Report={id:string;review_id:string;reason:string;status:'pending'|'resolved'|'rejected';created_at:string;review?:{content:string;hidden:boolean}|null;reporter?:{name:string}|null};
export default function AdminReviewReports({onReviewChanged}:{onReviewChanged?:()=>void}){
 const [reports,setReports]=useState<Report[]>([]);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const alert=useStore(s=>s.showAlert);
 const load=useCallback(async()=>{
  try{const response=await fetch('/api/admin/reviews/reports',{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||'신고 조회 실패');setReports(data.reports??[]);setError('');}catch(e){setError(e instanceof Error?e.message:'신고 조회 실패');}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function resolve(report:Report,status:'resolved'|'rejected',hide=false){
  setBusy(true);try{
   if(hide){const response=await fetch('/api/admin/reviews',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:report.review_id,action:'hide'})});if(!response.ok)throw new Error('리뷰 숨김에 실패했습니다.');}
   const response=await fetch('/api/admin/reviews/reports',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:report.id,status})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'처리에 실패했습니다.');await load();if(hide)onReviewChanged?.();
  }catch(e){alert(e instanceof Error?e.message:'처리에 실패했습니다.');}finally{setBusy(false);}
 }
 return <section className="rounded-2xl border border-[#E5E8EB] bg-white p-5" aria-label="리뷰 신고 내역">
  <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-[17px] font-bold">리뷰 신고 내역 <span className="text-[#3182F6]">{reports.filter(r=>r.status==='pending').length}</span></h2><button type="button" className="adm-btn sm" onClick={()=>void load()}>새로고침</button></div>
  {error?<p role="alert" className="text-[14px] text-red-600">{error}</p>:!reports.length?<p className="text-[14px] text-[#8B95A1]">접수된 리뷰 신고가 없습니다.</p>:<div className="space-y-3">{reports.map(report=><article key={report.id} className="rounded-xl bg-[#F8F9FA] p-4">
   <div className="flex flex-wrap justify-between gap-2 text-[13px] text-[#6B7684]"><span>{report.reporter?.name||'탈퇴회원'} · {new Date(report.created_at).toLocaleString('ko-KR')}</span><span>{report.status==='pending'?'검토 대기':report.status==='resolved'?'처리 완료':'반려'}</span></div>
   <p className="mt-2 font-semibold">{report.reason}</p><p className="mt-1 whitespace-pre-wrap break-words text-[14px] text-[#4E5968]">{report.review?.content||'삭제된 리뷰'}</p>
   {report.status==='pending'&&<div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} className="adm-btn sm" onClick={()=>void resolve(report,'resolved',true)}>리뷰 숨김·처리 완료</button><button type="button" disabled={busy} className="adm-btn sm" onClick={()=>void resolve(report,'resolved')}>검토 완료</button><button type="button" disabled={busy} className="adm-btn sm" onClick={()=>void resolve(report,'rejected')}>반려</button></div>}
  </article>)}</div>}
 </section>;
}
