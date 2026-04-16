import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = await createClient();
  const { data, error } = await sb
    .from('consultation_messages')
    .select('id, sender_type, sender_id, content, image_url, created_at')
    .eq('room_id', id)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params;
  const body = await req.json();
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  // Determine sender_type from room ownership
  const { data: room } = await sb
    .from('consultation_rooms')
    .select('user_id, hospital_id, hospitals!inner(owner_id)')
    .eq('id', roomId)
    .maybeSingle();
  if (!room) return NextResponse.json({ error: '채팅방을 찾을 수 없습니다.' }, { status: 404 });

  const senderType = room.user_id === user.id ? 'user' : 'hospital';

  const { data, error } = await sb
    .from('consultation_messages')
    .insert({
      room_id: roomId,
      sender_type: senderType,
      sender_id: user.id,
      content: body.content ?? '',
      image_url: body.imageUrl ?? null,
    })
    .select('id, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Touch room.last_message + last_at
  await sb
    .from('consultation_rooms')
    .update({ last_message: body.content ?? '', last_at: new Date().toISOString() })
    .eq('id', roomId);

  return NextResponse.json({ id: data.id, createdAt: data.created_at });
}
