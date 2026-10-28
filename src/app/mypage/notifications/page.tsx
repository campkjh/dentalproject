'use client';

// 알림 설정 — 프리티풀 마이 > 알림 설정 그대로: 묶음 제목 + 카드 한 줄(제목 17 · 회색 설명 13 · 토스 스위치).
import { useState } from 'react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';
import { QdBody, QdList, MySectionTitle, MY_CARD } from '@/components/detail/QdKit';
import { Screen, TossSwitch, TossIcon, NeedLogin } from '@/components/mypage/screens/ScreenKit';

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

  if (!isLoggedIn) {
    return (
      <Screen>
        <TopBar title="알림 설정" />
        <NeedLogin />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="알림 설정" sub="받고 싶은 알림만 골라 받으세요" />

      <QdBody className="space-y-7 px-6 pt-1 pc:px-8">
        {sections.map((section) => (
          <section key={section.title}>
            <MySectionTitle>{section.title}</MySectionTitle>
            <QdList>
              {section.items.map((item) => (
                <div key={item.key} className={`${MY_CARD} flex min-h-[60px] items-center justify-between gap-3 px-[18px] py-3.5`}>
                  <div className="min-w-0">
                    <p className="text-[17px] font-semibold text-[#333D4B]">{item.label}</p>
                    <p className="mt-[3px] break-keep text-[13px] leading-[1.45] text-[#8B95A1]">{item.description}</p>
                  </div>
                  <TossSwitch on={values[item.key]} onToggle={() => toggle(item.key)} label={item.label} />
                </div>
              ))}
            </QdList>
          </section>
        ))}

        <p className="flex items-start gap-2 rounded-[16px] bg-[#F7F8FA] px-4 py-3.5 text-[13px] leading-[1.6] text-[#6B7684]">
          <TossIcon name="alarm" size={18} className="mt-px" />
          <span className="break-keep">
            광고성 정보 수신 동의 시 쿠폰·이벤트 등의 혜택 알림을 받으실 수 있습니다.
            알림 설정은 디바이스 설정보다 후순위로 적용됩니다.
          </span>
        </p>
      </QdBody>
    </Screen>
  );
}
