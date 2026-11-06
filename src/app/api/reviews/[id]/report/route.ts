import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function POST(request: Request, {params}: {params: Promise<{id:string}>}) {
 const {id}=await params;
 const sb=await createClient();
 const {data:{user}}=await sb.auth.getUser();
 if(!user) return NextResponse.json({error:'로그인이 필요합니다.'},{status:401});
 const body=await request.json().catch(()=>null);
 const reason=typeof body?.reason==='string'?body.reason.trim():'';
 if(!/^[0-9a-f-]{36}$/i.test(id)||!reason||reason.length>500) return NextResponse.json({error:'리뷰와 신고 사유를 확인해 주세요.'},{status:400});
 const {data:review,error:readError}=await sb.from('reviews').select('id,author_id').eq('id',id).eq('hidden',false).maybeSingle();
 if(readError) return NextResponse.json({error:'리뷰를 확인하지 못했습니다.'},{status:500});
 if(!review) return NextResponse.json({error:'신고할 수 있는 리뷰를 찾을 수 없습니다.'},{status:404});
 if(review.author_id===user.id) return NextResponse.json({error:'내가 작성한 리뷰는 신고할 수 없습니다.'},{status:400});
 const {error}=await sb.from('review_reports').upsert({review_id:id,reporter_id:user.id,reason},{onConflict:'review_id,reporter_id',ignoreDuplicates:true});
 if(error) return NextResponse.json({error:'신고를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'},{status:500});
 return NextResponse.json({ok:true});
}
