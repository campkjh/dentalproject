import { createHash } from 'node:crypto';

/** A stable ID lets retries repair a failed delivery without creating duplicate messages. */
export function doctorAcceptedNotification(doctorId: string, userId: string, hospitalName: string) {
  const hash = createHash('sha256').update(`doctor-accepted:${doctorId}:${userId}`).digest('hex');
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  return {
    id, user_id: userId, type: 'important',
    title: '원장 등록 요청이 수락되었습니다',
    content: `${hospitalName}에서 원장 등록 요청을 수락했습니다. 이제 병원 화면에서 소속 병원의 서비스를 이용할 수 있어요.`,
    link: '/partner/account',
  };
}
