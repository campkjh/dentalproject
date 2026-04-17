/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });

  const [usersRes, hospitalsRes, reservationsRes, productsRes, reviewsRes] = await Promise.all([
    sb.from('profiles').select('id, created_at', { count: 'exact', head: false }),
    sb.from('hospitals').select('id, status, name, created_at, owner:profiles!hospitals_owner_id_fkey (name)', { count: 'exact', head: false }),
    sb.from('reservations').select('id, status, amount, created_at, visit_at, customer_name, hospital:hospitals (name), product:products (title)'),
    sb.from('products').select('id, category', { count: 'exact', head: false }),
    sb.from('reviews').select('id, rating, created_at', { count: 'exact', head: false }),
  ]);

  const users = usersRes.data ?? [];
  const hospitals = hospitalsRes.data ?? [];
  const reservations = reservationsRes.data ?? [];
  const products = productsRes.data ?? [];
  const reviews = reviewsRes.data ?? [];

  const now = Date.now();
  const thisMonth = (d: string) => {
    const dd = new Date(d);
    const n = new Date();
    return dd.getMonth() === n.getMonth() && dd.getFullYear() === n.getFullYear();
  };

  const monthReservations = reservations.filter((r: any) => thisMonth(r.created_at));
  const monthRevenue = monthReservations
    .filter((r: any) => r.status === 'completed')
    .reduce((s: number, r: any) => s + (r.amount ?? 0), 0);

  const pendingHospitals = hospitals.filter((h: any) => h.status === 'pending').length;
  const approvedHospitals = hospitals.filter((h: any) => h.status === 'approved').length;

  // Category distribution
  const catCount: Record<string, number> = {};
  for (const p of products) {
    const c = (p as any).category ?? 'etc';
    catCount[c] = (catCount[c] ?? 0) + 1;
  }
  const categoryData = Object.entries(catCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Monthly revenue for last 6 months
  const monthlyRevenue: { month: string; revenue: number; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = `${d.getMonth() + 1}월`;
    const mRes = reservations.filter((r: any) => {
      const rd = new Date(r.created_at);
      return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
    });
    const rev = mRes.filter((r: any) => r.status === 'completed').reduce((s: number, r: any) => s + (r.amount ?? 0), 0);
    monthlyRevenue.push({ month: label, revenue: rev, count: mRes.length });
  }

  // Recent reservations
  const recentReservations = reservations
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((r: any) => ({
      id: r.id,
      customer: r.customer_name,
      hospital: r.hospital?.name ?? '-',
      product: r.product?.title ?? '-',
      amount: r.amount,
      status: r.status,
      date: new Date(r.created_at).toLocaleDateString('ko-KR'),
    }));

  return NextResponse.json({
    stats: {
      totalUsers: users.length,
      totalHospitals: hospitals.length,
      pendingHospitals,
      approvedHospitals,
      monthReservations: monthReservations.length,
      monthRevenue,
      totalProducts: products.length,
      totalReviews: reviews.length,
      avgRating: reviews.length ? reviews.reduce((s: number, r: any) => s + Number(r.rating), 0) / reviews.length : 0,
    },
    categoryData,
    monthlyRevenue,
    recentReservations,
  });
}
