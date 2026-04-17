'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const footerLinks = {
  서비스: [
    { label: '시술 찾기', href: '/search' },
    { label: '커뮤니티', href: '/community' },
    { label: '병원 입점', href: '/hospital/register' },
    { label: '고객센터', href: '/mypage/faq' },
  ],
  회사: [
    { label: '서비스 이용약관', href: '/terms' },
    { label: '개인정보처리방침', href: '/terms' },
    { label: '공지사항', href: '/mypage/announcements' },
  ],
  고객지원: [
    { label: '자주하는 질문', href: '/mypage/faq' },
    { label: '1:1 문의', href: '/mypage/faq' },
    { label: '제휴 문의', href: '/mypage/faq' },
  ],
};

export default function Footer() {
  const pathname = usePathname();

  // Hide on admin and mobile-only paths
  if (pathname.startsWith('/admin') || pathname.startsWith('/partner')) return null;

  return (
    <footer className="hidden lg:block bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center">
                <span className="text-lg">🦷</span>
              </div>
              <span className="text-xl font-bold text-white">키닥터</span>
            </div>
            <p className="text-sm leading-relaxed">
              내 주변 치과, 성형외과, 피부과<br />
              시술 검색 및 예약 플랫폼
            </p>
            <div className="mt-4 space-y-1 text-xs">
              <p>고객센터 1588-1380</p>
              <p>평일 09:00 ~ 18:00 (점심 12:00 ~ 13:00)</p>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-white mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Policy Links */}
        <div className="mt-10 pt-8 border-t border-gray-800">
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
            <Link href="/terms/privacy" className="text-xs hover:text-white transition-colors underline">개인정보처리방침</Link>
            <Link href="/terms/service" className="text-xs hover:text-white transition-colors underline">서비스이용약관</Link>
            <Link href="/terms/thirdparty" className="text-xs hover:text-white transition-colors underline">제3자정보제공동의</Link>
            <Link href="/terms/refund" className="text-xs hover:text-white transition-colors underline">환불약관</Link>
            <Link href="/terms/withdrawal" className="text-xs hover:text-white transition-colors underline">회원탈퇴 문의</Link>
            <Link href="/terms/meta" className="text-xs hover:text-white transition-colors underline">META서비스 이용방침</Link>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs space-y-1">
              <p>(주)키닥터 | 대표 000 | 사업자등록번호 000-00-00000</p>
              <p>서울특별시 금천구 가산디지털1로 225, 11층 1123-에이-2호</p>
              <p>통신판매업신고 제 2025-서울송파-0000호 | T 070-000-0000 | E ceo@sample.com</p>
            </div>
            <p className="text-xs">Copyright(c) 키닥터. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
