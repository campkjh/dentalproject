'use client';

// 약관 및 정책 — 프리티풀 마이 > 약관 결: 퀵매칭 선택 카드 줄(QdRow) + 아래 회색 회사 정보 상자.
import TopBar from '@/components/common/TopBar';
import { QdBody, QdList, QdRow } from '@/components/detail/QdKit';
import { Screen, TossIcon } from '@/components/mypage/screens/ScreenKit';
import { siteConfig } from '@/lib/site-config';

const termsList = [
  { id: 'privacy', title: '개인정보 수집 및 이용약관', hint: '어떤 정보를 왜 모으는지', icon: 'eye-off' },
  { id: 'service', title: '서비스 이용약관', hint: '마이닥 이용 규칙', icon: 'document' },
  { id: 'thirdparty', title: '개인정보 제 3자 제공 동의', hint: '병원에 전달되는 정보', icon: 'share' },
  { id: 'refund', title: '환불규정에 대한 약관', hint: '취소·환불 기준', icon: 'pay-card' },
  { id: 'withdrawal', title: '회원탈퇴 문의', hint: '탈퇴 절차와 처리되는 정보', icon: 'user' },
  { id: 'meta', title: 'META서비스 이용방침', hint: '페이스북·인스타그램 연동', icon: 'list' },
];

export default function TermsPage() {
  return (
    <Screen>
      <TopBar title="약관 및 정책" sub="마이닥 이용에 필요한 약관을 모아 뒀어요" />

      <QdBody className="px-6 pt-1 pc:px-8">
        <QdList>
          {termsList.map((term) => (
            <QdRow key={term.id} href={`/terms/${term.id}`} title={term.title} hint={term.hint} icon={<TossIcon name={term.icon} size={24} />} />
          ))}
        </QdList>

        {/* 회사 정보 */}
        <div className="mt-8 rounded-[16px] bg-[#F7F8FA] px-5 py-5 text-[12.5px] leading-[1.7] text-[#8B95A1]">
          <p className="break-keep">{siteConfig.copyrightName}은 {siteConfig.companyName}가 운영하는 서비스입니다.</p>
          <p className="mt-1 break-keep">{siteConfig.companyName}은(는) 통신판매중개자로서 통신판매의 당사자가 아니며 개별 판매자가 제공하는 서비스에 대한 이행, 계약사항 등과 관련한 의무와 책임은 거래 당사자에게 있습니다.</p>
          <div className="mt-3 space-y-0.5 border-t border-[#E5E8EB] pt-3">
            <p>통신판매업신고번호 : {siteConfig.mailOrderNumber}</p>
            <p>{siteConfig.companyName}{siteConfig.postalCode ? ` | 우 ${siteConfig.postalCode}` : ''}</p>
            <p>주소 {siteConfig.address}</p>
            <p>T {siteConfig.phone} | E {siteConfig.email}</p>
            <p>{siteConfig.representative} | {siteConfig.businessNumber}</p>
            <p className="pt-1 text-[#B0B8C1]">Copyright(c) {siteConfig.copyrightName}. All right reserved.</p>
          </div>
        </div>
      </QdBody>
    </Screen>
  );
}
