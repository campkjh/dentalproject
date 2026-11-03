import { NextResponse } from 'next/server';
import { getIdentityStatus } from '@/lib/identity';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** 로그인한 사용자가 본인인증을 해야 하는지 — IdentityGate가 쓴다. */
export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ required: false, verified: false, loggedIn: false });

  const admin = await createAdminClient();
  const status = await getIdentityStatus(admin, user.id);
  return NextResponse.json({ ...status, loggedIn: true });
}
