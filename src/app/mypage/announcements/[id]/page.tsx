'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import { announcements } from '@/lib/mock-data';

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const announcement = announcements.find((a) => a.id === id);

  if (!announcement) {
    return (
      <div className="min-h-screen bg-white max-w-[480px] mx-auto">
        <TopBar title="공지사항" />
        <div className="flex flex-col items-center justify-center py-20 px-2.5">
          <p className="text-sm text-gray-500 mb-4">공지사항을 찾을 수 없습니다.</p>
          <Link href="/mypage/announcements" className="text-sm text-[#7C3AED] font-medium">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto pb-12">
      <TopBar title="공지사항" />

      <article className="px-2.5 py-6">
        <header className="pb-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900 leading-snug mb-2">
            {announcement.title}
          </h1>
          <p className="text-xs text-gray-400">{announcement.date}</p>
        </header>
        <div className="pt-5 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
          {announcement.content}
        </div>
      </article>

      <div className="px-2.5">
        <Link
          href="/mypage/announcements"
          className="block w-full py-3 text-center text-sm font-medium text-gray-600 bg-gray-50 rounded-xl"
        >
          목록으로
        </Link>
      </div>
    </div>
  );
}
