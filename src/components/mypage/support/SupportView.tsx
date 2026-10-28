'use client';

// 고객센터 — 프리티풀 고객센터·문의 화면 결(퀵매칭 어법).
//  · 머리 = 공통 TopBar(56 머리 줄 + 24 큰 제목), 본문 = QdBody(직계 칸 오른쪽→왼쪽 순차 슬라이드).
//  · 연락 수단은 실제로 있는 것만 — 번호·이메일은 lib/site-config(NEXT_PUBLIC_COMPANY_PHONE / EMAIL)에서 읽는다.
//    카카오 채널은 코드·설정에 주소가 없어 넣지 않았다(생기면 QdRow 한 줄 추가).
import TopBar from '@/components/common/TopBar';
import { MySectionTitle, QdBody, QdList, QdRow } from '@/components/detail/QdKit';
import { siteConfig } from '@/lib/site-config';

/** 운영 시간 — 마이 고객센터 확인창·푸터에 적혀 있던 시간 그대로 */
const HOURS: { label: string; value: string; off?: boolean }[] = [
  { label: '평일', value: '09:00 ~ 18:00' },
  { label: '점심시간', value: '12:00 ~ 13:00' },
  { label: '주말·공휴일', value: '쉬어요', off: true },
];

function TossIcon({ name }: { name: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/icons/toss/${name}.svg`} alt="" className="h-6 w-6" />;
}

/** 토스 mono 결 편지 봉투(토스 아이콘 묶음에 메일이 없어 같은 선 굵기·색으로 그림) */
function MailIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="2.6" stroke="#828E9B" strokeWidth="2" />
      <path d="M4 7.5l8 5.6 8-5.6" stroke="#828E9B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SupportView() {
  const phone = siteConfig.phone.trim();
  const email = siteConfig.email.trim();
  const tel = phone.replace(/[^0-9+]/g, '');

  return (
    <div className="mx-auto min-h-screen max-w-[500px] bg-white pb-16">
      <TopBar title="고객센터" sub="궁금한 점이 있으면 편하게 물어보세요" />

      <QdBody className="flex flex-col gap-7 px-5">
        {/* 운영 시간 카드 */}
        <section className="qd-card px-[18px] py-4">
          <div className="flex items-center gap-2.5">
            <TossIcon name="clock" />
            <p className="text-[17px] font-semibold text-[#191F28]">운영 시간</p>
          </div>
          <dl className="mt-3.5 flex flex-col gap-2.5">
            {HOURS.map((h) => (
              <div key={h.label} className="flex items-center justify-between text-[15px]">
                <dt className="text-[#6B7684]">{h.label}</dt>
                <dd className={`tabular-nums ${h.off ? 'text-[#8B95A1]' : 'font-semibold text-[#333D4B]'}`}>{h.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3.5 rounded-[12px] bg-[#F2F4F6] px-3.5 py-2.5 text-[13px] leading-[1.5] text-[#6B7684]">
            운영 시간이 끝난 뒤 남긴 문의는 다음 영업일에 차례로 답해 드려요.
          </p>
        </section>

        {(tel || email) && (
          <section>
            <MySectionTitle>문의하기</MySectionTitle>
            <QdList>
              {tel && (
                <QdRow
                  icon={<TossIcon name="headphone" />}
                  title="전화 상담"
                  hint={phone}
                  href={`tel:${tel}`}
                />
              )}
              {email && (
                <QdRow
                  icon={<MailIcon />}
                  title="이메일 문의"
                  hint={email}
                  href={`mailto:${email}`}
                />
              )}
            </QdList>
          </section>
        )}

        <section>
          <MySectionTitle>먼저 찾아보세요</MySectionTitle>
          <QdList>
            <QdRow icon={<TossIcon name="question" />} title="자주 묻는 질문" hint="예약·결제·취소 안내" href="/mypage/faq" />
            <QdRow icon={<TossIcon name="loudspeaker" />} title="공지사항" hint="서비스 소식과 안내" href="/mypage/announcements" />
          </QdList>
        </section>
      </QdBody>
    </div>
  );
}
