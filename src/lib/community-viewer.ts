import type { SupabaseClient } from '@supabase/supabase-js';

export type CommunityViewer = { id: string | null; doctor: boolean };

/** 지금 요청한 사람 — id 와 의사(또는 관리자) 여부. 의사 전용 게시판·비밀 상담글을 볼 수 있는지 판정에 쓴다 */
export async function getCommunityViewer(sb: SupabaseClient): Promise<CommunityViewer> {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { id: null, doctor: false };
  const { data } = await sb.from('profiles').select('is_doctor, is_admin').eq('id', user.id).maybeSingle();
  return { id: user.id, doctor: Boolean(data?.is_doctor || data?.is_admin) };
}

export async function viewerCanSeeDoctorBoards(sb: SupabaseClient): Promise<boolean> {
  return (await getCommunityViewer(sb)).doctor;
}

/** is_secret 칸이 아직 DB 에 없을 때(0019 미적용) 나는 오류인지 */
export function isMissingSecretColumn(error: { code?: string; message?: string } | null | undefined) {
  return Boolean(error && (error.code === '42703' || error.code === 'PGRST204' || /is_secret/.test(error.message ?? '')));
}

/** 비밀 상담글을 이 사람이 볼 수 있는지 — 글쓴이 본인 또는 의사 */
export function canSeeSecretPost(row: { is_secret?: boolean | null; author_id: string }, viewer: CommunityViewer) {
  return !row.is_secret || viewer.doctor || row.author_id === viewer.id;
}
