/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { data: hospital } = await sb
    .from('hospitals')
    .select('id, name, review_count, rating')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!hospital) return NextResponse.json({ summary: null });

  const [reservationsRes, reviewsRes, productsRes, consultRes] = await Promise.all([
    sb.from('reservations').select('id, status, amount, visit_at, created_at').eq('hospital_id', hospital.id),
    sb.from('reviews').select('id, rating, created_at').eq('hospital_id', hospital.id),
    sb.from('products').select('id, view_count:like_count, like_count, review_count').eq('hospital_id', hospital.id),
    sb.from('consultation_rooms').select('id').eq('hospital_id', hospital.id),
  ]);

  const reservations = reservationsRes.data ?? [];
  const reviews = reviewsRes.data ?? [];
  const products = productsRes.data ?? [];
  const consults = consultRes.data ?? [];

  // Last 30 days metrics
  const now = Date.now();
  const last30 = (createdAt: string) => now - new Date(createdAt).getTime() <= 30 * 86400000;
  const reservations30 = reservations.filter((r: any) => last30(r.created_at));
  const completed30 = reservations30.filter((r: any) => r.status === 'completed');
  const totalRevenue = completed30.reduce((s: number, r: any) => s + (r.amount ?? 0), 0);

  // Weekly buckets (last 4 weeks)
  const weekly: { label: string; revenue: number; reservations: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const start = now - (i + 1) * 7 * 86400000;
    const end = now - i * 7 * 86400000;
    const inWeek = (ts: string) => {
      const t = new Date(ts).getTime();
      return t >= start && t < end;
    };
    const w = reservations.filter((r: any) => inWeek(r.created_at));
    const wDone = w.filter((r: any) => r.status === 'completed');
    const startD = new Date(start);
    const endD = new Date(end - 1);
    weekly.push({
      label: `${startD.getMonth() + 1}/${startD.getDate()}~${endD.getMonth() + 1}/${endD.getDate()}`,
      revenue: wDone.reduce((s: number, r: any) => s + (r.amount ?? 0), 0),
      reservations: w.length,
    });
  }

  return NextResponse.json({
    summary: {
      totalReservations: reservations.length,
      reservations30: reservations30.length,
      totalRevenue,
      totalReviews: reviews.length,
      avgRating: reviews.length ? reviews.reduce((s: number, r: any) => s + Number(r.rating), 0) / reviews.length : 0,
      totalProducts: products.length,
      totalConsults: consults.length,
      conversionRate: consults.length > 0 ? (reservations.length / consults.length) * 100 : 0,
    },
    weekly,
  });
}
