import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// 의사 답변 카운트를 재계산하고 posts 업데이트 (admin: RLS 우회)
export async function POST(req: NextRequest) {
  try {
    const { postId } = await req.json();
    if (!postId) return NextResponse.json({ ok: false });

    const admin = await createAdminClient();

    // 이 게시글의 댓글 작성자 중 is_doctor=true인 댓글 수 계산
    const { data: comments } = await admin
      .from('comments')
      .select('author_id')
      .eq('post_id', postId);

    if (!comments || comments.length === 0) {
      await admin.from('posts').update({ answer_count: 0, has_answer: false }).eq('id', postId);
      return NextResponse.json({ ok: true, answerCount: 0 });
    }

    const authorIds = [...new Set(comments.map((c: any) => c.author_id))];
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, is_doctor')
      .in('id', authorIds);

    const doctorIds = new Set(
      (profiles ?? []).filter((p: any) => p.is_doctor).map((p: any) => p.id)
    );
    const doctorCount = comments.filter((c: any) => doctorIds.has(c.author_id)).length;

    await admin.from('posts').update({
      answer_count: doctorCount,
      has_answer: doctorCount > 0,
    }).eq('id', postId);

    return NextResponse.json({ ok: true, answerCount: doctorCount });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
