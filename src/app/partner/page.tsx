'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, RefreshCw } from 'lucide-react';

type Notice = {
  id: number;
  category: '일반' | '이벤트' | '공지' | '결제';
  title: string;
  date: string;
  isNew?: boolean;
};

const NOTICES: Notice[] = [
  { id: 1, category: '일반', title: '만성질환 소비자를 위한 원내 광고 대상 기획전 연장 안내', date: '25.09.03 13:25', isNew: true },
  { id: 2, category: '이벤트', title: '이벤트 검수 지연 안내', date: '25.09.01 21:46', isNew: true },
  { id: 3, category: '공지', title: '앱지기 앱레터 기능 개편 안내', date: '25.08.22 15:30' },
  { id: 4, category: '이벤트', title: '이벤트 별 후기 연동 예정 안내', date: '25.08.22 14:29' },
  { id: 5, category: '이벤트', title: '잇샷한 방지 앱 내 반영 안내', date: '25.08.22 14:26' },
  { id: 6, category: '공지', title: '관리자 페이지 명칭 탭 UI 디자인 변경 안내', date: '25.09.19 18:04' },
  { id: 7, category: '결제', title: '앱결제 정산 스케줄 개편 안내', date: '25.08.19 14:02' },
  { id: 8, category: '일반', title: '개인정보처리방침 개정 예고 안내', date: '25.08.15 09:00' },
  { id: 9, category: '이벤트', title: '시술카테고리 내 신규 항목 추가 안내', date: '25.08.12 11:20' },
  { id: 10, category: '공지', title: '여름 점검 일정 사전 공지', date: '25.08.08 18:00' },
];

type ChatItem = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread: number;
};

const CHATS: ChatItem[] = [
  { id: 'c1', name: '이지은', preview: '전후 사진 확인이 가능할까요?', time: '방금', unread: 2 },
  { id: 'c2', name: '박민수', preview: '예약 시간 변경 가능할지 문의드립니다', time: '12분 전', unread: 1 },
  { id: 'c3', name: '김하늘', preview: '네 감사합니다!', time: '1시간 전', unread: 0 },
];

const CATEGORY_COLOR: Record<Notice['category'], string> = {
  일반: 'bg-[#E8F3FF] text-[#1E6FD9]',
  이벤트: 'bg-[#FEF3C7] text-[#B45309]',
  공지: 'bg-[#EDE7FF] text-[#6D28D9]',
  결제: 'bg-[#E6F7EB] text-[#15803D]',
};

export default function PartnerHomePage() {
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const totalPages = Math.ceil(NOTICES.length / pageSize);
  const pageNotices = NOTICES.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      {/* Upgrade banner */}
      <section
        className="rounded-xl px-6 py-5 text-center"
        style={{
          background: 'linear-gradient(90deg, #FFF9E5 0%, #FFF4C9 100%)',
          border: '1px solid #F8E191',
        }}
      >
        <p className="text-[14px] font-bold text-gray-900">
          📢 <span className="text-[#E89D2A]">고객평가우수병원</span>을 업그레이드하고 있어요!
        </p>
        <p className="text-[12px] text-gray-600 mt-2 leading-relaxed">
          평가 체계 개편으로 고객평가우수병원 평가가 잠시 중단됩니다.
          <br />
          이에 따른 신규 선정 및 캡 배지 노출도 잠시 중단됩니다.
          <br />
          우수 병원에 다 큰 이력에 해택을 드릴 수 있도록 준비 하고 있으니 관계자님들의 양해부탁드립니다.
        </p>
        <p className="text-[11px] text-gray-500 mt-2">
          중단 기간: 2025년 6월 1일 ~ 2025년 10월 중순
        </p>
      </section>

      {/* KPI cards — quick glance of current state */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="오늘 상담 신청" value="8" delta="+3" deltaTone="up" href="/partner/consults" />
        <KpiCard label="미답변 Q&A" value="3" delta="+1" deltaTone="warn" href="/partner/events/qa" />
        <KpiCard label="내일 예약" value="5" delta="확정 3" deltaTone="neutral" href="/partner/reservations" />
        <KpiCard label="잔여 포인트" value="3,840,000" suffix="P" deltaTone="neutral" href="/partner/points" />
      </div>

      {/* Hot link bar */}
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: 'linear-gradient(90deg, #EDF7FF 0%, #F2FAF0 100%)' }}
      >
        <span className="text-[10px] font-bold text-white bg-[#FF5B5B] rounded px-1.5 py-0.5">
          HOT
        </span>
        <Link href="#" className="flex-1 text-[13px] font-semibold text-gray-900">
          참여 비용 줄이고 예약 매출은 확 높인 <span className="text-[#7C3AED]">일본 상담회 신청하기</span>
        </Link>
        <ChevronRight size={16} className="text-gray-400" />
      </div>

      {/* Two-column: notices + chat */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
        {/* Notices */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-[14px] font-bold text-gray-900">공지사항</h2>
            <Link href="#" className="text-[11px] text-gray-400 hover:text-gray-600">
              전체보기 <ChevronRight size={11} className="inline" />
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {pageNotices.map((n) => (
              <li key={n.id}>
                <Link
                  href="#"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span
                    className={`text-[10px] font-bold rounded px-1.5 py-0.5 flex-shrink-0 ${CATEGORY_COLOR[n.category]}`}
                  >
                    [{n.category}]
                  </span>
                  <span className="flex-1 text-[13px] text-gray-800 truncate">
                    {n.title}
                  </span>
                  {n.isNew && (
                    <span className="text-[9px] font-bold text-white bg-[#FF5B5B] rounded px-1.5 py-0.5 flex-shrink-0">
                      NEW
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400 flex-shrink-0 w-[92px] text-right">
                    {n.date}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {/* Pagination */}
          <div className="flex items-center justify-center gap-1 py-3 border-t border-gray-100">
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-6 h-6 rounded text-[11px] font-semibold flex items-center justify-center"
                  style={{
                    backgroundColor: page === p ? '#2B313D' : 'transparent',
                    color: page === p ? '#fff' : '#51535C',
                  }}
                >
                  {p}
                </button>
              );
            })}
            <button className="text-[11px] text-gray-400 px-1.5">
              <ChevronRight size={12} />
            </button>
          </div>
        </section>

        {/* Chat panel */}
        <aside className="bg-white rounded-xl border border-gray-200 overflow-hidden h-fit">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-[13px] font-bold text-gray-900">
              안 읽은 채팅상담
            </h2>
            <button
              aria-label="새로고침"
              className="p-1 -m-1 rounded hover:bg-gray-100 text-gray-400"
            >
              <RefreshCw size={13} />
            </button>
          </div>
          {CHATS.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[12px] text-gray-400">안 읽은 채팅이 없어요</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {CHATS.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/partner/chat?id=${c.id}`}
                    className="flex items-start gap-2 px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#F4F5F7] text-gray-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                      {c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[12px] font-semibold text-gray-900 truncate">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">
                          {c.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{c.preview}</p>
                    </div>
                    {c.unread > 0 && (
                      <span className="flex-shrink-0 text-[9px] font-bold text-white bg-[#FF5B5B] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                        {c.unread}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  delta,
  deltaTone,
  href,
}: {
  label: string;
  value: string;
  suffix?: string;
  delta?: string;
  deltaTone: 'up' | 'down' | 'warn' | 'neutral';
  href: string;
}) {
  const deltaColor = {
    up: '#15803D',
    down: '#E5484D',
    warn: '#B45309',
    neutral: '#6B7280',
  }[deltaTone];
  return (
    <Link
      href={href}
      className="block bg-white rounded-xl border border-gray-200 p-4 partner-card"
    >
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-[22px] font-extrabold text-gray-900 mt-1 leading-none">
        {value}
        {suffix && <span className="text-[12px] font-semibold text-gray-600 ml-1">{suffix}</span>}
      </p>
      {delta && (
        <p className="text-[11px] font-semibold mt-1.5" style={{ color: deltaColor }}>
          {delta}
        </p>
      )}
    </Link>
  );
}
