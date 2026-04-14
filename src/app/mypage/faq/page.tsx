'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import TopBar from '@/components/common/TopBar';
import { ChevronDown } from 'lucide-react';

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
      question: '찜한 상품은 어디서 확인하나요?',
      answer: '하단 메뉴의 찜 탭을 눌러 확인하실 수 있습니다. 찜한 상품은 마이페이지의 찜목록에서도 확인 가능합니다.',
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
      answer: '휴대폰 설정 > 알림 > 키닥터에서 알림을 설정하실 수 있습니다. 예약 알림, 이벤트 알림 등을 개별적으로 관리할 수 있습니다.',
    },
    {
      question: '개인정보는 안전하게 관리되나요?',
      answer: '고객님의 개인정보는 암호화되어 안전하게 보관됩니다. 자세한 내용은 개인정보처리방침을 확인해 주세요.',
    },
  ],
};

export default function FAQPage() {
  const [activeTab, setActiveTab] = useState('이용문의');
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const prevIdxRef = useRef(0);
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const activeIdx = tabs.indexOf(activeTab);

  const changeTab = (t: string) => {
    const nextIdx = tabs.indexOf(t);
    setDirection(nextIdx >= prevIdxRef.current ? 'right' : 'left');
    prevIdxRef.current = nextIdx;
    setActiveTab(t);
    setOpenItems([]);
  };

  useLayoutEffect(() => {
    const btn = tabBtnRefs.current[activeIdx];
    if (!btn) return;
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeIdx]);

  useEffect(() => {
    const onResize = () => {
      const btn = tabBtnRefs.current[activeIdx];
      if (!btn) return;
      setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeIdx]);

  const toggleItem = (question: string) => {
    setOpenItems((prev) =>
      prev.includes(question) ? prev.filter((q) => q !== question) : [...prev, question]
    );
  };

  const currentFaqs = faqData[activeTab] ?? [];

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto page-enter">
      <TopBar title="자주하는질문" />

      {/* Tabs with sliding pill indicator */}
      <div className="px-2.5 pt-2 pb-3">
        <div className="relative flex gap-1.5 overflow-x-auto hide-scrollbar">
          <span
            aria-hidden
            className="absolute top-0 bottom-0 rounded-full bg-gray-900 pointer-events-none"
            style={{
              left: indicator.left,
              width: indicator.width,
              transition:
                'left 420ms cubic-bezier(0.22, 1, 0.36, 1), width 420ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
          {tabs.map((t, i) => {
            const isActive = activeTab === t;
            return (
              <button
                key={t}
                ref={(el) => {
                  tabBtnRefs.current[i] = el;
                }}
                onClick={() => changeTab(t)}
                className={`pill-tab relative z-10 px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-gray-500'
                }`}
                style={{
                  transition: 'color 420ms cubic-bezier(0.22, 1, 0.36, 1)',
                  border: `1px solid ${isActive ? 'transparent' : '#E5E7EB'}`,
                  background: 'transparent',
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* FAQ list with directional slide */}
      <div
        key={activeTab}
        className={`divide-y divide-gray-100 ${
          direction === 'right' ? 'tab-slide-right' : 'tab-slide-left'
        }`}
      >
        {currentFaqs.map((faq, index) => {
          const isOpen = openItems.includes(faq.question);
          return (
            <div key={index}>
              <button
                onClick={() => toggleItem(faq.question)}
                className="w-full flex items-center justify-between px-2.5 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-start gap-2 flex-1 pr-3">
                  <span className="text-[#7C3AED] font-bold text-sm mt-0.5">Q</span>
                  <span className="text-sm font-medium text-gray-900">{faq.question}</span>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-2.5 pb-4">
                  <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-4">
                    <span className="text-[#7C3AED] font-bold text-sm mt-0.5">A</span>
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {currentFaqs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-gray-500">등록된 질문이 없습니다</p>
        </div>
      )}
    </div>
  );
}
