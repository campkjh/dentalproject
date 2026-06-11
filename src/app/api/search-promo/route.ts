import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { readSearchPromoFromBlob } from '@/lib/search-promo-blob-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { promo } = await readSearchPromoFromBlob();

  if (!promo.productId) {
    return NextResponse.json({ promo: null });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ promo: { productId: promo.productId, title: null } });
  }

  const sb = await createClient();
  const { data, error } = await sb
    .from('products')
    .select('id, title')
    .eq('id', promo.productId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ promo: { productId: promo.productId, title: null } });
  }

  return NextResponse.json(
    { promo: { productId: data.id, title: data.title } },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}
