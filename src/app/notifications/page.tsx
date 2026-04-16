'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Trash2, X, ChevronLeft } from 'lucide-react';
import { useStore } from '@/store';
import { Notification } from '@/types';

const typeBadgeMap: Record<string, { label: string; color: string; bg: string }> = {
  event: { label: '이벤트', color: '#7C3AED', bg: '#EDE9FE' },
  important: { label: '중요', color: '#DC2626', bg: '#FEE2E2' },
  recommendation: { label: '추천', color: '#059669', bg: '#D1FAE5' },
  info: { label: '안내', color: '#2563EB', bg: '#DBEAFE' },
  update: { label: '업데이트', color: '#D97706', bg: '#FEF3C7' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const storeNotifications = useStore((s) => s.notifications);
  const [items, setItems] = useState<Notification[]>(storeNotifications);
  useEffect(() => {
    setItems(storeNotifications);
  }, [storeNotifications]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Swipe state per item
  const [swipeStates, setSwipeStates] = useState<Record<string, number>>({});
  const touchStartX = useRef<Record<string, number>>({});
  const touchCurrentX = useRef<Record<string, number>>({});

  const filteredItems = searchQuery
    ? items.filter(n => n.title.includes(searchQuery) || n.content.includes(searchQuery))
    : items;

  const handleDeleteAll = () => {
    setItems([]);
    setShowDeleteConfirm(false);
  };

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(n => n.id !== id));
    setSwipeStates(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  // Touch handlers for swipe-to-delete
  const handleTouchStart = useCallback((id: string, e: React.TouchEvent) => {
    touchStartX.current[id] = e.touches[0].clientX;
    touchCurrentX.current[id] = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((id: string, e: React.TouchEvent) => {
    touchCurrentX.current[id] = e.touches[0].clientX;
    const diff = touchStartX.current[id] - touchCurrentX.current[id];
    const clampedDiff = Math.max(0, Math.min(diff, 100));
    setSwipeStates(prev => ({ ...prev, [id]: clampedDiff }));
  }, []);

  const handleTouchEnd = useCallback((id: string) => {
    const diff = touchStartX.current[id] - touchCurrentX.current[id];
    if (diff > 80) {
      // Show delete button
      setSwipeStates(prev => ({ ...prev, [id]: 80 }));
    } else {
      // Snap back
      setSwipeStates(prev => ({ ...prev, [id]: 0 }));
    }
  }, []);

  // Mouse handlers for desktop swipe
  const mouseDown = useRef<Record<string, boolean>>({});

  const handleMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    mouseDown.current[id] = true;
    touchStartX.current[id] = e.clientX;
    touchCurrentX.current[id] = e.clientX;
  }, []);

  const handleMouseMove = useCallback((id: string, e: React.MouseEvent) => {
    if (!mouseDown.current[id]) return;
    touchCurrentX.current[id] = e.clientX;
    const diff = touchStartX.current[id] - touchCurrentX.current[id];
    const clampedDiff = Math.max(0, Math.min(diff, 100));
    setSwipeStates(prev => ({ ...prev, [id]: clampedDiff }));
  }, []);

  const handleMouseUp = useCallback((id: string) => {
    if (!mouseDown.current[id]) return;
    mouseDown.current[id] = false;
    const diff = touchStartX.current[id] - touchCurrentX.current[id];
    if (diff > 80) {
      setSwipeStates(prev => ({ ...prev, [id]: 80 }));
    } else {
      setSwipeStates(prev => ({ ...prev, [id]: 0 }));
    }
  }, []);

  return (
    <div className="min-h-screen bg-white page-enter">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40 }} className="bg-white">
        <div className="flex items-center justify-between h-12 px-2.5">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="p-1 -ml-1">
              <ChevronLeft size={24} style={{ color: '#2B313D' }} />
            </button>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#2B313D' }}>쪽지</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Search size={20} style={{ color: '#2B313D' }} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Trash2 size={20} style={{ color: '#A4ABBA' }} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="px-2.5 pb-3 fade-in-up">
            <div
              style={{ height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#C8CEDA', backgroundColor: '#F2F3F5' }}
              className="flex items-center px-3 gap-2 border-solid"
            >
              <Search size={16} style={{ color: '#A4ABBA' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="쪽지 검색"
                autoFocus
                style={{ fontSize: 14, color: '#2B313D' }}
                className="flex-1 bg-transparent outline-none placeholder-[#A4ABBA]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <X size={16} style={{ color: '#A4ABBA' }} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notification List */}
      {filteredItems.length > 0 ? (
        <div>
          {filteredItems.map((notification) => {
            const badge = typeBadgeMap[notification.type];
            const swipeX = swipeStates[notification.id] ?? 0;
            const isUnread = !notification.isRead;

            return (
              <div
                key={notification.id}
                className="relative overflow-hidden"
                style={{ borderBottom: '1px solid #F2F3F5' }}
              >
                {/* Delete button behind */}
                <div
                  className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
                  style={{ width: 80, backgroundColor: '#EF4444' }}
                >
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="flex flex-col items-center gap-1 text-white"
                  >
                    <Trash2 size={18} />
                    <span style={{ fontSize: 11 }}>삭제</span>
                  </button>
                </div>

                {/* Swipeable content */}
                <Link
                  href={`/notifications/${notification.id}`}
                  className="block relative"
                  style={{
                    transform: `translateX(-${swipeX}px)`,
                    transition: swipeX === 0 ? 'transform 0.3s ease' : 'none',
                    backgroundColor: isUnread ? '#FAFAFF' : '#FFFFFF',
                  }}
                  onTouchStart={(e) => handleTouchStart(notification.id, e)}
                  onTouchMove={(e) => handleTouchMove(notification.id, e)}
                  onTouchEnd={() => handleTouchEnd(notification.id)}
                  onMouseDown={(e) => handleMouseDown(notification.id, e)}
                  onMouseMove={(e) => handleMouseMove(notification.id, e)}
                  onMouseUp={() => handleMouseUp(notification.id)}
                  onMouseLeave={() => handleMouseUp(notification.id)}
                  onClick={(e) => {
                    if (swipeX > 20) { e.preventDefault(); setSwipeStates(prev => ({ ...prev, [notification.id]: 0 })); }
                  }}
                >
                  <div className="px-2.5 py-4">
                    {/* Badge + Date row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          style={{ fontSize: 11, fontWeight: 600, color: badge.color, backgroundColor: badge.bg, borderRadius: 4 }}
                          className="px-2 py-0.5"
                        >
                          {badge.label}
                        </span>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#7C3AED' }} />
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: '#A4ABBA' }}>{notification.date}</span>
                    </div>

                    {/* Title */}
                    <p style={{ fontSize: 18, fontWeight: 600, color: '#2B313D', lineHeight: '24px' }} className="mb-1.5">
                      {notification.title}
                    </p>

                    {/* Content preview with gradient fade */}
                    <div className="relative" style={{ maxHeight: 60, overflow: 'hidden' }}>
                      <p style={{ fontSize: 14, color: '#A4ABBA', lineHeight: '20px' }}>
                        {notification.content}
                      </p>
                      {/* Gradient fade */}
                      <div
                        className="absolute bottom-0 left-0 right-0"
                        style={{
                          height: 30,
                          background: isUnread
                            ? 'linear-gradient(transparent, #FAFAFF)'
                            : 'linear-gradient(transparent, #FFFFFF)',
                        }}
                      />
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bounce-in">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#F2F3F5' }}>
            <Search size={28} style={{ color: '#A4ABBA' }} />
          </div>
          <p style={{ color: '#A4ABBA', fontSize: 14 }}>
            {searchQuery ? '검색 결과가 없습니다' : '쪽지가 없습니다'}
          </p>
        </div>
      )}

      {/* Delete All Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 modal-overlay-enter" onClick={() => setShowDeleteConfirm(false)}>
          <div
            className="modal-content-enter"
            style={{ width: 340, height: 160, borderRadius: 24, backgroundColor: '#FFFFFF', paddingTop: 18, paddingBottom: 12, paddingLeft: 12, paddingRight: 12, display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0, marginTop: -4 }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#2B313D', textAlign: 'left' }}>전체 삭제하시겠습니까?</h3>
              <p style={{ fontSize: 15, fontWeight: 500, color: '#51535C', textAlign: 'left' }}>삭제된 쪽지는 복구할 수 없습니다.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDeleteAll} style={{ flex: 1, height: 48, borderRadius: 12, backgroundColor: '#8037FF', color: '#FFFFFF', fontSize: 18, fontWeight: 600, border: 'none', cursor: 'pointer' }}>네</button>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, height: 48, borderRadius: 12, backgroundColor: '#F2F3F5', color: '#51535C', fontSize: 18, fontWeight: 600, border: 'none', cursor: 'pointer' }}>아니요</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
