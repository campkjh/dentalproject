'use client';

import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import { announcements } from '@/lib/mock-data';
import { ChevronRight } from 'lucide-react';

export default function AnnouncementsPage() {
  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto">
      <TopBar title="공지사항" />

      <div className="divide-y divide-gray-100">
        {announcements.map((announcement) => (
          <Link
            key={announcement.id}
            href={`/mypage/announcements/${announcement.id}`}
            className="w-full flex items-center justify-between px-2.5 py-4 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                {announcement.title}
              </p>
              <p className="text-xs text-gray-400">{announcement.date}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
          </Link>
        ))}
      </div>

      {announcements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-gray-500">공지사항이 없습니다</p>
        </div>
      )}
    </div>
  );
}
