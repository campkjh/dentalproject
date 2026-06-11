import { NextResponse } from 'next/server';
import { readTermsFromBlob } from '@/lib/terms-blob-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { terms } = await readTermsFromBlob();
  return NextResponse.json(
    { terms },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}
