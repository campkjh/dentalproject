'use client';

// 홈 배너 매거진 — 배너를 누르면 열리는 이야기 페이지(/magazine/[id])의 글.
//  · 배너 id 별로 리드·섹션·에디터 팁·체크리스트를 둔다. 여기 없는 배너(DB 에서 새로 올린 배너)는 부제를 리드로 쓰고 상품·버튼만 보인다.
//  · 글은 일반 건강·뷰티 정보만 — 효과 보장·가격·지어낸 수치는 쓰지 않는다.
import { useEffect, useState } from 'react';
import type { HomeBanner } from '@/types';
import { defaultHomeBanners } from '@/lib/home-banners';

export type BannerStorySection = { title: string; paragraphs: string[] };

export type BannerStory = {
  lead: string;
  sections: BannerStorySection[];
  tip?: string;
  checklistTitle?: string;
  checklist?: string[];
};

export const homeBannerStories: Record<string, BannerStory> = {
  'default-skin-citrus-2026': {
    lead: '세안을 꼼꼼히 해도 얼굴이 어딘가 칙칙해 보이는 날이 있어요. 피부 톤은 하루아침에 바뀌지 않지만, 원인을 알고 꾸준히 관리하면 한결 맑아 보일 수 있어요.',
    sections: [
      {
        title: '피부 톤이 칙칙해지는 이유',
        paragraphs: [
          '자외선은 피부 톤을 어둡게 만드는 가장 흔한 원인이에요. 햇빛을 받으면 피부는 스스로를 지키려고 멜라닌을 만들고, 이게 쌓이면 얼굴빛이 고르지 않아 보여요.',
          '여기에 오래된 각질, 부족한 수면, 건조함까지 겹치면 빛 반사가 줄어 피부가 탁해 보이기 쉬워요.',
        ],
      },
      {
        title: '비타민 관리, 이렇게 시작해요',
        paragraphs: [
          '비타민 C 는 맑은 피부 톤 관리에 자주 쓰이는 성분이에요. 처음이라면 낮은 농도부터 저녁에 소량 발라 보고, 따갑거나 붉어지면 쉬어 가는 게 좋아요.',
          '피부과에서는 피부 상태에 맞춰 미백·톤 관리 시술을 함께 권하기도 해요. 어떤 방법이 맞는지는 상담에서 피부를 직접 보고 정하는 게 가장 안전해요.',
        ],
      },
      {
        title: '시술보다 먼저, 생활 습관',
        paragraphs: [
          '자외선 차단제는 흐린 날에도 바르는 게 좋아요. 외출이 길다면 두세 시간마다 덧발라 주세요.',
          '각질 제거는 주 1~2회면 충분해요. 너무 자주 하면 오히려 피부 장벽이 약해질 수 있어요.',
        ],
      },
    ],
    tip: '톤 관리 시술을 받았다면 그 뒤 몇 주는 자외선 차단에 특히 신경 써 주세요. 관리한 만큼 지키는 게 더 중요해요.',
    checklistTitle: '맑은 피부 톤 체크리스트',
    checklist: ['매일 아침 자외선 차단제 바르기', '각질 제거는 주 1~2회만', '비타민 C 는 낮은 농도부터 천천히', '잠은 충분히, 수분은 넉넉히'],
  },
  'default-hydration-aloe-2026': {
    lead: '세안하고 몇 분만 지나도 얼굴이 당긴다면 피부 속 수분이 부족하다는 신호일 수 있어요. 겉만 촉촉한 게 아니라 속까지 채우는 법을 알려 드릴게요.',
    sections: [
      {
        title: '건성 피부와 수분 부족 피부는 달라요',
        paragraphs: [
          '건성 피부는 원래 유분이 적은 타입이고, 수분 부족 피부는 피부 타입과 상관없이 속 수분이 모자란 상태예요. 지성 피부도 겉은 번들거리는데 속은 당길 수 있어요.',
          '그래서 기름진 피부라도 보습을 건너뛰면 안 돼요. 가벼운 제형으로 수분을 채워 주는 게 좋아요.',
        ],
      },
      {
        title: '속 보습, 순서가 중요해요',
        paragraphs: [
          '세안 뒤 물기가 살짝 남아 있을 때 토너나 에센스로 수분을 먼저 채우고, 크림으로 마무리해 증발을 막아 주세요.',
          '뜨거운 물 세안과 잦은 각질 제거는 피부 장벽을 약하게 해요. 미지근한 물로 짧게 씻는 습관부터 들여 보세요.',
        ],
      },
      {
        title: '물광·보습 시술은 이런 분께',
        paragraphs: [
          '홈케어만으로 건조함이 잘 나아지지 않는다면 피부과에서 보습 시술을 상담해 볼 수 있어요. 피부 두께와 상태에 따라 맞는 방법이 달라서, 상담 때 평소 피부 고민을 자세히 이야기하는 게 좋아요.',
        ],
      },
    ],
    tip: '실내가 건조한 계절엔 가습기나 젖은 수건만으로도 피부 당김이 한결 덜해요.',
    checklistTitle: '촉촉한 피부 체크리스트',
    checklist: ['세안은 미지근한 물로 짧게', '물기 남았을 때 바로 보습', '크림으로 마무리해 수분 지키기', '실내 습도 챙기기'],
  },
  'default-dental-2026': {
    lead: '웃을 때 가장 먼저 눈에 들어오는 건 치아예요. 하얗고 가지런한 치아는 인상을 밝게 해 주지만, 무엇보다 먼저 챙겨야 할 건 건강한 잇몸과 치아예요.',
    sections: [
      {
        title: '치아가 누렇게 보이는 이유',
        paragraphs: [
          '커피·차·와인처럼 색이 진한 음식은 치아 표면에 착색을 남겨요. 나이가 들면서 겉의 법랑질이 얇아지면 안쪽 상아질 색이 비쳐 노랗게 보이기도 해요.',
          '착색인지, 원래 치아 색인지에 따라 맞는 관리가 달라서 먼저 진단을 받아 보는 게 좋아요.',
        ],
      },
      {
        title: '미백, 이렇게 알아봐요',
        paragraphs: [
          '치과 미백은 치아 상태를 확인한 뒤 진행해요. 시린 증상이 잠깐 생길 수 있어서, 평소 치아가 예민하다면 상담 때 꼭 말해 주세요.',
          '미백 뒤 한동안은 색이 진한 음식을 줄이면 밝아진 치아를 더 오래 지킬 수 있어요.',
        ],
      },
      {
        title: '교정은 모양보다 기능부터',
        paragraphs: [
          '교정은 가지런한 모양뿐 아니라 씹는 기능과 관리 편의에도 도움이 될 수 있어요. 투명 교정·장치 교정 등 방법이 여러 가지라 치아 배열과 생활 패턴을 함께 보고 정해요.',
          '교정 기간에는 장치 주변에 음식물이 끼기 쉬워 양치를 더 꼼꼼히 해야 해요.',
        ],
      },
    ],
    tip: '미백이나 교정 전에는 스케일링과 충치 치료를 먼저 받아 두면 좋아요. 깨끗한 상태에서 시작해야 결과도 고르게 보여요.',
    checklistTitle: '건강한 미소 체크리스트',
    checklist: ['하루 세 번, 3분 양치', '치실·치간칫솔로 사이까지', '진한 음료 뒤엔 물로 헹구기', '정기 검진·스케일링 챙기기'],
  },
  'default-health-checkup-2026': {
    lead: '바쁘다는 이유로 건강검진을 미루고 있지 않나요? 증상이 없을 때 몸 상태를 미리 확인하는 게 검진의 가장 큰 의미예요.',
    sections: [
      {
        title: '검진, 왜 미루면 안 될까요',
        paragraphs: [
          '많은 질환이 초기에는 뚜렷한 증상이 없어요. 정기 검진은 지금 내 몸이 어떤 상태인지 알고, 필요한 관리를 제때 시작하게 도와줘요.',
          '연말에는 검진 예약이 몰리기 쉬워요. 여유 있을 때 미리 날짜를 잡아 두세요.',
        ],
      },
      {
        title: '검진 전날 준비',
        paragraphs: [
          '대부분의 검진은 전날 저녁부터 금식이 필요해요. 정확한 금식 시간과 복용 중인 약을 계속 먹어도 되는지는 병원 안내를 꼭 확인해 주세요.',
          '전날은 과음과 무리한 운동을 피하고 푹 자는 게 좋아요.',
        ],
      },
      {
        title: '결과지는 이렇게 봐요',
        paragraphs: [
          '결과지에서 정상 범위를 벗어난 항목이 있다면 혼자 판단하지 말고 의료진과 상담해 주세요. 지난 결과와 비교해 보면 내 몸의 변화를 더 잘 알 수 있어요.',
        ],
      },
    ],
    tip: '가족력이 있다면 검진 상담 때 꼭 이야기해 주세요. 나에게 맞는 추가 검사를 안내받을 수 있어요.',
    checklistTitle: '검진 준비 체크리스트',
    checklist: ['검진 날짜 미리 예약하기', '금식 시간 확인하기', '복용 중인 약 목록 챙기기', '지난 검진 결과 함께 보기'],
  },
  'default-eye-care-2026': {
    lead: '하루 종일 화면을 보는 요즘, 눈은 쉴 틈이 없어요. 시력교정을 고민하고 있다면, 그 전에 내 눈 상태를 정확히 아는 것부터 시작해요.',
    sections: [
      {
        title: '눈이 피곤한 이유',
        paragraphs: [
          '화면을 오래 보면 눈을 깜빡이는 횟수가 줄어 눈이 쉽게 마르고 피로해져요. 건조함이 계속되면 시야가 뿌옇게 느껴지기도 해요.',
          '20분마다 20초쯤 먼 곳을 바라보는 습관만으로도 눈의 긴장을 풀어 줄 수 있어요.',
        ],
      },
      {
        title: '시력교정, 먼저 검사부터',
        paragraphs: [
          '시력교정 수술은 각막 두께·시력·눈 건강 상태에 따라 가능한 방법이 달라요. 그래서 수술 전 정밀 검사가 가장 중요해요.',
          '렌즈를 끼고 있다면 검사 전 일정 기간 빼 두라는 안내를 받을 수 있어요. 병원 안내에 맞춰 준비해 주세요.',
        ],
      },
      {
        title: '교정 뒤 관리',
        paragraphs: [
          '교정 뒤에는 눈을 비비지 않고, 처방받은 안약을 시간에 맞춰 넣는 게 중요해요. 정기 검진도 빠뜨리지 마세요.',
        ],
      },
    ],
    tip: '건조함이 심한 편이라면 상담 때 꼭 말해 주세요. 눈 상태에 맞는 교정 방법과 관리법을 함께 안내받을 수 있어요.',
    checklistTitle: '눈 건강 체크리스트',
    checklist: ['20분마다 먼 곳 바라보기', '화면 밝기 주변과 맞추기', '렌즈 착용 시간 지키기', '1년에 한 번 안과 검진'],
  },
  'default-rehabilitation-2026': {
    lead: '오래 앉아 있다 일어나면 허리가 뻐근하고, 어깨가 돌처럼 굳는 느낌이 들 때가 있어요. 통증은 몸이 보내는 신호예요. 참지 말고 제대로 풀어 주세요.',
    sections: [
      {
        title: '뻐근함은 자세에서 시작돼요',
        paragraphs: [
          '고개를 숙이고 화면을 보는 자세, 한쪽으로 기대 앉는 습관은 목·어깨·허리에 부담을 줘요. 같은 자세로 오래 있지 않는 것만으로도 많이 달라져요.',
          '한 시간에 한 번은 일어나서 가볍게 움직여 주세요.',
        ],
      },
      {
        title: '도수·재활 치료는 이렇게 진행돼요',
        paragraphs: [
          '도수치료는 치료사가 손으로 근육과 관절을 풀어 주는 치료예요. 재활 치료는 통증을 줄이고 움직임을 회복하도록 운동을 함께 해요.',
          '통증 부위와 정도, 생활 습관을 먼저 확인한 뒤 나에게 맞는 계획을 세워요.',
        ],
      },
      {
        title: '집에서 할 수 있는 스트레칭',
        paragraphs: [
          '목을 천천히 좌우로 기울이고, 어깨를 크게 돌려 주세요. 반동 없이 숨을 내쉬며 늘리는 게 좋아요.',
          '스트레칭 중 날카로운 통증이 느껴지면 바로 멈추고 의료진과 상담해 주세요.',
        ],
      },
    ],
    tip: '치료만큼 중요한 건 치료 사이의 습관이에요. 치료사가 알려 준 운동을 하루 몇 분이라도 이어 가 보세요.',
    checklistTitle: '굳은 몸 풀기 체크리스트',
    checklist: ['한 시간마다 일어나 움직이기', '모니터는 눈높이에 맞추기', '반동 없이 천천히 스트레칭', '통증이 계속되면 진료 받기'],
  },
  'default-doctor-2026': {
    lead: '같은 시술이라도 누구에게 받느냐에 따라 경험이 달라져요. 믿을 수 있는 전문의를 고르는 몇 가지 기준을 알려 드릴게요.',
    sections: [
      {
        title: '전문 분야를 먼저 확인해요',
        paragraphs: [
          '의사마다 주로 보는 진료 분야가 달라요. 내 고민과 맞는 분야를 진료하는 전문의인지 먼저 확인해 보세요.',
        ],
      },
      {
        title: '후기는 내용을 봐요',
        paragraphs: [
          '별점보다 중요한 건 후기의 내용이에요. 상담이 충분했는지, 궁금한 걸 잘 설명해 줬는지처럼 나에게 중요한 부분을 살펴보세요.',
          '마이닥 후기는 실제로 예약하고 방문한 분들이 남긴 이야기예요.',
        ],
      },
      {
        title: '상담 때 물어보면 좋은 것',
        paragraphs: [
          '시술 과정과 회복 기간, 생길 수 있는 부작용, 사후 관리 방법을 물어보세요. 충분히 설명을 듣고 이해한 뒤 결정해도 늦지 않아요.',
        ],
      },
    ],
    tip: '상담 전에 궁금한 걸 미리 메모해 가면, 놓치는 것 없이 이야기할 수 있어요.',
    checklistTitle: '좋은 병원 고르기 체크리스트',
    checklist: ['내 고민과 맞는 전문 분야인지', '후기 내용까지 꼼꼼히', '부작용·회복 기간 설명 듣기', '궁금한 건 미리 메모하기'],
  },
};

/** 배너에 맞는 글 — 없으면 부제를 리드로 */
export function storyForBanner(banner: HomeBanner): BannerStory {
  return homeBannerStories[banner.id] ?? { lead: banner.subtitle ?? '', sections: [] };
}

/** 배너 targetUrl 의 ?category= 값(없으면 null) */
export function bannerCategory(banner: HomeBanner): string | null {
  if (!banner.targetUrl) return null;
  try {
    return new URL(banner.targetUrl, 'https://mydoc.local').searchParams.get('category');
  } catch {
    return null;
  }
}

const dot = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

/** '배지 | 기간/날짜' 의 오른쪽 — 기간이 있으면 기간, 없으면 올린 날, 그것도 없으면 '마이닥 매거진' */
export function bannerDateLabel(banner: HomeBanner): string {
  const s = dot(banner.startsAt);
  const e = dot(banner.endsAt);
  if (s && e) return `${s} ~ ${e}`;
  if (e) return `~ ${e}`;
  return dot(banner.createdAt) || dot(banner.updatedAt) || '마이닥 매거진';
}

/** 홈 배너 목록 — 기본 배너로 바로 그리고, /api/home-banners 를 받으면 바꾼다 */
export function useHomeBannerList() {
  const [banners, setBanners] = useState<HomeBanner[]>(defaultHomeBanners);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/home-banners', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (cancelled) return;
        const next = Array.isArray(payload?.banners) ? (payload.banners as HomeBanner[]) : [];
        if (next.length > 0) setBanners(next);
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);
  const visible = banners.filter((b) => b.imageUrl || b.title);
  return { banners: visible, loaded };
}
