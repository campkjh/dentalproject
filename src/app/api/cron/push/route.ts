import { NextResponse } from 'next/server';
import { flushNativePush } from '@/lib/push/delivery';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { return NextResponse.json(await flushNativePush()); }
  catch { return NextResponse.json({ error: '푸시 재시도 작업에 실패했습니다.' }, { status: 503 }); }
}
