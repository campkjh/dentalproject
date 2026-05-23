/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { attachScheduleHistory } from '@/lib/db/reservation-history';
import { cancelExpiredPendingReservations, completePastConfirmedReservations } from '@/lib/db/reservation-status';
import { normalizeProductImageUrl } from '@/lib/images';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ user: null });

  const admin = await createAdminClient();
  await cancelExpiredPendingReservations(admin, { userId: user.id });
  await completePastConfirmedReservations(admin, { userId: user.id });

  const [profile, wishlist, recentlyViewed, reservations, coupons, notifications, pointHistory, interestedCats, recentSearches] =
    await Promise.all([
      sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      sb.from('wishlists').select('product_id').eq('user_id', user.id),
      sb.from('recently_viewed').select('product_id, viewed_at').eq('user_id', user.id).order('viewed_at', { ascending: false }).limit(20),
      sb
        .from('reservations')
        .select(
          `*, hospital:hospitals (id, slug, name, address, phone, location),
              product:products (id, title, image_url),
              doctor:doctors (id, name, title)`
        )
        .eq('user_id', user.id)
        .order('reservation_at', { ascending: false }),
      sb.from('coupons').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      sb.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      sb.from('point_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      sb.from('interested_categories').select('category_id').eq('user_id', user.id),
      sb.from('recent_searches').select('keyword').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    ]);

  const reservationRows = reservations.data ?? [];
  const hospitalIds = Array.from(new Set(
    reservationRows
      .filter((row: any) => !row.product)
      .map((row: any) => row.hospital_id)
      .filter(Boolean)
  ));
  const { data: fallbackProducts } = hospitalIds.length
    ? await admin
        .from('products')
        .select('id, hospital_id, title, image_url, price')
        .in('hospital_id', hospitalIds)
        .order('created_at', { ascending: false })
    : { data: [] };
  const fallbackByHospital = new Map<string, any>();
  for (const product of fallbackProducts ?? []) {
    if (!fallbackByHospital.has(product.hospital_id)) fallbackByHospital.set(product.hospital_id, product);
  }
  const reservationsWithProducts = reservationRows.map((row: any) => {
    const product = row.product ?? fallbackByHospital.get(row.hospital_id) ?? null;
    return {
      ...row,
      product: product ? { ...product, image_url: normalizeProductImageUrl(product.image_url) ?? null } : null,
    };
  });
  const reservationsWithHistory = attachScheduleHistory(reservationsWithProducts, notifications.data ?? []);

  return NextResponse.json({
    user: {
      authId: user.id,
      email: user.email,
      profile: profile.data,
    },
    wishlist: (wishlist.data ?? []).map((w: any) => w.product_id),
    recentlyViewed: (recentlyViewed.data ?? []).map((r: any) => r.product_id),
    reservations: reservationsWithHistory,
    coupons: coupons.data ?? [],
    notifications: notifications.data ?? [],
    pointHistory: pointHistory.data ?? [],
    interestedCategories: (interestedCats.data ?? []).map((c: any) => c.category_id),
    recentSearches: (recentSearches.data ?? []).map((r: any) => r.keyword),
  });
}
