/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const sb = await createClient();
  const patch: Record<string, any> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.description !== undefined) patch.description = body.description;
  if (body.imageUrl !== undefined) patch.image_url = body.imageUrl;
  if (body.originalPrice !== undefined) patch.original_price = body.originalPrice;
  if (body.salePrice !== undefined) patch.sale_price = body.salePrice;
  if (body.discountPercent !== undefined) patch.discount_percent = body.discountPercent;
  if (body.startAt !== undefined) patch.start_at = body.startAt;
  if (body.endAt !== undefined) patch.end_at = body.endAt;
  if (body.status !== undefined) patch.status = body.status;
  if (body.rejectReason !== undefined) patch.reject_reason = body.rejectReason;

  const { error } = await sb.from('events').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { error } = await sb.from('events').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
