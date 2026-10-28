'use client';

// 공지사항 — 프리티풀 마이 > 공지사항(토스 뉴스룸 카드) 결: 4:3 카드에 파스텔 바탕 + 토스 아이콘, 아래 그라데이션 흐림 위에 '태그 | 날짜' + 굵은 제목 2줄.
//  · 모바일 1열 · PC 2열. 누르면 공지 상세(/mypage/announcements/[id]).
import Link from 'next/link';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import { Screen, EmptyBlock, TossIcon, screenCss as s } from '@/components/mypage/screens/ScreenKit';
import { noticeArt, withAlpha } from '@/components/mypage/screens/notice-art';

export default function AnnouncementsPage() {
  const announcements = useStore((st) => st.announcements);
  return (
    <Screen wide>
      <TopBar title="공지사항" sub="마이닥의 새 소식을 알려 드려요" />

      {announcements.length === 0 ? (
        <EmptyBlock icon="loudspeaker" title="등록된 공지사항이 없어요" desc="새로운 소식이 생기면 이곳에 알려드릴게요." />
      ) : (
        <div className="grid grid-cols-1 gap-4 px-5 pt-1 pc:grid-cols-2 pc:gap-6 pc:px-8">
          {announcements.map((a, i) => {
            const art = noticeArt(a.id, a.title);
            return (
              <Link
                key={a.id}
                href={`/mypage/announcements/${a.id}`}
                className={`${s.newsCard} qd-a-item block`}
                style={{ animationDelay: `${0.22 + Math.min(i, 10) * 0.05}s` }}
              >
                <div
                  // translateZ(0): 사파리에서 안쪽 흐림이 둥근 모서리 밖으로 번지지 않게
                  className="relative overflow-hidden rounded-[28px] pc:rounded-[32px]"
                  style={{ aspectRatio: '4 / 3', backgroundColor: art.bg, transform: 'translateZ(0)' }}
                >
                  <span className={`${s.newsArt} absolute inset-x-0 top-[12%] flex justify-center`}>
                    <TossIcon name={art.icon} size={112} />
                  </span>
                  <span aria-hidden="true" className={`${s.newsBlur} pointer-events-none absolute inset-x-0 bottom-0 h-[62%]`} />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%]"
                    style={{ background: `linear-gradient(to bottom, ${withAlpha(art.bg, 0)} 0%, ${withAlpha(art.bg, 0.42)} 50%, ${withAlpha(art.bg, 0.62)} 100%)` }}
                  />
                  <span className="absolute inset-x-0 bottom-0 block px-6 pb-6 pc:px-7 pc:pb-7">
                    <span className="flex items-center text-[13px] font-medium leading-[1.4] tracking-[-0.2px] text-[#6B7684]">
                      {art.tag}
                      <span aria-hidden="true" className="mx-2 h-[11px] w-px bg-[#8B95A1] opacity-50" />
                      {a.date}
                    </span>
                    <span className="mt-2.5 line-clamp-2 break-keep text-[19px] font-bold leading-[1.38] tracking-[-0.5px] text-[#191F28] pc:text-[20px]">
                      {a.title}
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Screen>
  );
}
