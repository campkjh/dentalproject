type PushNotice = { type: string; title: string; link?: string | null };
type PushKind = 'community' | 'consultation' | 'reservation' | 'doctor' | 'hospital' | 'review' | 'payment' | 'points' | 'support' | 'notice' | 'event' | 'recommendation' | 'general';

function notificationKind(notice: PushNotice): PushKind {
  const path = (notice.link || '').split(/[?#]/, 1)[0];
  const title = notice.title;
  if (notice.type === 'recommendation') return 'recommendation';
  if (notice.type === 'event') return 'event';
  if (/^\/(?:partner\/)?community(?:\/|$)/.test(path)) return 'community';
  if (/^\/(?:consult(?:\/|$)|partner\/chat(?:\/|$))/.test(path)) return 'consultation';
  if (/^\/(?:mypage\/announcements|partner\/notices)(?:\/|$)/.test(path)) return 'notice';
  if (path === '/partner/contact' || /^\[파트너 문의\]/.test(title)) return 'support';
  if (/원장|의사 등록/.test(title)) return 'doctor';
  if (/병원.*(?:등록|신청|승인|반려|중지|정지|검토|상태)/.test(title)) return 'hospital';
  if (/후기|리뷰/.test(title) || /\/reviews(?:\/|$)/.test(path)) return 'review';
  if (/결제|입금|환불/.test(title) || /\/payments(?:\/|$)/.test(path)) return 'payment';
  if (/포인트|적립/.test(title) || path === '/mypage/points') return 'points';
  if (/예약|진료|스케줄/.test(title) || /\/(?:reservations|appointments)(?:\/|$)/.test(path)) return 'reservation';
  if (/댓글|답글|팔로워|팔로우/.test(title)) return 'community';
  if (/문의/.test(title) || path === '/partner/contact') return 'support';
  if (/공지/.test(title)) return 'notice';
  return 'general';
}

const LABELS: Record<PushKind, string> = {
  community: '커뮤니티', consultation: '상담', reservation: '예약', doctor: '원장 등록', hospital: '병원 등록',
  review: '리뷰', payment: '결제', points: '포인트', support: '고객센터', notice: '공지', event: '이벤트',
  recommendation: '추천', general: '마이닥',
};

/** Identify the originating feature and event without exposing private message/medical bodies. */
export function nativePushPresentation(notice: PushNotice) {
  const kind = notificationKind(notice);
  const originalTitle = Array.from(notice.title.replace(/\s+/g, ' ').trim()).slice(0, 70).join('') || '새 알림';
  let body: string;
  switch (kind) {
    case 'community':
      body = /답글/.test(originalTitle) ? '내 댓글에 새 답글이 달렸어요.'
        : /댓글/.test(originalTitle) ? '내 게시글에 새 댓글이 달렸어요.'
        : /답변/.test(originalTitle) ? '내 게시글에 새 답변이 도착했어요.'
        : /팔로/.test(originalTitle) ? '새 팔로워가 생겼어요.' : '커뮤니티의 새 소식을 확인해주세요.';
      break;
    case 'consultation': body = '상담방에 새 메시지가 도착했어요.'; break;
    case 'reservation':
      body = /취소/.test(originalTitle) ? '예약이 취소됐어요. 상세 내용을 확인해주세요.'
        : /변경/.test(originalTitle) ? '예약 일정이 변경됐어요. 새 일정을 확인해주세요.'
        : /확정/.test(originalTitle) ? '예약이 확정됐어요.'
        : /완료/.test(originalTitle) ? '진료가 완료됐어요.' : '예약 신청과 상태를 확인해주세요.';
      break;
    case 'doctor': body = /수락/.test(originalTitle) ? '원장 등록 요청이 수락됐어요. 소속 병원을 확인해주세요.' : '원장 등록 요청과 처리 상태를 확인해주세요.'; break;
    case 'hospital': body = '병원 등록 신청과 심사 상태를 확인해주세요.'; break;
    case 'review': body = /새 후기|새 리뷰/.test(originalTitle) ? '병원에 새로운 리뷰가 등록됐어요.' : '리뷰 등록 내역을 확인해주세요.'; break;
    case 'payment': body = /입금.*확인/.test(originalTitle) ? '입금이 확인됐어요. 결제 내역을 확인해주세요.' : '결제·환불 처리 내역을 확인해주세요.'; break;
    case 'points': body = '포인트 적립·사용 내역을 확인해주세요.'; break;
    case 'support': body = '문의 접수·답변 내용을 확인해주세요.'; break;
    case 'notice': body = '새 공지 내용을 확인해주세요.'; break;
    case 'event': body = '새 이벤트와 혜택을 확인해주세요.'; break;
    case 'recommendation': body = '새 추천 소식을 확인해주세요.'; break;
    default: body = '알림의 상세 내용을 앱에서 확인해주세요.';
  }
  return { title: `${LABELS[kind]} · ${originalTitle}`, body };
}
