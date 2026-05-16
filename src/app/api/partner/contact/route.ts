import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';

  if (!topic || !content) {
    return NextResponse.json({ error: '문의 유형과 내용을 입력해주세요.' }, { status: 400 });
  }

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { data: profile } = await sb
    .from('profiles')
    .select('name, phone')
    .eq('id', user.id)
    .maybeSingle();

  const { data: hospital } = await sb
    .from('hospitals')
    .select('name')
    .eq('owner_id', user.id)
    .maybeSingle();

  const title = `[파트너 문의] ${topic}`;
  const detail = [
    `병원: ${hospital?.name ?? '-'}`,
    `담당자: ${profile?.name ?? user.email ?? '-'}`,
    `연락처: ${profile?.phone ?? '-'}`,
    '',
    content,
  ].join('\n');

  const ownNotice = {
    user_id: user.id,
    type: 'info',
    title: '문의가 접수되었습니다',
    content: `${topic} 문의가 접수되었습니다. 24시간 내 답변드리겠습니다.`,
    link: '/partner/contact',
  };

  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminKey) {
    const { error } = await sb.from('notifications').insert(ownNotice);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const admin = await createAdminClient();
  const { data: admins } = await admin.from('profiles').select('id').eq('is_admin', true);
  const adminNotices =
    admins?.map((row: { id: string }) => ({
      user_id: row.id,
      type: 'important',
      title,
      content: detail,
      link: '/admin/notifications',
    })) ?? [];

  const { error } = await admin.from('notifications').insert([ownNotice, ...adminNotices]);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
