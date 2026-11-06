'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import { fetchMyHospitalData, useMyHospitalData } from '@/lib/partner/my-hospital-cache';
import Avatar from './Avatar';
import { HeaderBellIcon } from '@/components/icons/HeaderIcons';
import { isDualModeUser, writeAccountMode } from '@/lib/account-mode';
import { useHospitalApplication } from '@/lib/hospital-application';
import MyPageDetail from './MyPageDetail';
import styles from './app-ui.module.css';

type Row = { label: string; icon: string; href?: string; description?: string; badge?: number; tag?: string; action?: () => void };
type HospitalData = { id: string; name: string; status?: string };

/** 화면 전환 막 — 흰 바탕 + 가운데 글씨가 떠올랐다가, 돌려준 함수를 부르면 흐려지며 걷힌다 */
function showSwitchVeil(text: string) {
  const veil = document.createElement('div');
  veil.className = 'md-switch-veil';
  veil.setAttribute('role', 'status');
  const label = document.createElement('p');
  label.textContent = text;
  veil.appendChild(label);
  document.body.appendChild(veil);
  return () => {
    veil.classList.add('is-out');
    setTimeout(() => veil.remove(), 360);
  };
}

export default function MyHome({ partner = false }: { partner?: boolean }) {
  const router = useRouter();
  const { authUser, signOut } = useSession();
  const user = useStore(s => s.user);
  const hydrated = useStore(s => s.meHydrated);
  const notifications = useStore(s => s.notifications);
  const reservations = useStore(s => s.reservations);
  const showModal = useStore(s => s.showModal);
  const showToast = useStore(s => s.showToast);
  const { data: hospitalData } = useMyHospitalData<HospitalData>(partner ? authUser?.id : undefined);
  const application = useHospitalApplication(partner ? undefined : authUser?.id);
  const [detail, setDetail] = useState<string | null>(null);
  const unread = hydrated && user ? notifications.filter(n => !n.isRead).length : 0;
  const coupons = user?.coupons?.filter(c => c.status === 'available').length ?? 0;
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-my-page', '');
    return () => root.removeAttribute('data-my-page');
  }, []);
  useEffect(() => {
    if (!detail) return;
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) setDetail(null); };
    const resize = () => { if (window.innerWidth < 1024) { setDetail(null); router.push(detail); } };
    window.addEventListener('keydown', escape); window.addEventListener('resize', resize);
    return () => { window.removeEventListener('keydown', escape); window.removeEventListener('resize', resize); };
  }, [detail, router]);

  function open(event: MouseEvent<HTMLAnchorElement>, href: string, publicPage = false) {
    if (!user && !publicPage) { event.preventDefault(); window.dispatchEvent(new CustomEvent('dental:login')); return; }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    if (window.innerWidth >= 1024 && (href.startsWith('/mypage/') || href === '/terms')) { event.preventDefault(); setDetail(href); }
  }
  function logout() {
    showModal('로그아웃', '로그아웃하시겠습니까?', async () => {
      setDetail(null);
      try {
        // 병원 화면에서 로그아웃해도 병원 로그인이 아니라 홈으로(partner layout 이 로그인으로 보내지 않게 표시)
        (window as Window & { __mdLoggingOut?: boolean }).__mdLoggingOut = true;
        router.replace('/');
        await signOut();
      }
      catch { showToast('로그아웃하지 못했습니다. 다시 시도해주세요.'); }
    });
  }

  const quick: Row[] = partner ? [
    { label: '병원 정보', icon: 'profile', href: '/partner/hospital-info' },
    { label: '예약관리', icon: 'reservations', href: '/partner/reservations' },
    { label: '리뷰관리', icon: 'my-review', href: '/partner/reviews' },
    { label: '문의하기', icon: 'customer-service', href: '/partner/contact' },
  ] : [
    { label: '예약내역', icon: 'reservations', href: '/reservations', badge: hydrated && user ? reservations.length : 0 },
    { label: '결제내역', icon: 'payments', href: '/mypage/payments' },
    { label: '쿠폰함', icon: 'coupons', href: '/mypage/coupons', badge: user ? coupons : 0 },
    { label: '내 포인트', icon: 'points', href: '/mypage/points' },
    { label: '쪽지함', icon: 'messages', href: '/notifications', badge: unread },
  ];
  // 의사 ↔ 고객 화면 오가기 — 정해 둔 계정만(lib/account-mode). 병원 주인이어야 의사 화면으로 갈 수 있다
  const dual = isDualModeUser(user?.id);
  //  · 바꾸는 동안 흰 막(문서에 직접 붙인 것 — 화면이 바뀌며 이 컴포넌트가 사라져도 남는다)이 잠깐 덮는다.
  //  · 의사 화면 자료(병원·예약)와 화면 코드는 마이를 열 때 미리 받아 둔다 → 누르면 기다리지 않고 바로 넘어간다
  //    (예전엔 누른 뒤 자료를 다 받을 때까지 최대 1.8초 기다려 '느리다'였다)
  useEffect(() => {
    if (!dual || partner || !authUser?.id) return;
    router.prefetch('/partner');
    void fetchMyHospitalData(authUser.id).catch(() => null);
  }, [dual, partner, authUser?.id, router]);
  const switchMode = () => {
    const next = partner ? 'customer' : 'doctor';
    const veil = showSwitchVeil(next === 'doctor' ? '의사 화면으로 바꾸고 있어요' : '고객 화면으로 바꾸고 있어요');
    if (next === 'doctor' && authUser?.id) void fetchMyHospitalData(authUser.id).catch(() => null);
    writeAccountMode(next);
    useStore.setState({ isDoctor: next === 'doctor' });
    router.replace(next === 'doctor' ? '/partner' : '/');
    window.scrollTo(0, 0);
    setTimeout(veil, 380);
  };

  // 병원 신청 — 심사 중이면 들어가지 못하게 '신청중' 태그만, 승인되면 줄을 숨긴다
  function hospitalApplyRows(): Row[] {
    if (partner) return hospitalData && !hospitalData.hospital ? [{ label: '병원 신청', icon: 'profile', href: '/hospital/register', description: '병원 파트너로 활동하기' }] : [];
    if (application?.status === 'approved') return [];
    if (application?.status === 'pending') {
      return [{
        label: '병원 신청',
        icon: 'profile',
        tag: '신청중',
        description: application.hospitalName || undefined,
        action: () => showToast(application.kind === 'doctor' ? '원장 등록 요청을 병원에서 확인하고 있어요.' : '병원 신청을 심사하고 있어요. 승인되면 알려드릴게요.'),
      }];
    }
    return [{ label: '병원 신청', icon: 'profile', href: '/hospital/register', description: application?.status === 'rejected' ? '반려됨 · 다시 신청하기' : '병원 파트너로 활동하기' }];
  }

  const sections: { title: string; rows: Row[]; public?: boolean }[] = [
    ...(dual ? [{ title: '화면 전환', rows: [
      partner
        ? { label: '고객 화면으로', icon: 'profile', description: '마이닥 고객으로 둘러보기', action: switchMode }
        : { label: '의사 화면으로', icon: 'profile', description: '서울대내과 관리', action: switchMode },
    ] }] : []),
    { title: partner ? '병원 관리' : '나의 활동', rows: partner ? [
      { label: '병원 정보', icon: 'profile', href: '/partner/hospital-info', description: hospitalData?.hospital?.name },
      { label: '예약관리', icon: 'reservations', href: '/partner/reservations' },
      { label: '리뷰관리', icon: 'my-review', href: '/partner/reviews' },
    ] : [
      { label: '예약내역', icon: 'reservations', href: '/reservations', description: '내가 예약한 시술' },
      { label: '결제·환불 내역', icon: 'payments', href: '/mypage/payments', description: '결제 · 환불 기록' },
      { label: '포켓', icon: 'pocket', href: '/wishlist', description: '담아 둔 시술' },
      { label: '내 리뷰', icon: 'my-review', href: '/mypage/reviews', description: '내가 남긴 후기' },
      { label: '내가 쓴 글', icon: 'messages', href: '/mypage/posts', description: '내가 남긴 커뮤니티 글' },
    ] },
    { title: '설정', rows: [
      { label: '프로필 설정', icon: 'profile', href: '/mypage/profile', description: '사진 · 이름 · 연락처' },
      { label: '알림 설정', icon: 'notifications', href: '/mypage/notifications', description: '소식 받기' },
      { label: '쪽지함', icon: 'messages', href: '/notifications', badge: unread },
    ] },
    { title: '고객지원', public: true, rows: [
      { label: '고객센터', icon: 'customer-service', href: partner ? '/partner/contact' : '/mypage/support', description: '문의하기' },
      { label: '자주 묻는 질문', icon: 'faq', href: '/mypage/faq' },
      { label: '공지사항', icon: 'announcements', href: '/mypage/announcements', description: '새 소식 · 업데이트' },
    ] },
    { title: '기타', public: true, rows: [
      { label: '약관 및 정책', icon: 'terms', href: '/terms', description: '이용약관 · 개인정보' },
      ...hospitalApplyRows(),
    ] },
  ];

  const rowContent = (row: Row) => <>
    <span className={styles.myRowIcon}>{row.label === '프로필 설정' && user ? <Avatar src={user.profileImage} seed={user.id} role={partner ? 'doctor' : 'user'} size={36} /> : <img src={`/icons/mypage/${row.icon}.svg`} alt="" />}</span>
    <span className={styles.myRowLabel}>{row.label}</span>
    {Boolean(row.badge) && <span className={styles.myRowBadge}>{row.badge}</span>}
    {row.tag && <span className={styles.myRowBadge}>{row.tag}</span>}
    {row.description && <span className={styles.myRowDesc}>{row.description}</span>}
  </>;
  return <div className={styles.myPage}>
    {/* 탭 머리 — 프리티풀 탭 머리 표준(왼쪽 16 · 20 굵게 · 오른쪽 종). 회색 바탕 위 흰 줄, PC 는 전체 헤더가 대신 */}
    <div className={styles.myTopbar}>
      <h1>마이</h1>
      <button type="button" aria-label={unread ? '알림 (안 읽은 알림 있음)' : '알림'} onClick={() => window.dispatchEvent(new CustomEvent('dental:notifications'))}>
        <HeaderBellIcon dot={Boolean(unread)} />
      </button>
    </div>
    <div className={styles.myLayout} data-panel={Boolean(detail)}><div className={styles.myInner}>
    {user ? <header className={styles.myProfile}><div><h1>{user.name}</h1><p>{[authUser?.email, partner ? '병원 파트너' : '마이닥 회원'].filter(Boolean).join(' · ')}</p></div><nav className={styles.myProfileActions}><Link href="/mypage/profile" onClick={event => open(event, '/mypage/profile')}>설정</Link><span>|</span><button type="button" onClick={logout}>로그아웃</button></nav></header> : <div className={styles.myLogin}><h1>로그인이 필요해요</h1><button type="button" className={styles.primaryButton} onClick={() => window.dispatchEvent(new CustomEvent('dental:login'))}>로그인 / 회원가입</button></div>}
    <div className={styles.quickGrid} style={partner ? undefined : { gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>{quick.map((item, index) => <Link key={item.label} href={item.href!} className={styles.quickItem} onClick={event => open(event, item.href!)} style={{ animationDelay: `${.15 + index * .04}s` }}><span><img src={`/icons/mypage/${item.icon}.svg`} alt="" />{Boolean(item.badge) && <small>{item.badge}</small>}</span><span>{item.label}</span></Link>)}</div>
    <div className={styles.mySections}>{sections.map((section, i) => <section key={section.title} className={styles.mySection} style={{ animationDelay: `${.2 + i * .06}s` }}><h2>{section.title}</h2><div className={styles.myRows}>{section.rows.map(row => row.href ? <Link key={row.label} href={row.href} className={styles.myRow} onClick={event => open(event, row.href!, section.public)}>{rowContent(row)}</Link> : <button key={row.label} type="button" className={styles.myRow} onClick={row.action}>{rowContent(row)}</button>)}</div></section>)}</div>
  </div>{detail && <aside className={styles.myDetailPanel} aria-label="마이페이지 상세"><button type="button" className={styles.iconButton} aria-label="상세 닫기" title="상세 닫기" onClick={() => setDetail(null)}><X size={19} /></button><MyPageDetail href={detail} onClose={() => setDetail(null)} /></aside>}</div></div>;
}
