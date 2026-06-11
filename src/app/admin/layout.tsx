'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  CalendarDays,
  MessageSquare,
  CreditCard,
  Bell,
  Settings,
  Ticket,
  LogOut,
  ChevronLeft,
  ChevronDown,
  Menu,
  LayoutGrid,
  Images,
  Megaphone,
  Star,
  Flag,
  FileText,
} from 'lucide-react';
import { useState } from 'react';

type Item = { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> };
type Group = { name?: string; items: Item[] };

const sidebarGroups: Group[] = [
  {
    items: [{ href: '/admin', label: '대시보드', icon: LayoutDashboard }],
  },
  {
    name: '운영',
    items: [
      { href: '/admin/users', label: '회원 관리', icon: Users },
      { href: '/admin/hospitals', label: '병원 관리', icon: Building2 },
      { href: '/admin/products', label: '상품 관리', icon: Package },
      { href: '/admin/reservations', label: '예약 관리', icon: CalendarDays },
    ],
  },
  {
    name: '콘텐츠',
    items: [
      { href: '/admin/banners', label: '홈 배너', icon: Images },
      { href: '/admin/search-promo', label: '검색 추천 상품', icon: Megaphone },
      { href: '/admin/categories', label: '카테고리', icon: LayoutGrid },
      { href: '/admin/community', label: '커뮤니티', icon: MessageSquare },
      { href: '/admin/community/reports', label: '신고 관리', icon: Flag },
      { href: '/admin/reviews', label: '리뷰 관리', icon: Star },
    ],
  },
  {
    name: '정산',
    items: [
      { href: '/admin/payments', label: '매출/결제', icon: CreditCard },
      { href: '/admin/coupons', label: '쿠폰/포인트', icon: Ticket },
    ],
  },
  {
    name: '시스템',
    items: [
      { href: '/admin/notifications', label: '알림/공지', icon: Bell },
      { href: '/admin/terms', label: '약관 관리', icon: FileText },
      { href: '/admin/settings', label: '설정', icon: Settings },
    ],
  },
];

const allItems: Item[] = sidebarGroups.flatMap((g) => g.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useSession();
  const showConfirm = useStore((s) => s.showConfirm);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    showConfirm(
      '로그아웃',
      '관리자 계정에서 로그아웃하시겠습니까?',
      async () => {
        await signOut();
        router.replace('/login');
      },
      { confirmText: '로그아웃', cancelText: '취소' }
    );
  };

  const activeLabel =
    allItems.find(
      (item) => pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
    )?.label ?? '대시보드';

  return (
    <div className="!max-w-none !shadow-none flex min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full z-50 transition-all duration-300 flex flex-col ${
          collapsed ? 'w-16' : 'w-[240px]'
        }`}
        style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #E5E8EB' }}
      >
        {/* Workspace */}
        <div className="flex items-center justify-between h-16 px-4" style={{ borderBottom: '1px solid #F2F4F6' }}>
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: '#4E5968' }}
              >
                <Menu size={18} />
              </button>
              <button className="flex items-center gap-1 px-2 py-1 -ml-1 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[15px] font-bold tracking-tight" style={{ color: '#191F28' }}>키닥터</span>
                <ChevronDown size={14} style={{ color: '#8B95A1' }} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCollapsed(false)}
              className="mx-auto p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: '#4E5968' }}
            >
              <ChevronLeft size={18} className="rotate-180" />
            </button>
          )}
        </div>

        {/* Nav with grouping */}
        <nav className="flex-1 py-2 overflow-y-auto hide-scrollbar">
          {sidebarGroups.map((group, gi) => (
            <div key={gi}>
              {!collapsed && group.name && (
                <div className="admin-sidebar-group">{group.name}</div>
              )}
              {collapsed && gi > 0 && <div style={{ height: 12 }} />}
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-lg transition-colors duration-150"
                    style={
                      isActive
                        ? { backgroundColor: '#E5F1FF', color: '#3182F6' }
                        : { color: '#4E5968' }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                        e.currentTarget.style.color = '#191F28';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#4E5968';
                      }
                    }}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {!collapsed && (
                      <span className="text-[14px]" style={{ fontWeight: isActive ? 700 : 500 }}>
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3" style={{ borderTop: '1px solid #F2F4F6' }}>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors hover:bg-gray-50"
            style={{ color: '#4E5968' }}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-[14px] font-medium">로그아웃</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-[240px]'}`}>
        {/* Top Header */}
        <header
          className="sticky top-0 z-40 h-16 flex items-center justify-between px-8"
          style={{ backgroundColor: 'rgba(249, 250, 251, 0.86)', backdropFilter: 'saturate(180%) blur(12px)', WebkitBackdropFilter: 'saturate(180%) blur(12px)', borderBottom: '1px solid #E5E8EB' }}
        >
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: '#191F28' }}>
            {activeLabel}
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/notifications"
              className="relative p-2 rounded-lg transition-colors hover:bg-white"
              title="공지/알림 관리"
            >
              <Bell size={18} style={{ color: '#4E5968' }} />
            </Link>
            <div className="flex items-center gap-2.5 pl-3 ml-1" style={{ borderLeft: '1px solid #E5E8EB' }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-bold"
                style={{ background: 'linear-gradient(135deg, #3182F6, #90C2FF)' }}
              >
                A
              </div>
              {!collapsed && <span className="text-[14px] font-semibold" style={{ color: '#191F28' }}>관리자</span>}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="px-8 py-7 admin-fade" key={pathname}>{children}</div>
      </main>
    </div>
  );
}
