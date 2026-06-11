/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { readTermsFromBlob, writeTermsToBlob, type TermsDoc } from '@/lib/terms-blob-store';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return { error: NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 }) };
  return { sb, user };
}

export async function GET() {
  const check = await requireAdmin();
  if (check.error) return check.error;
  const result = await readTermsFromBlob();
  return NextResponse.json({ terms: result.terms, exists: result.exists });
}

export async function PUT(req: NextRequest) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const id = typeof body.id === 'string' ? body.id : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content : '';
  if (!id || !title) return NextResponse.json({ error: 'ID와 제목은 필수입니다.' }, { status: 400 });

  const { terms } = await readTermsFromBlob();
  const next: TermsDoc[] = [...terms];
  const idx = next.findIndex((t) => t.id === id);
  const now = new Date().toISOString();
  const doc: TermsDoc = { id, title, content, updatedAt: now };
  if (idx >= 0) next[idx] = doc;
  else next.push(doc);

  await writeTermsToBlob(next);
  return NextResponse.json({ terms: next });
}
