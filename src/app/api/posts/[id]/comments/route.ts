import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isDoctorOnlyBoard } from '@/lib/community';
import { canSeeSecretPost, getCommunityViewer, isMissingSecretColumn, viewerCanSeeDoctorBoards } from '@/lib/community-viewer';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const sb = await createClient();
    const viewer = await getCommunityViewer(sb);
    const first = await sb.from('posts').select('board_type, author_id, is_secret').eq('id', id).maybeSingle();
    let parentPost = first.data;
    if (isMissingSecretColumn(first.error)) parentPost = (await sb.from('posts').select('board_type, author_id').eq('id', id).maybeSingle()).data as typeof parentPost;
    if (isDoctorOnlyBoard(parentPost?.board_type) && !viewer.doctor) {
      return NextResponse.json({ error: '의사 회원만 볼 수 있는 글이에요.' }, { status: 403 });
    }
    if (parentPost && !canSeeSecretPost(parentPost, viewer)) return NextResponse.json({ error: '비밀 상담글은 작성자와 의사만 볼 수 있어요.' }, { status: 403 });
    const COLS = 'id, post_id, author_id, parent_comment_id, content, is_anonymous, anonymous_id, like_count, created_at, author:profiles!comments_author_id_fkey(name, is_doctor, profile_image)';
    let { data: rows, error } = await sb.from('comments').select(`${COLS}, is_secret`).eq('post_id', id).order('created_at', { ascending: true });
    if (isMissingSecretColumn(error)) ({ data: rows, error } = await sb.from('comments').select(COLS).eq('post_id', id).order('created_at', { ascending: true }) as unknown as { data: typeof rows; error: typeof error });
    if (error) throw error;
    // 비밀 댓글 = 댓글 쓴이 본인 + 글 작성자만
    const comments = (rows ?? [])
      .filter(row => !(row as { is_secret?: boolean }).is_secret || row.author_id === viewer.id || parentPost?.author_id === viewer.id)
      .map(row => ({ ...row, author: one(row.author) }));
    const user = viewer.id ? { id: viewer.id } : null;
    const doctorIds = [...new Set(comments.filter(c => c.author?.is_doctor && !c.is_anonymous).map(c => c.author_id))];
    const { data: doctors } = doctorIds.length ? await sb.from('doctors').select('user_id, title, specialty, profile_image, hospitals(name)').in('user_id', doctorIds) : { data: [] };
    const doctorMap = new Map((doctors ?? []).map(doctor => [doctor.user_id, { ...doctor, hospital: one(doctor.hospitals) }]));
    const commentIds = (rows ?? []).map(c => c.id);
    const { data: likes } = user && commentIds.length ? await sb.from('comment_likes').select('comment_id').eq('user_id', user.id).in('comment_id', commentIds) : { data: [] };
    const liked = new Set((likes ?? []).map(like => like.comment_id));
    return NextResponse.json({ comments: comments.map(row => {
      const doctor = doctorMap.get(row.author_id);
      return {
        id: row.id, postId: row.post_id, authorId: row.author_id,
        authorName: row.is_anonymous ? '익명' : row.author?.name || '익명',
        authorIsDoctor: !row.is_anonymous && row.author?.is_doctor,
        authorTitle: row.is_anonymous ? undefined : doctor?.title,
        authorHospital: row.is_anonymous ? undefined : doctor?.hospital?.name,
        authorSpecialty: row.is_anonymous ? undefined : doctor?.specialty,
        authorProfileImage: row.is_anonymous ? undefined : doctor?.profile_image || row.author?.profile_image,
        parentCommentId: row.parent_comment_id, content: row.content,
        isAnonymous: row.is_anonymous, anonymousId: row.anonymous_id, isSecret: Boolean((row as { is_secret?: boolean }).is_secret),
        likeCount: row.like_count ?? 0, liked: liked.has(row.id),
        createdAt: row.created_at, date: row.created_at ? new Date(row.created_at).toLocaleDateString('ko-KR') : '',
      };
    }) });
  } catch {
    return NextResponse.json({ error: '댓글을 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content || content.length > 5000) return NextResponse.json({ error: '댓글은 1~5,000자로 입력해주세요.' }, { status: 400 });
    const { data: post } = await sb.from('posts').select('board_type').eq('id', id).single();
    if (!post) return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
    if (isDoctorOnlyBoard(post.board_type) && !(await viewerCanSeeDoctorBoards(sb))) {
      return NextResponse.json({ error: '의사 회원만 댓글을 남길 수 있어요.' }, { status: 403 });
    }
    if (body.parentCommentId) {
      const { data: parent } = await sb.from('comments').select('id, parent_comment_id').eq('id', body.parentCommentId).eq('post_id', id).single();
      if (!parent || parent.parent_comment_id) return NextResponse.json({ error: '답글을 작성할 댓글을 찾을 수 없습니다.' }, { status: 400 });
    }
    const anonymous = post.board_type === 'free';
    const secret = body.isSecret === true;
    const { data, error } = await sb.from('comments').insert({
      ...(secret ? { is_secret: true } : {}),
      post_id: id, author_id: user.id, content, is_anonymous: anonymous,
      anonymous_id: anonymous ? String(Math.floor(1000 + Math.random() * 9000)) : null,
      parent_comment_id: body.parentCommentId || null,
    }).select('id').single();
    if (error) {
      if (secret && isMissingSecretColumn(error)) return NextResponse.json({ error: '비밀 댓글 기능을 준비하고 있어요. 잠시 뒤 다시 시도해 주세요.' }, { status: 503 });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '댓글을 등록하지 못했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    const { commentId } = await request.json();
    const { data: comment } = await sb.from('comments').select('author_id').eq('id', commentId).eq('post_id', id).single();
    if (!comment) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });
    if (comment.author_id !== user.id) return NextResponse.json({ error: '본인의 댓글만 삭제할 수 있습니다.' }, { status: 403 });
    const { error } = await sb.from('comments').delete().eq('id', commentId).eq('post_id', id).eq('author_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: '댓글을 삭제하지 못했습니다.' }, { status: 500 });
  }
}
