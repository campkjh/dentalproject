import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(){
 const sb=await createClient(); const {data:{user}}=await sb.auth.getUser();
 if(!user) return NextResponse.json({error:'로그인이 필요합니다.'},{status:401});
 const {data,error}=await sb.from('review_author_blocks').select('blocked_user_id,author:profiles!review_author_blocks_blocked_user_id_fkey(name)').eq('user_id',user.id).order('created_at',{ascending:false});
 if(error) return NextResponse.json({error:'차단 목록을 불러오지 못했습니다.'},{status:500});
 return NextResponse.json({blocks:data??[]},{headers:{'Cache-Control':'private, no-store'}});
}
async function mutate(request:Request, remove:boolean){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();
 if(!user) return NextResponse.json({error:'로그인이 필요합니다.'},{status:401});
 const body=await request.json().catch(()=>null);const authorId=body?.authorId;
 if(typeof authorId!=='string'||!/^[0-9a-f-]{36}$/i.test(authorId)||authorId===user.id) return NextResponse.json({error:'차단할 작성자를 확인해 주세요.'},{status:400});
 const result=remove?await sb.from('review_author_blocks').delete().eq('user_id',user.id).eq('blocked_user_id',authorId)
 :await sb.from('review_author_blocks').upsert({user_id:user.id,blocked_user_id:authorId},{onConflict:'user_id,blocked_user_id',ignoreDuplicates:true});
 if(result.error) return NextResponse.json({error:remove?'차단을 해제하지 못했습니다.':'차단을 저장하지 못했습니다.'},{status:500});
 return NextResponse.json({ok:true});
}
export async function POST(request:Request){return mutate(request,false);}
export async function DELETE(request:Request){return mutate(request,true);}
