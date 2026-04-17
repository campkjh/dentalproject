'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, User, Heart, ChevronDown } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useState } from 'react';

const navItems = [
  { href: '/', label: '홈' },
  { href: '/search', label: '시술 찾기' },
  { href: '/community', label: '커뮤니티' },
];

export default function DesktopHeader() {
  const pathname = usePathname();
  const { isLoggedIn, user, wishlist, categories } = useStore();
  const { signOut } = useSession();
  const logout = () => signOut();
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Hide on admin pages
  if (pathname.startsWith('/admin') || pathname.startsWith('/partner')) return null;

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9998 }} className="hidden lg:block bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16 px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center">
              <span className="text-lg">🦷</span>
            </div>
            <span className="text-xl font-bold text-[#7C3AED]">키닥터</span>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="시술, 병원, 지역을 검색해보세요"
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:bg-white border border-gray-200"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <Link href="/wishlist" className="relative p-2 hover:bg-gray-50 rounded-full transition-colors">
                  <Heart size={20} className="text-gray-600" />
                  {wishlist.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                      {wishlist.length}
                    </span>
                  )}
                </Link>
                <Link href="/notifications" className="relative p-2 hover:bg-gray-50 rounded-full transition-colors">
                  <Bell size={20} className="text-gray-600" />
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    3
                  </span>
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-full transition-colors"
                  >
                    <div className="w-8 h-8 bg-[#7C3AED] rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {user?.name?.charAt(0) ?? 'U'}
                    </div>
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 scale-in">
                      <div className="px-4 py-2 border-b border-gray-50">
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-xs text-gray-400">{user?.points?.toLocaleString()}P</p>
                      </div>
                      <Link href="/mypage" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setShowUserMenu(false)}>마이페이지</Link>
                      <Link href="/reservations" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setShowUserMenu(false)}>예약내역</Link>
                      <Link href="/mypage/coupons" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setShowUserMenu(false)}>쿠폰함</Link>
                      <Link href="/mypage/points" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setShowUserMenu(false)}>내 포인트</Link>
                      <button
                        onClick={() => { logout(); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50"
                      >
                        로그아웃
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  로그인
                </Link>
                <Link href="/login?mode=signup" className="px-5 py-2 bg-[#7C3AED] text-white text-sm font-medium rounded-full hover:bg-[#6D28D9] transition-colors">
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 px-6 h-12 border-t border-gray-50">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                pathname === item.href
                  ? 'text-[#7C3AED] bg-[#EDE9FE]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              카테고리 <ChevronDown size={14} />
            </button>
            {showCategoryDropdown && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 scale-in">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/search?category=${cat.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowCategoryDropdown(false)}
                  >
                    <img src={cat.icon} alt={cat.name} className="w-6 h-6" />
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          <Link href="/hospital/register" className="text-sm text-gray-400 hover:text-[#7C3AED] transition-colors">
            병원 입점 신청
          </Link>
        </nav>
      </div>
    </header>
  );
}
