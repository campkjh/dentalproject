/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { cancelExpiredPendingReservations, completePastConfirmedReservations } from '@/lib/db/reservation-status';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function normalizeMethod(method?: string | null, type?: string | null) {
  const value = `${method ?? ''} ${type ?? ''}`.toLowerCase();
  if (value.includes('kakao')) return '카카오페이';
  if (value.includes('toss')) return '토스';
  if (value.includes('naver')) return '네이버페이';
  if (value.includes('transfer') || value.includes('bank') || value.includes('계좌')) return '계좌이체';
  return '카드';
}

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });

  const admin = await createAdminClient();
  await cancelExpiredPendingReservations(admin);
  await completePastConfirmedReservations(admin);

  const { data, error } = await admin
    .from('reservations')
    .select(
      `id, amount, payment_method, payment_type, status, reservation_at, cancel_at, customer_name,
       hospital_id,
       product:products (title),
       hospital:hospitals (id, name)`
    )
    .not('payment_method', 'is', null)
    .order('reservation_at', { ascending: false })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = data ?? [];

  const payments = rows.map((r: any) => {
    const amount = r.amount ?? 0;
    return {
      id: `PAY-${String(r.id).slice(0, 8).toUpperCase()}`,
      reservationId: r.id,
      customer: r.customer_name ?? '환자',
      product: r.product?.title ?? '-',
      hospital: r.hospital?.name ?? '-',
      amount,
      fee: Math.round(amount * 0.1),
      method: normalizeMethod(r.payment_method, r.payment_type),
      datetime: r.reservation_at
        ? new Date(r.reservation_at).toLocaleString('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
          })
        : '',
      status: r.status === 'cancelled' ? '환불' : '완료',
    };
  });

  // ---- Daily revenue (last 30 days) ----
  const now = new Date();
  const startDay = new Date(now);
  startDay.setHours(0, 0, 0, 0);
  startDay.setDate(startDay.getDate() - 29);
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    dailyMap.set(key, 0);
  }
  for (const r of rows) {
    if (r.status === 'cancelled') continue;
    if (!r.reservation_at) continue;
    const d = new Date(r.reservation_at);
    if (d < startDay) continue;
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + (r.amount ?? 0));
  }
  const dailyRevenue = Array.from(dailyMap.entries()).map(([date, revenue]) => ({ date, revenue: Math.round(revenue / 10000) }));

  // ---- Payment method breakdown (donut) ----
  const methodMap = new Map<string, number>();
  for (const r of rows) {
    if (r.status === 'cancelled') continue;
    const m = normalizeMethod(r.payment_method, r.payment_type);
    methodMap.set(m, (methodMap.get(m) ?? 0) + (r.amount ?? 0));
  }
  const methodTotal = Array.from(methodMap.values()).reduce((s, v) => s + v, 0);
  const paymentMethodBreakdown = Array.from(methodMap.entries())
    .map(([name, amount]) => ({
      name,
      value: methodTotal > 0 ? Math.round((amount / methodTotal) * 1000) / 10 : 0,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  // ---- Top hospitals by revenue ----
  const hospitalMap = new Map<string, { name: string; revenue: number }>();
  for (const r of rows as any[]) {
    if (r.status === 'cancelled') continue;
    const hosp = Array.isArray(r.hospital) ? r.hospital[0] : r.hospital;
    const id = r.hospital_id ?? hosp?.id;
    const name = hosp?.name ?? '미지정';
    if (!id) continue;
    const entry = hospitalMap.get(id) ?? { name, revenue: 0 };
    entry.revenue += r.amount ?? 0;
    hospitalMap.set(id, entry);
  }
  const topHospitals = Array.from(hospitalMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((h) => ({ name: h.name, revenue: Math.round(h.revenue / 10000) }));

  // ---- Heatmap (day-of-week x hour) — count of reservations ----
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const r of rows) {
    if (!r.reservation_at) continue;
    const d = new Date(r.reservation_at);
    const jsDay = d.getDay();
    const koreanDay = (jsDay + 6) % 7;
    const hour = d.getHours();
    heatmap[koreanDay][hour] += 1;
  }

  const totalRevenue = rows
    .filter((r: any) => r.status !== 'cancelled')
    .reduce((s: number, r: any) => s + (r.amount ?? 0), 0);
  const refundedRevenue = rows
    .filter((r: any) => r.status === 'cancelled')
    .reduce((s: number, r: any) => s + (r.amount ?? 0), 0);
  const totalFee = Math.round(totalRevenue * 0.1);
  const netRevenue = totalRevenue - totalFee;

  return NextResponse.json({
    payments,
    summary: { totalRevenue, netRevenue, refundedRevenue, totalFee },
    dailyRevenue,
    paymentMethodBreakdown,
    topHospitals,
    heatmap,
  });
}
