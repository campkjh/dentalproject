/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { sb, user: null, isAdmin: false };
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  return { sb, user, isAdmin: !!profile?.is_admin };
}

export async function GET() {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });

  const admin = await createAdminClient();
  const selectWithDocs = `id, name, category, phone, status, address, submitted_documents, created_at,
     owner:profiles!hospitals_owner_id_fkey (name, phone),
     doctors (id)`;
  const selectFallback = `id, name, category, phone, status, address, created_at,
     owner:profiles!hospitals_owner_id_fkey (name, phone),
     doctors (id)`;

  let res: any = await admin.from('hospitals').select(selectWithDocs).order('created_at', { ascending: false });
  if (res.error && /submitted_documents/i.test(`${res.error.message ?? ''} ${res.error.details ?? ''}`)) {
    res = await admin.from('hospitals').select(selectFallback).order('created_at', { ascending: false });
  }
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 400 });
  return NextResponse.json({ hospitals: res.data ?? [] });
}

export async function POST(req: NextRequest) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const logoUrl = typeof body.logo_url === 'string' ? body.logo_url.trim() : '';
  const status = ['pending', 'approved', 'rejected', 'suspended'].includes(body.status) ? body.status : 'approved';

  if (!name || !category) {
    return NextResponse.json({ error: '병원명과 카테고리는 필수입니다.' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('hospitals')
    .insert({
      name,
      category,
      phone: phone || null,
      logo_url: logoUrl || null,
      status,
    })
    .select('id, name, category, phone, logo_url, status, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ hospital: data });
}
