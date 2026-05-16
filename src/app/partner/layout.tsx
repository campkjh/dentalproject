'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Menu,
  Bell,
  Home,
  MessageSquare,
  Building2,
  Coins,
  Gift,
  HelpCircle,
  PieChart,
  TrendingUp,
  Phone,
  CalendarDays,
  Star,
  Megaphone,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';

interface NavChild {
  label: string;
  href: string;
}
interface NavItem {
  label: string;
  href?: string;
  Icon: LucideIcon;
  children?: NavChild[];
}

const NAV: NavItem[] = [
  { label: '홈', Icon: Home, href: '/partner' },
  { label: '알림', Icon: Bell, href: '/partner/notices' },
  { label: '채팅상담', Icon: MessageSquare, href: '/partner/chat' },
  {
    label: '병원 관리',
    Icon: Building2,
    children: [
      { label: '병원 정보', href: '/partner/hospital-info' },
      { label: '의사 정보', href: '/partner/doctors' },
      { label: '연락처 정보', href: '/partner/contact' },
    ],
  },
  { label: '병원포인트', Icon: Coins, href: '/partner/points' },
  {
    label: '이벤트 관리',
    Icon: Gift,
    children: [
      { label: '승인 요청 내역', href: '/partner/events/approval' },
      { label: '이벤트 목록', href: '/partner/events/list' },
    ],
  },
  { label: '이벤트 Q&A 관리', Icon: HelpCircle, href: '/partner/events/qa' },
  { label: '예산 관리', Icon: PieChart, href: '/partner/budget' },
  { label: '성과 관리', Icon: TrendingUp, href: '/partner/performance' },
  { label: '상담 관리', Icon: Phone, href: '/partner/consults' },
  { label: '예약 관리', Icon: CalendarDays, href: '/partner/reservations' },
  { label: '후기 관리', Icon: Star, href: '/partner/reviews' },
  { label: '부가광고 관리', Icon: Megaphone, href: '/partner/ads' },
  {
    label: '앱결제 관리',
    Icon: CreditCard,
    children: [
      { label: '앱결제 이용 정보', href: '/partner/app-pay/info' },
      { label: '앱결제 정보 관리', href: '/partner/app-pay/payments' },
      { label: '정산 내역 확인', href: '/partner/app-pay/settlement' },
    ],
  },
];

const BOTTOM_NAV: NavItem[] = [
  { label: '홈', Icon: Home, href: '/partner' },
  { label: '상담', Icon: MessageSquare, href: '/partner/chat' },
  { label: '예약', Icon: CalendarDays, href: '/partner/reservations' },
  { label: '이벤트', Icon: Gift, href: '/partner/events/list' },
  { label: '관리', Icon: Menu, href: '/partner/account' },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { authUser, loading: sessionLoading } = useSession();
  const isDoctor = useStore((s) => s.isDoctor);
  const [openItems, setOpenItems] = useState<Set<string>>(
    new Set(['병원 관리', '이벤트 관리', '앱결제 관리'])
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isLoginPage = pathname === '/partner/login';

  useEffect(() => {
    if (isLoginPage || sessionLoading) return;
    if (!authUser) {
      router.replace('/partner/login');
      return;
    }
    if (!isDoctor) router.replace('/');
  }, [authUser, isDoctor, isLoginPage, router, sessionLoading]);

  // Auth/landing pages render without the sidebar shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (sessionLoading || !authUser || !isDoctor) {
    return (
      <div className="tds-screen min-h-screen flex items-center justify-center">
        <p className="text-[15px] text-[rgba(0,19,43,0.58)]">불러오는 중…</p>
      </div>
    );
  }

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
      className="h-full bg-white border-r border-[rgba(0,27,55,0.08)] flex flex-col"
      style={{ width: 232 }}
    >
      <div className="h-16 px-5 flex items-center gap-3 border-b border-[rgba(0,27,55,0.06)]">
        <div className="w-8 h-8 rounded-[10px] bg-[#3182F6] flex items-center justify-center text-white text-[14px] font-black">
          K
        </div>
        <span className="text-[15px] font-bold text-[#191F28]">키닥터 파트너센터</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
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
                  className={`w-full flex items-center justify-between px-5 py-2.5 text-left text-[14px] transition-colors ${
                    active ? 'text-[#3182F6] font-bold' : 'text-[rgba(3,18,40,0.7)]'
                  } hover:bg-[rgba(7,25,76,0.04)]`}
                >
                  <span className="flex items-center gap-2.5">
                    <item.Icon size={16} className="flex-shrink-0" />
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
                      className={`block ml-11 mr-3 rounded-[10px] px-3 py-2 text-[13px] transition-colors ${
                        isActive(c.href)
                          ? 'text-[#3182F6] font-bold bg-[#E8F3FF]'
                          : 'text-[rgba(3,18,40,0.7)] hover:bg-[rgba(7,25,76,0.04)]'
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
              className={`mx-3 flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[14px] transition-colors ${
                active ? 'text-[#3182F6] font-bold bg-[#E8F3FF]' : 'text-[rgba(3,18,40,0.7)]'
              } hover:bg-[rgba(7,25,76,0.04)]`}
            >
              <item.Icon size={16} className="flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[rgba(0,27,55,0.06)] text-[12px] text-[rgba(0,19,43,0.58)] leading-relaxed">
        파트너 고객센터
        <br />
        1588-0000
      </div>
    </aside>
  );

  return (
    <div className="tds-screen min-h-screen bg-[#EEF2F6] flex">
      {/* Desktop sidebar */}
      <div className="hidden 2xl:block flex-shrink-0">{Sidebar}</div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 2xl:hidden"
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

      <main className="flex-1 min-w-0">
        <div className="mx-auto min-h-screen w-full max-w-[430px] bg-white shadow-[0_24px_80px_rgba(25,31,40,0.12)]">
          <header className="sticky top-0 z-30 h-[56px] bg-white/95 backdrop-blur-xl px-5 flex items-center gap-3 border-b border-[rgba(0,27,55,0.06)]">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-9 h-9 rounded-[12px] bg-[rgba(7,25,76,0.05)] flex items-center justify-center"
              aria-label="메뉴"
            >
              <Menu size={20} className="text-[rgba(3,18,40,0.7)]" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-[12px] bg-[#3182F6] text-white flex items-center justify-center text-[14px] font-black">
                K
              </div>
              <span className="truncate text-[17px] font-bold text-[#191F28]">파트너센터</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/partner/notices"
                aria-label="알림"
                className="w-9 h-9 rounded-[12px] bg-[rgba(7,25,76,0.05)] flex items-center justify-center"
              >
                <Bell size={18} className="text-[rgba(3,18,40,0.7)]" />
              </Link>
              <Link
                href="/partner/account"
                aria-label="계정 설정"
                className="w-9 h-9 rounded-[12px] bg-[#3182F6] text-white flex items-center justify-center text-[12px] font-bold btn-press"
              >
                H
              </Link>
            </div>
          </header>
          <div key={pathname} className="partner-page min-h-[calc(100dvh-56px)] px-5 pb-[92px]">
            {children}
          </div>
          <nav className="fixed bottom-0 left-1/2 z-40 grid h-[72px] w-full max-w-[430px] -translate-x-1/2 grid-cols-5 border-t border-[rgba(0,27,55,0.08)] bg-white/90 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-xl">
            {BOTTOM_NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  className="flex flex-col items-center justify-center gap-0.5 rounded-[14px]"
                  style={{
                    color: active ? '#3182F6' : 'rgba(0,19,43,0.58)',
                    backgroundColor: active ? '#E8F3FF' : 'transparent',
                  }}
                >
                  <item.Icon size={20} strokeWidth={active ? 2.4 : 2} />
                  <span className="text-[10px] font-bold leading-[14px]">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </main>
    </div>
  );
}
