import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const uid = user.id;
  const admin = await createAdminClient();

  // 순환 FK 방지: 순서대로 직접 삭제
  await admin.from('profiles').update({ doctor_id: null }).eq('id', uid);
  await admin.from('post_likes').delete().eq('user_id', uid);
  await admin.from('comment_likes').delete().eq('user_id', uid);
  await admin.from('wishlists').delete().eq('user_id', uid);
  await admin.from('recently_viewed').delete().eq('user_id', uid);
  await admin.from('recent_searches').delete().eq('user_id', uid);
  await admin.from('interested_categories').delete().eq('user_id', uid);
  await admin.from('notifications').delete().eq('user_id', uid);
  await admin.from('coupons').delete().eq('user_id', uid);
  await admin.from('point_history').delete().eq('user_id', uid);
  await admin.from('consultation_rooms').delete().eq('user_id', uid);
  await admin.from('reservations').delete().eq('user_id', uid);
  await admin.from('comments').delete().eq('author_id', uid);
  await admin.from('posts').delete().eq('author_id', uid);
  await admin.from('reviews').delete().eq('author_id', uid);
  await admin.from('hospitals').update({ owner_id: null }).eq('owner_id', uid);
  await admin.from('doctors').update({ user_id: null }).eq('user_id', uid);
  await admin.from('profiles').delete().eq('id', uid);

  // Supabase auth 유저 삭제
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
