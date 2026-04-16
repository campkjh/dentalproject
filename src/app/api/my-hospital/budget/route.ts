/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function ownerHospital(sb: any, userId: string) {
  const { data } = await sb.from('hospitals').select('id').eq('owner_id', userId).maybeSingle();
  return data?.id ?? null;
}

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ balance: 0, transactions: [] });

  const hospitalId = await ownerHospital(sb, user.id);
  if (!hospitalId) return NextResponse.json({ balance: 0, transactions: [] });

  const [{ data: balRow }, { data: txs }] = await Promise.all([
    sb.from('hospital_points').select('balance').eq('hospital_id', hospitalId).maybeSingle(),
    sb
      .from('hospital_point_tx')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  return NextResponse.json({
    balance: balRow?.balance ?? 0,
    transactions: txs ?? [],
  });
}

/**
 * POST /api/my-hospital/budget — charge points (mock for now)
 * Body: { amount, description }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const amount = Number(body.amount ?? 0);
  if (!amount || amount < 1000) {
    return NextResponse.json({ error: '최소 1,000원 이상 충전해주세요.' }, { status: 400 });
  }
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const hospitalId = await ownerHospital(sb, user.id);
  if (!hospitalId) return NextResponse.json({ error: '병원을 찾을 수 없습니다.' }, { status: 404 });

  const { data: bal } = await sb.from('hospital_points').select('balance').eq('hospital_id', hospitalId).maybeSingle();
  const newBalance = (bal?.balance ?? 0) + amount;

  await sb.from('hospital_points').upsert({ hospital_id: hospitalId, balance: newBalance, updated_at: new Date().toISOString() }, { onConflict: 'hospital_id' });
  await sb.from('hospital_point_tx').insert({
    hospital_id: hospitalId,
    type: 'charge',
    description: body.description || '포인트 충전',
    amount,
    balance_after: newBalance,
  });

  return NextResponse.json({ balance: newBalance });
}
