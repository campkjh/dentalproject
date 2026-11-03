import { NextResponse, type NextRequest } from 'next/server';
import { GET as getComments, POST as postComment } from '@/app/api/posts/[id]/comments/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('postId');
  if (!id || !/^[0-9a-f]{8}-/.test(id)) return NextResponse.json({ comments: [], commentCount: 0 });
  return getComments(req, { params: Promise.resolve({ id }) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (typeof body.postId !== 'string' || !/^[0-9a-f]{8}-/.test(body.postId)) {
    return NextResponse.json({ error: '게시글을 확인해주세요.' }, { status: 400 });
  }
  return postComment(new Request(req.url, {
    method: 'POST', headers: req.headers, body: JSON.stringify(body),
  }), { params: Promise.resolve({ id: body.postId }) });
}
