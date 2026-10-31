import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DUAL_MODE_USER_IDS } from '@/lib/dual-mode-ids';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 의사·관리자는 돌아갈 고객 화면 대신 곧장 각자 홈으로(오가기 계정은 기기에서 고른 화면을 따르므로 제외)
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !DUAL_MODE_USER_IDS.includes(user.id)) {
        const [{ data: profile }, { data: hospital }] = await Promise.all([
          supabase.from('profiles').select('is_doctor, is_admin').eq('id', user.id).maybeSingle(),
          supabase.from('hospitals').select('id').eq('owner_id', user.id).limit(1).maybeSingle(),
        ]);
        if (profile?.is_admin) return NextResponse.redirect(`${origin}/admin`);
        if (profile?.is_doctor || hospital) return NextResponse.redirect(`${origin}/partner`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
