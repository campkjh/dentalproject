'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';

const typeBadgeMap: Record<string, { label: string; className: string }> = {
  event: { label: '이벤트', className: 'bg-pink-100 text-pink-600' },
  important: { label: '중요 알림', className: 'bg-yellow-100 text-yellow-700' },
  recommendation: { label: '맞춤 콘텐츠', className: 'bg-green-100 text-green-600' },
  info: { label: '안내', className: 'bg-purple-100 text-purple-600' },
  update: { label: '업데이트', className: 'bg-red-100 text-red-600' },
};

export default function NotificationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const deleteNotifications = useStore(s => s.deleteNotifications);
  const showConfirm = useStore(s => s.showConfirm);
  const showToast = useStore(s => s.showToast);
  const notifications = useStore((s) => s.notifications);
  const markNotificationRead = useStore((s) => s.markNotificationRead);

  const notification = notifications.find((n) => n.id === id);

  const requestDelete = () => {
    showConfirm('쪽지 삭제', '이 쪽지를 삭제할까요? 삭제한 쪽지는 복구할 수 없어요.', () => {
      if (deletingRef.current) return;
      deletingRef.current = true;
      setDeleting(true);
      void deleteNotifications([id])
        .then(() => { showToast('쪽지를 삭제했어요.'); router.replace('/notifications'); })
        .catch(() => showToast('쪽지를 삭제하지 못했어요. 다시 시도해주세요.'))
        .finally(() => { deletingRef.current = false; setDeleting(false); });
    }, { confirmText: '삭제', cancelText: '취소' });
  };

  // Keep the unread badge in sync immediately, then persist UUID-backed messages.
  useEffect(() => {
    if (!notification || notification.isRead) return;
    markNotificationRead(notification.id);
    if (!/^[0-9a-f]{8}-/.test(notification.id)) return;
    void fetch(`/api/notifications/${notification.id}/read`, { method: 'POST' }).catch(() => undefined);
  }, [markNotificationRead, notification]);

  if (!notification) {
    return (
      <div className="min-h-screen bg-white max-w-[500px] mx-auto">
        <TopBar title="쪽지" />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">쪽지를 찾을 수 없습니다</p>
        </div>
      </div>
    );
  }

  const badge = typeBadgeMap[notification.type] ?? typeBadgeMap.info;

  return (
    <div className="min-h-screen bg-white max-w-[500px] mx-auto">
      <TopBar title="쪽지" rightContent={<button type="button" disabled={deleting} onClick={requestDelete} className="min-h-11 px-3 text-sm font-semibold text-[#F04452] disabled:opacity-40">{deleting ? '삭제 중…' : '삭제'}</button>} />

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
            className="inline-block mt-6 px-4 py-2.5 bg-[#8037FF] text-white text-sm font-bold rounded-xl btn-press"
          >
            자세히 보기
          </Link>
        )}
      </div>
    </div>
  );
}
