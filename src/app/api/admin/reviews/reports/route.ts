import { NextResponse } from 'next/server';
import { createAdminClient,createClient } from '@/lib/supabase/server';
async function authorize(){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();
 if(!user)return {error:NextResponse.json({error:'로그인이 필요합니다.'},{status:401})};
 const {data:profile}=await sb.from('profiles').select('is_admin').eq('id',user.id).maybeSingle();
 if(!profile?.is_admin)return {error:NextResponse.json({error:'관리자 권한이 필요합니다.'},{status:403})};
 return {user};
}
export async function GET(){
 const check=await authorize();if(check.error)return check.error;
 const admin=await createAdminClient();
 const {data,error}=await admin.from('review_reports').select('id,review_id,reason,status,created_at,review:reviews(content,hidden),reporter:profiles!review_reports_reporter_id_fkey(name)').order('created_at',{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:'신고 내역을 불러오지 못했습니다.'},{status:500});
 return NextResponse.json({reports:data??[]},{headers:{'Cache-Control':'private, no-store'}});
}
export async function PATCH(request:Request){
 const check=await authorize();if(check.error)return check.error;
 const body=await request.json().catch(()=>null);
 if(typeof body?.id!=='string'||!['resolved','rejected'].includes(body?.status))return NextResponse.json({error:'신고 처리 정보를 확인해 주세요.'},{status:400});
 const admin=await createAdminClient();
 const {data,error}=await admin.from('review_reports').update({status:body.status,resolved_by:check.user.id,resolved_at:new Date().toISOString()}).eq('id',body.id).select('id').maybeSingle();
 if(error)return NextResponse.json({error:'처리에 실패했습니다.'},{status:500});
 if(!data)return NextResponse.json({error:'신고를 찾을 수 없습니다.'},{status:404});
 return NextResponse.json({ok:true});
}
