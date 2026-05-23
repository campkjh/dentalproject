'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Camera, ChevronRight, LogOut } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import { useMyHospitalData } from '@/lib/partner/my-hospital-cache';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';

/* eslint-disable @typescript-eslint/no-explicit-any */

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

type MenuItem = {
  label: string;
  href?: string;
  icon: React.ReactNode;
  description?: string;
  onClick?: () => void;
};

export default function PartnerAccountPage() {
  const router = useRouter();
  const { authUser, signOut } = useSession();
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);
  const showToast = useStore((s) => s.showToast);
  const showModal = useStore((s) => s.showModal);
  const hideModal = useStore((s) => s.hideModal);
  const { data: hospitalData } = useMyHospitalData<any>(authUser?.id);
  const hospital = hospitalData?.hospital ?? null;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setPhone(user.phone ?? '');
    }
  }, [user]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      updateUser({ name, phone });
      showToast('계정 정보가 저장되었습니다.');
      setProfileOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    showModal('로그아웃', '정말 로그아웃 하시겠습니까?', async () => {
      await signOut();
      hideModal();
      window.location.replace('/');
    });
  };

  const profileItems: MenuItem[] = [
    {
      label: '프로필 설정',
      icon: <MenuIcon name="profile" />,
      description: authUser?.email ?? '-',
      onClick: () => setProfileOpen((open) => !open),
    },
    {
      label: '알림 설정',
      href: '/mypage/notifications',
      icon: <MenuIcon name="notifications" />,
    },
  ];

  const hospitalItems: MenuItem[] = [
    {
      label: '병원 정보',
      href: '/partner/hospital-info',
      icon: <Building2 size={22} />,
      description: hospital?.name ?? '등록된 병원이 없습니다',
    },
    {
      label: '예약관리',
      href: '/partner/reservations',
      icon: <MenuIcon name="reservations" />,
    },
    {
      label: '리뷰관리',
      href: '/partner/reviews',
      icon: <MenuIcon name="my-review" />,
    },
  ];

  const supportItems: MenuItem[] = [
    { label: '자주하는 질문', href: '/mypage/faq', icon: <MenuIcon name="faq" /> },
    { label: '약관 및 정책', href: '/terms', icon: <MenuIcon name="terms" /> },
    { label: '문의하기', href: '/partner/contact', icon: <MenuIcon name="customer-service" /> },
    { label: '로그아웃', icon: <LogOut size={22} />, onClick: handleLogout },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <button
      key={item.label}
      type="button"
      onClick={() => {
        if (item.onClick) item.onClick();
        else if (item.href) router.push(item.href);
      }}
      className="partner-account-row"
    >
      <div className="partner-account-row-main">
        <span className="partner-account-row-icon">{item.icon}</span>
        <span>
          <strong>{item.label}</strong>
          {item.description ? <em>{item.description}</em> : null}
        </span>
      </div>
      <ChevronRight size={16} className="partner-account-chevron" />
    </button>
  );

  if (!authUser) {
    return (
      <div className="partner-account-screen">
        <div className="partner-account-login">
          <p>로그인이 필요합니다.</p>
          <Link href="/partner/login">로그인</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="partner-account-screen page-enter">
      <section className="partner-account-profile fade-in-up">
        <div className="partner-account-avatar">
          <Avatar
            src={user?.profileImage}
            gender={user?.gender}
            seed={authUser.id}
            role="doctor"
            size={52}
            alt={user?.name || '프로필'}
          />
          <button type="button" aria-label="프로필 사진 변경">
            <Camera size={12} />
          </button>
        </div>
        <div>
          <h1>{user?.name ?? authUser.email?.split('@')[0] ?? '파트너'}</h1>
          <p>병원 파트너</p>
        </div>
      </section>

      <section className="partner-account-summary">
        <button type="button" onClick={() => router.push('/partner/hospital-info')}>
          <span>연결 병원</span>
          <strong>{hospital?.name ?? '미등록'}</strong>
        </button>
        <button type="button" onClick={() => router.push('/partner/reservations')}>
          <span>운영 상태</span>
          <strong>{hospital?.status ?? '-'}</strong>
        </button>
      </section>

      <section className="partner-account-section stagger-children">
        {profileItems.map(renderMenuItem)}
        {profileOpen ? (
          <div className="partner-account-editor">
            <label>
              <span>이름</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <span>휴대폰</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <button type="button" onClick={save} disabled={saving}>
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        ) : null}
      </section>

      <div className="partner-account-divider" />

      <section className="partner-account-section stagger-children">
        <h2>병원내역</h2>
        {hospitalItems.map(renderMenuItem)}
      </section>

      <div className="partner-account-divider" />

      <section className="partner-account-section stagger-children">
        <h2>고객센터</h2>
        {supportItems.map(renderMenuItem)}
      </section>

      <div className="partner-account-register">
        {!hospital ? (
          <button type="button" onClick={() => router.push('/hospital/register')}>
            병원신청하기
          </button>
        ) : null}
      </div>
    </div>
  );
}
