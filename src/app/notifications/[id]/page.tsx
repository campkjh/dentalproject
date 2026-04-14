'use client';

import { useParams } from 'next/navigation';
import TopBar from '@/components/common/TopBar';
import { notifications } from '@/lib/mock-data';

const typeBadgeMap: Record<string, { label: string; className: string }> = {
  event: { label: '이벤트', className: 'bg-pink-100 text-pink-600' },
  important: { label: '중요 알림', className: 'bg-yellow-100 text-yellow-700' },
  recommendation: { label: '맞춤 콘텐츠', className: 'bg-green-100 text-green-600' },
  info: { label: '안내', className: 'bg-blue-100 text-blue-600' },
  update: { label: '업데이트', className: 'bg-red-100 text-red-600' },
};

const notificationContent: Record<string, string> = {
  n1: '안녕하세요, 회원님!\n\n따스한 봄을 맞아 특별한 미소 리프레시 이벤트를 준비했습니다.\n\n🌸 이벤트 기간: 2026년 3월 1일 ~ 3월 31일\n🌸 혜택: 치아미백 시술 20% 할인\n🌸 추가 혜택: 스케일링 무료 제공\n\n봄과 함께 환한 미소를 되찾아보세요!\n자세한 내용은 앱에서 확인해주세요.',
  n2: '안녕하세요, 회원님!\n\n예약하신 진료 일정을 안내드립니다.\n\n📋 예약 일시: 2026년 7월 5일 오후 2:00\n📋 병원: 참포도나무치과의원\n📋 진료 내용: 정기 검진\n\n방문 시 신분증을 지참해 주세요.\n예약 변경이 필요하시면 앱에서 변경 가능합니다.',
  n3: '안녕하세요, 회원님!\n\n회원님의 관심사와 진료 이력을 바탕으로\n아래 치과를 추천드립니다.\n\n💡 추천 병원: 레브치과의원\n💡 추천 이유: 치아미백 전문, 높은 만족도\n💡 위치: 서울 강남구\n\n자세한 정보는 병원 페이지에서 확인해보세요!',
  n4: '안녕하세요, 회원님!\n\n서비스 이용 관련 안내 사항을 전달드립니다.\n\n📌 예약 취소 정책이 업데이트 되었습니다.\n📌 시술 3일 전까지 무료 취소 가능\n📌 시술 당일 취소 시 취소 수수료 발생\n\n자세한 내용은 이용약관에서 확인해주세요.',
  n5: '안녕하세요, 회원님!\n\n서비스가 더욱 편리해졌습니다.\n\n🔔 주요 업데이트 내용:\n- 예약 시스템 개선\n- 리뷰 작성 기능 강화\n- 쿠폰함 UI 개선\n- 포인트 적립 내역 상세 확인 기능 추가\n\n업데이트 후 더 나은 서비스를 경험해보세요!',
};

export default function NotificationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const notification = notifications.find(n => n.id === id);

  if (!notification) {
    return (
      <div className="min-h-screen bg-white max-w-[480px] mx-auto">
        <TopBar title="쪽지상세" />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">쪽지를 찾을 수 없습니다</p>
        </div>
      </div>
    );
  }

  const badge = typeBadgeMap[notification.type];
  const content = notificationContent[notification.id] ?? '상세 내용이 없습니다.';

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto">
      <TopBar title="쪽지상세" />

      <div className="px-2.5 py-6">
        {/* Badge */}
        <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-3 ${badge.className}`}>
          {badge.label}
        </span>

        {/* Title */}
        <h1 className="text-lg font-bold text-gray-900 mb-2">{notification.title}</h1>

        {/* Date */}
        <p className="text-sm text-gray-400 mb-6">{notification.date}</p>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-6" />

        {/* Content */}
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {content}
        </div>
      </div>
    </div>
  );
}
