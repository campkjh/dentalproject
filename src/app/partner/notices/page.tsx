'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, XCircle, CheckCircle, MessageSquare, Bell } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

const TYPE_CFG: Record<string, { icon: React.ReactNode; bg: string; color: string; label: string }> = {
  important: { icon: <CheckCircle size={14} />, bg: '#E6F7EB', color: '#15803D', label: '중요' },
  event: { icon: <Bell size={14} />, bg: '#EDE7FF', color: '#6D28D9', label: '이벤트' },
  recommendation: { icon: <Calendar size={14} />, bg: '#E6F2FF', color: '#1E6FD9', label: '추천' },
  info: { icon: <MessageSquare size={14} />, bg: '#F3F4F6', color: '#6B7280', label: '안내' },
  update: { icon: <XCircle size={14} />, bg: '#FFF8E1', color: '#B45309', label: '업데이트' },
};

function relTime(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return d.toLocaleDateString('ko-KR');
}

export default function PartnerNoticesPage() {
  const { authUser } = useSession();
  const notifications = useStore((s) => s.notifications);
  const [filter, setFilter] = useState<'전체' | string>('전체');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadIds(new Set(notifications.filter((n) => n.isRead).map((n) => n.id)));
  }, [notifications]);

  const filtered = useMemo(() => {
    if (filter === '전체') return notifications;
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const markAllRead = async () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
    await Promise.all(
      notifications
        .filter((n) => !n.isRead && /^[0-9a-f]{8}-/.test(n.id))
        .map((n) => fetch(`/api/notifications/${n.id}/read`, { method: 'POST' }))
    );
  };

  if (!authUser) {
    return (
      <div className="bg-white rounded-xl p-10 text-center">
        <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다.</p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">알림</h1>
          <p className="text-[12px] text-gray-500 mt-1">
            예약·후기·병원 상태 변경 등 모든 알림을 한곳에서 확인합니다.
          </p>
        </div>
        <button
          onClick={markAllRead}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-700 btn-press"
        >
          모두 읽음 처리
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-1">
        {(['전체', 'important', 'event', 'recommendation', 'info', 'update'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
            style={{
              backgroundColor: filter === f ? '#2B313D' : '#F4F5F7',
              color: filter === f ? '#fff' : '#51535C',
            }}
          >
            {f === '전체' ? '전체' : TYPE_CFG[f]?.label ?? f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Bell size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">알림이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
          {filtered.map((n) => {
            const cfg = TYPE_CFG[n.type] ?? TYPE_CFG.info;
            const isRead = readIds.has(n.id) || n.isRead;
            const inner = (
              <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                >
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-[12px] font-semibold text-gray-900 truncate">{n.title}</span>
                    {!isRead && (
                      <span className="text-[9px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 leading-none">
                        NEW
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-gray-400 flex-shrink-0">{relTime(n.date)}</span>
                  </div>
                  <p className="text-[12px] text-gray-600 leading-snug line-clamp-2">{n.content}</p>
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="block">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
