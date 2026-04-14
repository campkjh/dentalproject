'use client';

import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import LoginRequired from '@/components/common/LoginRequired';
import { ChevronRight, Camera, User } from 'lucide-react';
import { IconHospital } from '@/components/icons/MyPageIcons';

function MenuIcon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <img
      src={`/icons/mypage/${name}.svg`}
      alt=""
      width={size}
      height={size}
      style={{ display: 'inline-block' }}
    />
  );
}

interface MenuItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  badge?: number;
  onClick?: () => void;
}

export default function MyPage() {
  const router = useRouter();
  const { isLoggedIn, user, logout, showModal, hideModal } = useStore();

  const handleLogout = () => {
    showModal('로그아웃', '정말 로그아웃 하시겠습니까?', () => {
      logout();
      hideModal();
      router.push('/');
    });
  };

  const handleCustomerCenter = () => {
    showModal(
      '고객센터 연결',
      '평일 09:00 ~ 18:00\n1588-0000 으로 연결됩니다.',
      () => {
        window.location.href = 'tel:1588-0000';
        hideModal();
      }
    );
  };

  const myMenuItems: MenuItem[] = [
    { label: '프로필 설정', href: '/mypage/profile', icon: <MenuIcon name="profile" /> },
    { label: '예약내역', href: '/reservations', icon: <MenuIcon name="reservations" /> },
    { label: '쪽지함', href: '/notifications', icon: <MenuIcon name="messages" />, badge: 12 },
    { label: '쿠폰함', href: '/mypage/coupons', icon: <MenuIcon name="coupons" /> },
    { label: '내 포인트', href: '/mypage/points', icon: <MenuIcon name="points" /> },
    { label: '알림 설정', href: '/mypage/notifications', icon: <MenuIcon name="notifications" /> },
    { label: '로그아웃', icon: <MenuIcon name="logout" />, onClick: handleLogout },
  ];

  const customerMenuItems: MenuItem[] = [
    { label: '결제내역', href: '/mypage/payments', icon: <MenuIcon name="payments" /> },
    { label: '찜목록', href: '/wishlist', icon: <MenuIcon name="wishlist" /> },
    { label: '내리뷰', href: '/mypage/reviews', icon: <MenuIcon name="my-review" /> },
  ];

  const supportMenuItems: MenuItem[] = [
    { label: '자주하는 질문', href: '/mypage/faq', icon: <MenuIcon name="faq" /> },
    { label: '약관 및 정책', href: '/terms', icon: <MenuIcon name="terms" /> },
    { label: '고객센터', icon: <MenuIcon name="customer-service" />, onClick: handleCustomerCenter },
    { label: '공지사항', href: '/mypage/announcements', icon: <MenuIcon name="announcements" /> },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <button
      key={item.label}
      onClick={() => {
        if (item.onClick) {
          item.onClick();
        } else if (item.href) {
          router.push(item.href);
        }
      }}
      className="flex items-center justify-between w-full px-2.5 py-3.5 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex items-center justify-center w-9 h-9 bg-gray-100 flex-shrink-0"
          style={{ borderRadius: 16 }}
        >
          {item.icon}
        </span>
        <span className="text-sm font-medium">{item.label}</span>
      </div>
      <div className="flex items-center gap-2">
        {item.badge && (
          <span className="bg-[#7C3AED] text-white text-[11px] rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
            {item.badge}
          </span>
        )}
        <ChevronRight size={16} className="text-gray-300" />
      </div>
    </button>
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white max-w-[480px] mx-auto">
        <div className="px-2.5 pt-12">
          <h1 className="text-xl font-bold mb-6">마이페이지</h1>
        </div>
        <LoginRequired />
        <div className="pb-24" />
      </div>
    );
  }

  const availableCoupons = user?.coupons?.filter(c => c.status === 'available').length ?? 0;

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto pb-[86px] lg:pb-0 lg:max-w-4xl lg:py-8 page-enter">
      {/* Header */}
      <div className="bg-white px-2.5 pt-12 pb-6 fade-in-up">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
              <User size={28} className="text-[#7C3AED]" />
            </div>
            <button className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm">
              <Camera size={12} className="text-gray-500" />
            </button>
          </div>
          <div>
            <h2 className="text-lg font-bold">{user?.name ?? '사용자'}</h2>
            <p className="text-sm text-gray-500">내정보</p>
          </div>
        </div>
      </div>

      {/* Points & Coupons Summary */}
      <div className="bg-white mt-2 mx-4 rounded-xl border border-gray-100 overflow-hidden lg:bg-white lg:rounded-2xl lg:shadow-sm lg:p-6 lg:mb-4">
        <div className="flex divide-x divide-gray-100 lg:grid lg:grid-cols-2 lg:gap-4 lg:divide-x-0">
          <button
            onClick={() => router.push('/mypage/points')}
            className="flex-1 py-4 text-center hover:bg-gray-50 transition-colors"
          >
            <p className="text-xs text-gray-500 mb-1">내 포인트</p>
            <p className="text-sm font-bold text-[#7C3AED]">{(user?.points ?? 0).toLocaleString()}P</p>
          </button>
          <button
            onClick={() => router.push('/mypage/coupons')}
            className="flex-1 py-4 text-center hover:bg-gray-50 transition-colors"
          >
            <p className="text-xs text-gray-500 mb-1">내 쿠폰</p>
            <p className="text-sm font-bold text-[#7C3AED]">{availableCoupons}개</p>
          </button>
        </div>
      </div>

      {/* My Menu */}
      <div className="bg-white mt-2 lg:bg-white lg:rounded-2xl lg:shadow-sm lg:p-6 lg:mb-4 stagger-children">
        {myMenuItems.map(renderMenuItem)}
      </div>

      {/* Separator */}
      <div className="h-px bg-gray-100 mx-2.5 my-2" />

      {/* Customer History */}
      <div className="bg-white lg:bg-white lg:rounded-2xl lg:shadow-sm lg:p-6 lg:mb-4 stagger-children">
        <div className="px-2.5 pt-4 pb-2">
          <h3 className="text-sm font-bold text-gray-900">고객내역</h3>
        </div>
        {customerMenuItems.map(renderMenuItem)}
      </div>

      {/* Separator */}
      <div className="h-px bg-gray-100 mx-2.5 my-2" />

      {/* Customer Support */}
      <div className="bg-white lg:bg-white lg:rounded-2xl lg:shadow-sm lg:p-6 lg:mb-4 stagger-children">
        <div className="px-2.5 pt-4 pb-2">
          <h3 className="text-sm font-bold text-gray-900">고객센터</h3>
        </div>
        {supportMenuItems.map(renderMenuItem)}
      </div>

      {/* Hospital Registration */}
      <div className="px-2.5 py-6">
        <button
          onClick={() => router.push('/hospital/register')}
          className="w-full py-3.5 bg-[#7C3AED] text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#6D28D9] transition-colors"
        >
          <IconHospital size={22} />
          병원신청하기
        </button>
      </div>

      <div className="pb-24" />
    </div>
  );
}
