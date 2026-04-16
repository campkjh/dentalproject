'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Menu, X, Bell, Search } from 'lucide-react';

interface NavChild {
  label: string;
  href: string;
}
interface NavItem {
  label: string;
  href?: string;
  icon: string;
  children?: NavChild[];
}

const NAV: NavItem[] = [
  { label: '홈', icon: '🏠', href: '/partner' },
  { label: '알림', icon: '🔔', href: '/partner/notices' },
  { label: '채팅상담', icon: '💬', href: '/partner/chat' },
  {
    label: '병원 관리',
    icon: '🏥',
    children: [
      { label: '병원 정보', href: '/partner/hospital-info' },
      { label: '의사 정보', href: '/partner/doctors' },
      { label: '연락처 정보', href: '/partner/contact' },
    ],
  },
  { label: '병원포인트', icon: '💰', href: '/partner/points' },
  {
    label: '이벤트 관리',
    icon: '🎁',
    children: [
      { label: '승인 요청 내역', href: '/partner/events/approval' },
      { label: '이벤트 목록', href: '/partner/events/list' },
    ],
  },
  { label: '이벤트 Q&A 관리', icon: '❓', href: '/partner/events/qa' },
  { label: '예산 관리', icon: '📊', href: '/partner/budget' },
  { label: '성과 관리', icon: '📈', href: '/partner/performance' },
  { label: '상담 관리', icon: '📞', href: '/partner/consults' },
  { label: '예약 관리', icon: '📅', href: '/partner/reservations' },
  { label: '후기 관리', icon: '⭐', href: '/partner/reviews' },
  { label: '부가광고 관리', icon: '📣', href: '/partner/ads' },
  {
    label: '앱결제 관리',
    icon: '💳',
    children: [
      { label: '앱결제 이용 정보', href: '/partner/app-pay/info' },
      { label: '앱결제 정보 관리', href: '/partner/app-pay/payments' },
      { label: '정산 내역 확인', href: '/partner/app-pay/settlement' },
    ],
  },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [openItems, setOpenItems] = useState<Set<string>>(
    new Set(['병원 관리', '이벤트 관리', '앱결제 관리'])
  );

  // Auth/landing pages render without the sidebar shell
  if (pathname === '/partner/login') {
    return <>{children}</>;
  }
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleItem = (label: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/partner') return pathname === '/partner';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const Sidebar = (
    <aside
      className="h-full bg-white border-r border-gray-200 flex flex-col"
      style={{ width: 220 }}
    >
      <div className="h-14 px-4 flex items-center gap-2 border-b border-gray-100">
        <div className="w-6 h-6 rounded-md bg-[#7C3AED] flex items-center justify-center text-white text-xs font-black">
          G
        </div>
        <span className="text-[13px] font-bold text-gray-900">강남언니 파트너센터</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map((item) => {
          const active = item.children
            ? item.children.some((c) => isActive(c.href))
            : isActive(item.href);
          if (item.children) {
            const isOpen = openItems.has(item.label);
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleItem(item.label)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-left text-[13px] ${
                    active ? 'text-[#7C3AED] font-semibold' : 'text-gray-700'
                  } hover:bg-gray-50`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base w-5 text-center">{item.icon}</span>
                    {item.label}
                  </span>
                  {isOpen ? (
                    <ChevronDown size={14} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={14} className="text-gray-400" />
                  )}
                </button>
                <div
                  className="overflow-hidden"
                  style={{
                    maxHeight: isOpen ? item.children.length * 36 + 8 : 0,
                    transition: 'max-height 260ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`block pl-11 pr-4 py-2 text-[12.5px] ${
                        isActive(c.href)
                          ? 'text-[#7C3AED] font-semibold bg-[#F4EFFF]'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          }
          return (
            <Link
              key={item.label}
              href={item.href!}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-2 px-4 py-2 text-[13px] ${
                active ? 'text-[#7C3AED] font-semibold bg-[#F4EFFF]' : 'text-gray-700'
              } hover:bg-gray-50`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-gray-100 text-[11px] text-gray-400 leading-relaxed">
        파트너 고객센터
        <br />
        1588-0000
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">{Sidebar}</div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="absolute top-0 left-0 h-full modal-content-enter"
            onClick={(e) => e.stopPropagation()}
          >
            {Sidebar}
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 px-3 lg:px-5 flex items-center gap-3 sticky top-0 z-30">
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden -ml-1 p-1"
            aria-label="메뉴"
          >
            <Menu size={22} className="text-gray-700" />
          </button>
          <div className="hidden lg:flex items-center gap-2 text-[13px] font-semibold text-gray-900">
            파트너센터
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div
              className="hidden sm:flex items-center gap-2 px-3"
              style={{
                height: 32,
                borderRadius: 9999,
                backgroundColor: '#F4F5F7',
              }}
            >
              <Search size={14} className="text-gray-400" />
              <input
                placeholder="파트너 가이드"
                className="text-[12px] bg-transparent outline-none placeholder:text-gray-400 w-28"
              />
            </div>
            <button className="p-1.5 rounded-full hover:bg-gray-100">
              <Bell size={18} className="text-gray-700" />
            </button>
            <Link
              href="/partner/account"
              aria-label="계정 설정"
              className="w-7 h-7 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-[11px] font-bold btn-press"
            >
              H
            </Link>
          </div>
        </header>
        <div key={pathname} className="flex-1 p-3 lg:p-5 partner-page">{children}</div>
      </main>
    </div>
  );
}
