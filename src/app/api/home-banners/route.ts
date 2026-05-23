import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  defaultHomeBanners,
  isMissingHomeBannersTable,
  isVisibleHomeBanner,
  normalizeHomeBanner,
} from '@/lib/home-banners';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ banners: defaultHomeBanners });
  }

  const sb = await createClient();
  const { data, error } = await sb
    .from('home_banners')
    .select('id, title, subtitle, image_url, mobile_image_url, target_url, badge_text, sort_order, is_active, starts_at, ends_at, created_at, updated_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingHomeBannersTable(error)) {
      return NextResponse.json({ banners: defaultHomeBanners });
    }
    return NextResponse.json({ error: error.message, banners: defaultHomeBanners }, { status: 200 });
  }

  const banners = (data ?? [])
    .map(normalizeHomeBanner)
    .filter((banner) => isVisibleHomeBanner(banner));

  return NextResponse.json(
    { banners: banners.length ? banners : defaultHomeBanners },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}

