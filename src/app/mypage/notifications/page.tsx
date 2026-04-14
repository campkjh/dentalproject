'use client';

import { useState } from 'react';
import TopBar from '@/components/common/TopBar';
import LoginRequired from '@/components/common/LoginRequired';
import { useStore } from '@/store';

type NotifKey =
  | 'reservation'
  | 'message'
  | 'community'
  | 'event'
  | 'marketing'
  | 'night';

interface NotifSetting {
  key: NotifKey;
  label: string;
  description: string;
}

const sections: { title: string; items: NotifSetting[] }[] = [
  {
    title: '활동 알림',
    items: [
      {
        key: 'reservation',
        label: '예약/진료 알림',
        description: '예약 확정, 진료 리마인더, 변경 및 취소 알림을 받아요.',
      },
      {
        key: 'message',
        label: '쪽지/답변 알림',
        description: '병원·의사의 답변 및 1:1 쪽지를 받을 때 알림을 받아요.',
      },
      {
        key: 'community',
        label: '커뮤니티 알림',
        description: '내가 쓴 글의 댓글, 좋아요, 멘션 알림을 받아요.',
      },
    ],
  },
  {
    title: '혜택 및 마케팅',
    items: [
      {
        key: 'event',
        label: '이벤트·혜택 알림',
        description: '쿠폰 발행, 포인트 적립 등 혜택 알림을 받아요.',
      },
      {
        key: 'marketing',
        label: '광고성 정보 수신',
        description: '맞춤 프로모션과 신규 시술 소식을 받아요.',
      },
    ],
  },
  {
    title: '기타',
    items: [
      {
        key: 'night',
        label: '야간 방해 금지',
        description: '22:00 ~ 08:00 에는 알림이 조용히 전송돼요.',
      },
    ],
  },
];

export default function NotificationSettingsPage() {
  const { isLoggedIn } = useStore();
  const [values, setValues] = useState<Record<NotifKey, boolean>>({
    reservation: true,
    message: true,
    community: false,
    event: true,
    marketing: false,
    night: true,
  });

  const toggle = (k: NotifKey) => setValues((v) => ({ ...v, [k]: !v[k] }));

  return (
    <div className="min-h-screen bg-white max-w-[480px] mx-auto pb-12">
      <TopBar title="알림 설정" />

      {!isLoggedIn ? (
        <LoginRequired />
      ) : (
        <div className="pt-2 page-enter">
          {sections.map((section) => (
            <div key={section.title} className="mb-5">
              <h3 className="text-[12px] font-semibold text-gray-400 px-2.5 py-2">
                {section.title}
              </h3>
              <div className="bg-white">
                {section.items.map((item, idx) => (
                  <div
                    key={item.key}
                    className={`px-2.5 py-4 ${
                      idx < section.items.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-gray-900">
                          {item.label}
                        </p>
                        <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">
                          {item.description}
                        </p>
                      </div>
                      <Switch on={values[item.key]} onToggle={() => toggle(item.key)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="px-2.5 pt-4">
            <p className="text-[11px] text-gray-400 leading-relaxed">
              광고성 정보 수신 동의 시 쿠폰·이벤트 등의 혜택 알림을 받으실 수 있습니다.
              알림 설정은 디바이스 설정보다 후순위로 적용됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={on}
      className="relative flex-shrink-0 w-[46px] h-[26px] rounded-full btn-press"
      style={{
        backgroundColor: on ? '#7C3AED' : '#E5E7EB',
        transition: 'background-color 220ms ease',
      }}
    >
      <span
        className="absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white"
        style={{
          left: on ? 23 : 3,
          boxShadow: '0 1px 3px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)',
          transition: 'left 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </button>
  );
}
