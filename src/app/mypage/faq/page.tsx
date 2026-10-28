'use client';

// 자주 묻는 질문 — 프리티풀 마이 > FAQ 그대로: 회색 트랙 위 흰 알약이 미끄러지는 분류 칩 + 질문 카드(높이 0fr→1fr 로 펼침).
//  · '전체'는 분류별 묶음 제목과 함께 다 보여 준다. 칩 줄은 머리 아래에 붙어 따라온다.
import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import TopBar from '@/components/common/TopBar';
import { QdBody, MySectionTitle, MY_CARD } from '@/components/detail/QdKit';
import { Screen, EmptyBlock, screenCss as s } from '@/components/mypage/screens/ScreenKit';

const tabs = ['이용문의', '결제문의', '서비스문의', '기타문의'];

const faqData: Record<string, { question: string; answer: string }[]> = {
  '이용문의': [
    {
      question: '회원 가입은 어떻게 하나요?',
      answer: '카카오 또는 애플 계정으로 간편하게 로그인하실 수 있습니다. 별도의 회원가입 절차 없이 소셜 로그인으로 바로 이용 가능합니다.',
    },
    {
      question: '예약은 어떻게 하나요?',
      answer: '원하시는 상품을 선택하신 후 예약하기 버튼을 눌러주세요. 날짜와 시간을 선택하시면 예약이 완료됩니다. 예약 확인은 예약내역 페이지에서 확인하실 수 있습니다.',
    },
    {
      question: '예약 취소는 어떻게 하나요?',
      answer: '예약내역 페이지에서 취소하고자 하는 예약을 선택하신 후 예약취소 버튼을 눌러주세요. 시술 3일 전까지 무료 취소가 가능하며, 그 이후에는 취소 수수료가 발생할 수 있습니다.',
    },
    {
      question: '포켓에 담은 상품은 어디서 확인하나요?',
      answer: '하단 메뉴의 포켓 탭을 눌러 확인하실 수 있습니다. 포켓에 담은 상품은 마이페이지의 포켓에서도 확인 가능합니다.',
    },
  ],
  '결제문의': [
    {
      question: '결제 수단은 무엇이 있나요?',
      answer: '신용/체크카드, 카카오페이, 네이버페이, 토스페이 등 다양한 결제 수단을 지원하고 있습니다.',
    },
    {
      question: '환불은 어떻게 받나요?',
      answer: '예약 취소 시 결제하신 수단으로 자동 환불됩니다. 카드 결제의 경우 취소 후 3~5영업일 이내에 환불이 완료됩니다.',
    },
    {
      question: '포인트는 어떻게 사용하나요?',
      answer: '결제 시 보유 포인트를 사용하실 수 있습니다. 1포인트 = 1원으로 사용 가능하며, 최소 사용 금액은 1,000P입니다.',
    },
  ],
  '서비스문의': [
    {
      question: '병원 정보는 정확한가요?',
      answer: '모든 병원 정보는 정기적으로 업데이트되고 있으며, 병원 측에서 직접 관리하고 있습니다. 정보가 다른 경우 고객센터로 문의해 주세요.',
    },
    {
      question: '리뷰는 신뢰할 수 있나요?',
      answer: '모든 리뷰는 실제 시술을 받은 고객만 작성할 수 있으며, 부적절한 리뷰는 관리팀에서 검토 후 삭제됩니다.',
    },
  ],
  '기타문의': [
    {
      question: '앱 알림은 어떻게 설정하나요?',
      answer: '휴대폰 설정 > 알림 > 마이닥에서 알림을 설정하실 수 있습니다. 예약 알림, 이벤트 알림 등을 개별적으로 관리할 수 있습니다.',
    },
    {
      question: '개인정보는 안전하게 관리되나요?',
      answer: '고객님의 개인정보는 암호화되어 안전하게 보관됩니다. 자세한 내용은 개인정보처리방침을 확인해 주세요.',
    },
  ],
};

const CHIPS = ['전체', ...tabs];

export default function FAQPage() {
  const [activeTab, setActiveTab] = useState('전체');
  const [openId, setOpenId] = useState<string | null>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const activeIdx = CHIPS.indexOf(activeTab);

  // 흰 알약 자리 = 고른 칩 자리
  useLayoutEffect(() => {
    const measure = () => {
      const btn = chipRefs.current[activeIdx];
      if (btn) setPill({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeIdx]);

  useEffect(() => {
    chipRefs.current[activeIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeIdx]);

  const changeTab = (t: string) => {
    setActiveTab(t);
    setOpenId(null);
  };

  const groups = (activeTab === '전체' ? tabs : [activeTab])
    .map((category) => ({ category, items: faqData[category] ?? [] }))
    .filter((g) => g.items.length > 0);

  return (
    <Screen>
      <TopBar title="자주 묻는 질문" sub="궁금한 내용을 먼저 찾아보세요" />

      {/* 분류 칩 — 머리(56) 아래에 붙어 따라온다 */}
      <div className="sticky top-14 z-20 bg-white px-6 pb-3 pt-1 pc:px-8">
        <div className="relative flex gap-1 overflow-x-auto rounded-[16px] bg-[#F2F4F6] p-1 hide-scrollbar">
          <span
            aria-hidden="true"
            className={`${s.chipPill} pointer-events-none absolute bottom-1 left-0 top-1 rounded-[13px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]`}
            style={{ width: pill.width, transform: `translateX(${pill.left}px)`, opacity: pill.width ? 1 : 0 }}
          />
          {CHIPS.map((t, i) => {
            const on = t === activeTab;
            return (
              <button
                key={t}
                ref={(el) => { chipRefs.current[i] = el; }}
                type="button"
                onClick={() => changeTab(t)}
                aria-pressed={on}
                className={`relative flex-1 shrink-0 whitespace-nowrap rounded-[13px] px-3.5 py-2 text-[14px] transition-colors ${on ? 'font-bold text-[#191F28]' : 'font-semibold text-[#8B95A1] pc:hover:text-[#4E5968]'}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <QdBody key={activeTab} className="space-y-7 px-6 pt-2 pc:px-8">
        {groups.map((group) => (
          <section key={group.category}>
            {activeTab === '전체' && <MySectionTitle>{group.category}</MySectionTitle>}
            <div className="space-y-2.5">
              {group.items.map((faq, i) => {
                const id = `${group.category}-${i}`;
                const isOpen = openId === id;
                return (
                  <div key={id} className={MY_CARD}>
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : id)}
                      aria-expanded={isOpen}
                      className="flex min-h-[60px] w-full items-center justify-between gap-3 rounded-[16px] px-[18px] py-4 text-left transition-colors active:bg-[#F8F9FA] pc:hover:bg-[#FAFBFC]"
                    >
                      <span className={`break-keep text-[17px] font-semibold leading-snug ${isOpen ? 'text-[#191F28]' : 'text-[#333D4B]'}`}>
                        <span className="mr-1.5 text-[#3180F7]">Q.</span>
                        {faq.question}
                      </span>
                      <svg
                        width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                        className="shrink-0 transition-transform duration-300"
                        style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
                      >
                        <path d="M6 9l6 6 6-6" stroke={isOpen ? '#3180F7' : '#B0B8C1'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <div className={`${s.expand} ${isOpen ? s.open : ''}`}>
                      <div>
                        <div className="mx-[18px] border-t border-[#F2F4F6]" />
                        <p className="whitespace-pre-line break-keep px-[18px] pb-5 pt-3.5 text-[15px] leading-[1.75] text-[#4E5968]">{faq.answer}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {groups.length === 0 && <EmptyBlock icon="question" title="등록된 질문이 없어요" desc="준비되는 대로 안내드릴게요." />}
      </QdBody>
    </Screen>
  );
}
