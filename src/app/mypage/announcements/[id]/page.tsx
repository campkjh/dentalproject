'use client';

// 공지 상세 — 프리티풀 공지 시트 본문 결: 파스텔 그림 띠 · '태그 · 날짜' · 큰 제목 · 읽기 좋은 본문(16 · 줄 1.75) · 아래 '목록으로'.
import { useParams } from 'next/navigation';
import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import { QdBody } from '@/components/detail/QdKit';
import { Screen, EmptyBlock, TossIcon } from '@/components/mypage/screens/ScreenKit';
import { noticeArt } from '@/components/mypage/screens/notice-art';

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const announcements = useStore((s) => s.announcements);
  const announcement = announcements.find((a) => a.id === id);

  if (!announcement) {
    return (
      <Screen>
        <TopBar title="공지사항" />
        <EmptyBlock icon="loudspeaker" title="공지사항을 찾을 수 없어요" desc="지워졌거나 주소가 바뀌었을 수 있어요.">
          <Link href="/mypage/announcements" className="qd-cta ghost mt-7 max-w-[240px]">목록으로 돌아가기</Link>
        </EmptyBlock>
      </Screen>
    );
  }

  const art = noticeArt(announcement.id, announcement.title);

  return (
    <Screen>
      <TopBar />

      <article className="px-6 pc:px-8">
        <div className="qd-a-title flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: art.bg }}>
            <TossIcon name={art.icon} size={28} />
          </span>
          <span className="text-[13px] leading-[1.5] text-[#8B95A1]">
            <b className="font-semibold text-[#4E5968]">{art.tag}</b> · {announcement.date}
          </span>
        </div>
        <h1 className="qd-a-title mt-4 break-keep text-[24px] font-bold leading-[1.4] tracking-[-0.5px] text-[#191F28]">
          {announcement.title}
        </h1>

        <QdBody>
          <div className="mt-6 border-t border-[#F2F4F6] pt-6 text-[16px] leading-[1.75] text-[#4E5968] [overflow-wrap:anywhere] whitespace-pre-line break-keep">
            {announcement.content}
          </div>
          <div className="mt-10">
            <Link href="/mypage/announcements" className="qd-cta ghost">목록으로</Link>
          </div>
        </QdBody>
      </article>
    </Screen>
  );
}
