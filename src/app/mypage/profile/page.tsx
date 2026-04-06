'use client';

import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import TopBar from '@/components/common/TopBar';
import LoginRequired from '@/components/common/LoginRequired';
import { User, Camera, ChevronRight } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { isLoggedIn, user, showModal, hideModal, logout } = useStore();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white max-w-[430px] mx-auto">
        <TopBar title="프로필설정" />
        <LoginRequired />
      </div>
    );
  }

  const handleWithdraw = () => {
    showModal('회원탈퇴', '정말 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.', () => {
      logout();
      hideModal();
      router.push('/');
    });
  };

  const infoItems = [
    { label: '이름', value: user?.name ?? '-' },
    { label: '로그인 유형', value: user?.loginType === 'kakao' ? '카카오' : '애플' },
    { label: '전화번호', value: user?.phone ?? '-' },
    { label: '성별', value: user?.gender ?? '-' },
    { label: '출생년도', value: user?.birthYear ?? '-' },
    { label: '국가', value: user?.country ?? '대한민국' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 max-w-[430px] mx-auto">
      <TopBar title="프로필설정" />

      {/* Profile Avatar */}
      <div className="bg-white py-8 flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
            <User size={40} className="text-[#7C3AED]" />
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#7C3AED] rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            <Camera size={14} className="text-white" />
          </button>
        </div>
        <h2 className="text-lg font-bold">{user?.name}</h2>
      </div>

      {/* Customer Info */}
      <div className="mt-2 bg-white">
        <div className="px-2.5 pt-4 pb-2">
          <h3 className="text-sm font-bold text-gray-900">고객정보</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {infoItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between px-2.5 py-3.5">
              <span className="text-sm text-gray-500">{item.label}</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Withdraw Button */}
      <div className="px-2.5 py-8">
        <button
          onClick={handleWithdraw}
          className="w-full py-3 text-sm text-gray-400 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          회원탈퇴
        </button>
      </div>
    </div>
  );
}
