import type { SupabaseClient } from '@supabase/supabase-js';

/** 지금 요청한 사람이 의사(또는 관리자)인지 — 의사 전용 게시판(자유·과별)을 볼 수 있는지 판정 */
export async function viewerCanSeeDoctorBoards(sb: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const { data } = await sb.from('profiles').select('is_doctor, is_admin').eq('id', user.id).maybeSingle();
  return Boolean(data?.is_doctor || data?.is_admin);
}
