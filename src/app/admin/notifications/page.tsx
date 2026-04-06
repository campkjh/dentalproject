'use client';

import { useState } from 'react';
import {
  Bell,
  Megaphone,
  Plus,
  Send,
  Search,
  Edit3,
  Trash2,
  StopCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';

type AnnouncementStatus = '게시중' | '종료' | '예약';
type AnnouncementCategory = '서비스' | '이벤트' | '업데이트' | '안내';
type PushStatus = '발송완료' | '예약' | '발송실패';
type PushTarget = '전체' | '일반회원' | '의사' | '특정병원';

interface Announcement {
  id: number;
  title: string;
  category: AnnouncementCategory;
  createdAt: string;
  views: number;
  status: AnnouncementStatus;
}

interface PushNotification {
  id: number;
  title: string;
  target: PushTarget;
  sentAt: string;
  sentCount: number;
  readRate: number;
  status: PushStatus;
}

const mockAnnouncements: Announcement[] = [
  { id: 1, title: '2026년 4월 서비스 정기 점검 안내', category: '서비스', createdAt: '2026-04-05', views: 1243, status: '게시중' },
  { id: 2, title: '봄맞이 치아미백 특별 할인 이벤트', category: '이벤트', createdAt: '2026-04-03', views: 3856, status: '게시중' },
  { id: 3, title: '앱 버전 3.2.0 업데이트 안내', category: '업데이트', createdAt: '2026-04-01', views: 2104, status: '게시중' },
  { id: 4, title: '개인정보처리방침 변경 안내', category: '안내', createdAt: '2026-03-28', views: 1567, status: '게시중' },
  { id: 5, title: '설 연휴 고객센터 운영 시간 안내', category: '안내', createdAt: '2026-03-25', views: 987, status: '종료' },
  { id: 6, title: '신규 병원 입점 기념 쿠폰 이벤트', category: '이벤트', createdAt: '2026-03-20', views: 4521, status: '종료' },
  { id: 7, title: '5월 가정의 달 특별 프로모션 예고', category: '이벤트', createdAt: '2026-04-06', views: 0, status: '예약' },
  { id: 8, title: '앱 버전 3.3.0 업데이트 예정 안내', category: '업데이트', createdAt: '2026-04-06', views: 0, status: '예약' },
  { id: 9, title: '예약 시스템 개선 안내', category: '서비스', createdAt: '2026-03-15', views: 2890, status: '종료' },
];

const mockPushNotifications: PushNotification[] = [
  { id: 1, title: '봄맞이 치아미백 50% 할인!', target: '전체', sentAt: '2026-04-05 10:00', sentCount: 12458, readRate: 68.5, status: '발송완료' },
  { id: 2, title: '예약 확정 안내 (4월 일괄 발송)', target: '일반회원', sentAt: '2026-04-04 09:00', sentCount: 11230, readRate: 72.3, status: '발송완료' },
  { id: 3, title: '의사회원 전용 세미나 안내', target: '의사', sentAt: '2026-04-03 14:00', sentCount: 886, readRate: 45.2, status: '발송완료' },
  { id: 4, title: '참포도나무치과 신규 상품 등록 안내', target: '특정병원', sentAt: '2026-04-02 11:30', sentCount: 245, readRate: 82.1, status: '발송완료' },
  { id: 5, title: '5월 가정의 달 특별 쿠폰 발송', target: '전체', sentAt: '2026-04-10 09:00', sentCount: 0, readRate: 0, status: '예약' },
  { id: 6, title: '시스템 점검 긴급 알림', target: '전체', sentAt: '2026-04-01 08:00', sentCount: 0, readRate: 0, status: '발송실패' },
  { id: 7, title: '리뷰 작성 유도 알림', target: '일반회원', sentAt: '2026-03-30 15:00', sentCount: 8450, readRate: 35.7, status: '발송완료' },
];

const announcementStatusBadge: Record<AnnouncementStatus, string> = {
  '게시중': 'bg-green-100 text-green-700',
  '종료': 'bg-gray-100 text-gray-500',
  '예약': 'bg-blue-100 text-blue-700',
};

const pushStatusBadge: Record<PushStatus, string> = {
  '발송완료': 'bg-green-100 text-green-700',
  '예약': 'bg-blue-100 text-blue-700',
  '발송실패': 'bg-red-100 text-red-700',
};

const categoryBadge: Record<AnnouncementCategory, string> = {
  '서비스': 'bg-blue-100 text-blue-700',
  '이벤트': 'bg-purple-100 text-purple-700',
  '업데이트': 'bg-orange-100 text-orange-700',
  '안내': 'bg-gray-100 text-gray-600',
};

const targetBadge: Record<PushTarget, string> = {
  '전체': 'bg-purple-100 text-purple-700',
  '일반회원': 'bg-blue-100 text-blue-700',
  '의사': 'bg-green-100 text-green-700',
  '특정병원': 'bg-orange-100 text-orange-700',
};

export default function AdminNotificationsPage() {
  const [activeTab, setActiveTab] = useState<'announcements' | 'push'>('announcements');
  const [announcementPage, setAnnouncementPage] = useState(1);
  const [pushPage, setPushPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { key: 'announcements' as const, label: '공지사항 관리', icon: Megaphone },
    { key: 'push' as const, label: '푸시알림 관리', icon: Bell },
  ];

  const totalAnnouncementPages = 5;
  const totalPushPages = 3;

  const getPageNumbers = (current: number, total: number) => {
    const pages: (number | string)[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 3) {
        pages.push(1, 2, 3, 4, '...', total);
      } else if (current >= total - 2) {
        pages.push(1, '...', total - 3, total - 2, total - 1, total);
      } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', total);
      }
    }
    return pages;
  };

  const filteredAnnouncements = mockAnnouncements.filter((a) =>
    a.title.includes(searchQuery)
  );

  const filteredPush = mockPushNotifications.filter((p) =>
    p.title.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">알림/공지 관리</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="제목으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-colors"
            />
          </div>
          {activeTab === 'announcements' ? (
            <button className="flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:bg-[#6D28D9] transition-colors shadow-sm">
              <Plus size={16} />
              새 공지 작성
            </button>
          ) : (
            <button className="flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:bg-[#6D28D9] transition-colors shadow-sm">
              <Send size={16} />
              새 알림 발송
            </button>
          )}
        </div>
      </div>

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">번호</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">카테고리</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작성일</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">조회수</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAnnouncements.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 text-sm text-gray-500">{item.id}</td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900 max-w-[300px]">
                      {item.title}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${categoryBadge[item.category]}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{item.createdAt}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Eye size={14} className="text-gray-400" />
                        {item.views.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${announcementStatusBadge[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-600" title="수정">
                          <Edit3 size={15} />
                        </button>
                        {item.status === '게시중' && (
                          <button className="p-1.5 hover:bg-orange-50 rounded-lg transition-colors text-orange-600" title="종료">
                            <StopCircle size={15} />
                          </button>
                        )}
                        <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-500" title="삭제">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              전체 <span className="font-medium text-gray-900">45</span>건 중{' '}
              <span className="font-medium text-gray-900">{(announcementPage - 1) * 10 + 1}-{Math.min(announcementPage * 10, 45)}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAnnouncementPage(Math.max(1, announcementPage - 1))}
                disabled={announcementPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} className="text-gray-600" />
              </button>
              {getPageNumbers(announcementPage, totalAnnouncementPages).map((page, idx) =>
                typeof page === 'string' ? (
                  <span key={`dots-${idx}`} className="px-2 py-1 text-sm text-gray-400">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setAnnouncementPage(page)}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                      announcementPage === page
                        ? 'bg-[#7C3AED] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => setAnnouncementPage(Math.min(totalAnnouncementPages, announcementPage + 1))}
                disabled={announcementPage === totalAnnouncementPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Push Notifications Tab */}
      {activeTab === 'push' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">번호</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대상</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">발송일시</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">발송수</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">읽음률</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPush.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 text-sm text-gray-500">{item.id}</td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900 max-w-[300px]">
                      {item.title}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${targetBadge[item.target]}`}>
                        {item.target}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{item.sentAt}</td>
                    <td className="px-5 py-4 text-sm text-gray-900 font-medium">
                      {item.sentCount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-[#7C3AED] rounded-full"
                            style={{ width: `${item.readRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-700 font-medium">{item.readRate}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${pushStatusBadge[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              전체 <span className="font-medium text-gray-900">27</span>건 중{' '}
              <span className="font-medium text-gray-900">{(pushPage - 1) * 10 + 1}-{Math.min(pushPage * 10, 27)}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPushPage(Math.max(1, pushPage - 1))}
                disabled={pushPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} className="text-gray-600" />
              </button>
              {getPageNumbers(pushPage, totalPushPages).map((page, idx) =>
                typeof page === 'string' ? (
                  <span key={`dots-${idx}`} className="px-2 py-1 text-sm text-gray-400">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setPushPage(page)}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                      pushPage === page
                        ? 'bg-[#7C3AED] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => setPushPage(Math.min(totalPushPages, pushPage + 1))}
                disabled={pushPage === totalPushPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
