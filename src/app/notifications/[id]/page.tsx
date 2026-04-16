'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';

const typeBadgeMap: Record<string, { label: string; className: string }> = {
  event: { label: '이벤트', className: 'bg-pink-100 text-pink-600' },
  important: { label: '중요 알림', className: 'bg-yellow-100 text-yellow-700' },
  recommendation: { label: '맞춤 콘텐츠', className: 'bg-green-100 text-green-600' },
  info: { label: '안내', className: 'bg-blue-100 text-blue-600' },
  update: { label: '업데이트', className: 'bg-red-100 text-red-600' },
};

export default function NotificationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const notifications = useStore((s) => s.notifications);

  const notification = notifications.find((n) => n.id === id);

  // Mark as read on visit (UUID-only — DB)
  useEffect(() => {
    if (!notification || notification.isRead) return;
    if (!/^[0-9a-f]{8}-/.test(notification.id)) return;
    void fetch(`/api/notifications/${notification.id}/read`, { method: 'POST' });
  }, [notification]);

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

  const badge = typeBadgeMap[notification.type] ?? typeBadgeMap.info;

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto">
      <TopBar title="쪽지상세" />

      <div className="px-2.5 py-6">
        <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-3 ${badge.className}`}>
          {badge.label}
        </span>

        <h1 className="text-lg font-bold text-gray-900 mb-2">{notification.title}</h1>

        <p className="text-sm text-gray-400 mb-6">{notification.date}</p>

        <div className="border-t border-gray-100 mb-6" />

        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {notification.content || '상세 내용이 없습니다.'}
        </div>

        {notification.link && (
          <Link
            href={notification.link}
            className="inline-block mt-6 px-4 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-xl btn-press"
          >
            자세히 보기
          </Link>
        )}
      </div>
    </div>
  );
}
