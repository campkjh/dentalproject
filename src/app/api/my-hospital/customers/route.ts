/* eslint-disable @typescript-eslint/no-explicit-any */
// 예약관리 › 고객관리 — 지금 로그인한 병원의 예약 전부를 고객별로 묶어 돌려준다(다른 병원 행은 절대 섞지 않음).
import { NextResponse } from 'next/server';
import { getOwnedHospital, hospitalKeys } from '@/lib/owned-hospital';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const PAGE = 1000;
const MAX_ROWS = 10000;

type CustomerReservation = {
  id: string;
  status: string;
  visit_at: string | null;
  reservation_at: string | null;
  created_at: string | null;
  amount: number | null;
  product_title: string | null;
};

type Customer = {
  key: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  visits: number;
  total: number;
  cancelled: number;
  paid: number;
  last_visit_at: string | null;
  last_activity_at: string | null;
  reservations: CustomerReservation[];
};

function toNumber(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function timeOf(value?: string | null) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export async function GET() {
  const owned = await getOwnedHospital();
  if ('error' in owned && owned.error) return owned.error;
  const hospital = owned.hospital;
  const keys = hospitalKeys(hospital);
  if (keys.length === 0) return NextResponse.json({ customers: [] });

  const admin = await createAdminClient();
  const rows: any[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await admin
      .from('reservations')
      .select('id, user_id, hospital_id, product_id, status, visit_at, reservation_at, amount, customer_name, customer_phone, created_at')
      .in('hospital_id', keys)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  const productIds = Array.from(new Set(rows.map((row) => row.product_id).filter(Boolean)));
  const [usersRes, productsRes] = await Promise.all([
    userIds.length
      ? admin.from('profiles').select('id, name, phone').in('id', userIds)
      : Promise.resolve({ data: [] as any[] }),
    productIds.length
      ? admin.from('products').select('id, title').in('id', productIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const userById = new Map(((usersRes.data ?? []) as any[]).map((row) => [row.id, row]));
  const productById = new Map(((productsRes.data ?? []) as any[]).map((row) => [row.id, row]));

  const byKey = new Map<string, Customer>();
  for (const row of rows) {
    const profile = row.user_id ? userById.get(row.user_id) : null;
    const name = (profile?.name ?? row.customer_name ?? '').trim() || '환자';
    const phone = (profile?.phone ?? row.customer_phone ?? '').trim() || null;
    const key = row.user_id ? `u:${row.user_id}` : `n:${name}|${(phone ?? '').replace(/\D/g, '')}`;

    let customer = byKey.get(key);
    if (!customer) {
      customer = {
        key,
        user_id: row.user_id ?? null,
        name,
        phone,
        visits: 0,
        total: 0,
        cancelled: 0,
        paid: 0,
        last_visit_at: null,
        last_activity_at: null,
        reservations: [],
      };
      byKey.set(key, customer);
    }
    if (!customer.phone && phone) customer.phone = phone;

    customer.total += 1;
    if (row.status === 'cancelled') customer.cancelled += 1;
    if (row.status === 'completed') {
      customer.visits += 1;
      customer.paid += toNumber(row.amount);
      if (row.visit_at && timeOf(row.visit_at) > timeOf(customer.last_visit_at)) customer.last_visit_at = row.visit_at;
    }
    const activity = row.visit_at ?? row.reservation_at ?? row.created_at ?? null;
    if (activity && timeOf(activity) > timeOf(customer.last_activity_at)) customer.last_activity_at = activity;

    customer.reservations.push({
      id: row.id,
      status: row.status,
      visit_at: row.visit_at ?? null,
      reservation_at: row.reservation_at ?? null,
      created_at: row.created_at ?? null,
      amount: row.amount == null ? null : toNumber(row.amount),
      product_title: row.product_id ? productById.get(row.product_id)?.title ?? null : null,
    });
  }

  const customers = Array.from(byKey.values()).map((customer) => ({
    ...customer,
    reservations: customer.reservations.sort((a, b) => (
      timeOf(b.visit_at ?? b.reservation_at ?? b.created_at) - timeOf(a.visit_at ?? a.reservation_at ?? a.created_at)
    )),
  }));

  return NextResponse.json({ customers });
}
