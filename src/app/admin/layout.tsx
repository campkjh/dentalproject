'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Menu,
  LayoutGrid,
} from 'lucide-react';
import { useState } from 'react';

const sidebarItems = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/users', label: '회원 관리', icon: Users },
  { href: '/admin/hospitals', label: '병원 관리', icon: Building2 },
  { href: '/admin/products', label: '상품 관리', icon: Package },
  { href: '/admin/categories', label: '카테고리 관리', icon: LayoutGrid },
  { href: '/admin/reservations', label: '예약 관리', icon: CalendarDays },
  { href: '/admin/community', label: '커뮤니티 관리', icon: MessageSquare },
  { href: '/admin/payments', label: '매출/결제', icon: CreditCard },
  { href: '/admin/coupons', label: '쿠폰/포인트', icon: Ticket },
  { href: '/admin/notifications', label: '알림/공지', icon: Bell },
  { href: '/admin/settings', label: '설정', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="!max-w-none !shadow-none flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-[#1E1B2E] text-white z-50 transition-all duration-300 flex flex-col ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          {!collapsed && <span className="text-lg font-bold text-[#A78BFA]">키닥터 Admin</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-white/10 rounded">
            {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/10 p-4">
          <Link
            href="/"
            className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
          >
            <LogOut size={20} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm">사이트로 이동</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-gray-800">
            {sidebarItems.find(
              (item) => pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            )?.label ?? '대시보드'}
          </h1>
          <div className="flex items-center gap-4">
            <button className="relative">
              <Bell size={20} className="text-gray-500" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                5
              </span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#7C3AED] rounded-full flex items-center justify-center text-white text-sm font-bold">
                A
              </div>
              {!collapsed && <span className="text-sm text-gray-700">관리자</span>}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
