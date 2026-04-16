/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ user: null });

  const [profile, wishlist, recentlyViewed, reservations, coupons, notifications, pointHistory, interestedCats] =
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
    ]);

  return NextResponse.json({
    user: {
      authId: user.id,
      email: user.email,
      profile: profile.data,
    },
    wishlist: (wishlist.data ?? []).map((w: any) => w.product_id),
    recentlyViewed: (recentlyViewed.data ?? []).map((r: any) => r.product_id),
    reservations: reservations.data ?? [],
    coupons: coupons.data ?? [],
    notifications: notifications.data ?? [],
    pointHistory: pointHistory.data ?? [],
    interestedCategories: (interestedCats.data ?? []).map((c: any) => c.category_id),
  });
}
