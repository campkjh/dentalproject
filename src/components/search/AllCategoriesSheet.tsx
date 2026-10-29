'use client';

// 전체 카테고리 — 카테고리 목록 머리의 햄버거로 여는 한 장짜리 화면(261029 사장, 당근 '전체 서비스' 견본).
//  · 맨 위 '최근 본 카테고리' = 둥근 네모 칸(아이콘 + 이름), 아래는 묶음 제목 + 두 칸 줄(아이콘 + 이름).
//  · 묶음은 DB 에 없어 여기서 진료과 id 로 나눈다 — 모르는 id(새 진료과)는 '그 밖의 진료'로 모인다.
//  · 오른쪽에서 밀려 들어오고, 뒤로(화면 버튼·브라우저 뒤로) 하면 닫힌다. 고르면 그 진료과로 바꾸고 닫는다.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export type SheetCategory = { id: string; name: string; icon?: string };

const RECENT_KEY = 'md-recent-categories';

const GROUPS: { title: string; ids: string[] }[] = [
  { title: '자주 찾는 진료', ids: ['internal', 'dental', 'dermatology', 'eye'] },
  { title: '아이 · 여성 · 남성', ids: ['pediatric', 'obstetrics', 'urology'] },
  { title: '미용 · 성형', ids: ['plastic'] },
  { title: '뼈 · 신경 · 재활', ids: ['orthopedic', 'neurosurgery', 'physical-therapy', 'korean-medicine'] },
  { title: '귀 · 코 · 목 · 검사', ids: ['ent', 'radiology'] },
  { title: '마음 건강', ids: ['psychiatry'] },
];

export function readRecentCategories(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberCategory(id: string) {
  if (!id) return;
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecentCategories().filter((x) => x !== id)].slice(0, 8)));
  } catch { /* 저장소 막힘 — 최근 칸만 안 남는다 */ }
}

function BackIcon() {
  return (
    <i
      aria-hidden="true"
      className="block h-[26px] w-[26px] bg-[#191F28]"
      style={{ WebkitMaskImage: 'url(/quick-match/icons/back.svg)', maskImage: 'url(/quick-match/icons/back.svg)', WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }}
    />
  );
}

export default function AllCategoriesSheet({
  categories,
  activeId,
  onPick,
  onClose,
}: {
  categories: SheetCategory[];
  activeId: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [recent] = useState(readRecentCategories);
  const [leaving, setLeaving] = useState(false);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const grouped = new Set(GROUPS.flatMap((g) => g.ids));
  const groups = [
    ...GROUPS.map((g) => ({ title: g.title, items: g.ids.map((id) => byId.get(id)).filter(Boolean) as SheetCategory[] })),
    { title: '그 밖의 진료', items: categories.filter((c) => !grouped.has(c.id)) },
  ].filter((g) => g.items.length > 0);
  const recentItems = recent.map((id) => byId.get(id)).filter(Boolean) as SheetCategory[];

  const close = () => {
    setLeaving(true);
    setTimeout(onClose, 260);
  };

  // 브라우저 뒤로 = 닫기(열 때 기록 한 칸을 쌓는다)
  useEffect(() => {
    window.history.pushState({ mdAllCategories: true }, '');
    const onPop = () => close();
    window.addEventListener('popstate', onPop);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('popstate', onPop);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goBack = () => {
    if (window.history.state?.mdAllCategories) window.history.back();
    else close();
  };
  const pick = (id: string) => {
    rememberCategory(id);
    onPick(id);
    goBack();
  };

  return createPortal(
    <div className={`all-cats fixed inset-0 z-[80] flex flex-col bg-white${leaving ? ' is-out' : ''}`} role="dialog" aria-label="전체 카테고리">
      <div className="shrink-0 bg-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="relative mx-auto flex h-14 w-full max-w-[640px] items-center px-1.5">
          <button type="button" onClick={goBack} aria-label="뒤로" className="flex h-11 w-11 items-center justify-center rounded-full transition-colors active:bg-[#F2F4F6]">
            <BackIcon />
          </button>
          <h1 className="pointer-events-none absolute inset-x-0 text-center text-[18px] font-bold tracking-[-0.3px] text-[#191F28]">전체 카테고리</h1>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain hide-scrollbar">
        <div className="mx-auto w-full max-w-[640px] pb-[calc(32px+env(safe-area-inset-bottom))]">
          {recentItems.length > 0 && (
            <section className="qd-a-item px-5 pt-4">
              <h2 className="text-[15px] font-semibold text-[#4E5968]">최근 본 카테고리</h2>
              <div className="-mx-5 mt-3 flex gap-4 overflow-x-auto px-5 pb-1 hide-scrollbar">
                {recentItems.map((c) => (
                  <button key={c.id} type="button" onClick={() => pick(c.id)} className="flex w-[60px] shrink-0 flex-col items-center gap-2 transition-transform active:scale-95">
                    <span className="flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-[#F2F4F6]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {c.icon && <img src={c.icon} alt="" width={34} height={34} />}
                    </span>
                    <span className="w-full truncate text-center text-[13px] text-[#4E5968]">{c.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="qd-a-item px-5 pt-6" style={{ animationDelay: '0.04s' }}>
            <button
              type="button"
              onClick={() => pick('')}
              className={`flex h-12 w-full items-center justify-center rounded-[14px] text-[15px] font-semibold transition-colors active:scale-[0.99] ${activeId === '' ? 'bg-[#191F28] text-white' : 'bg-[#F2F4F6] text-[#333D4B]'}`}
            >
              전체 상품 보기
            </button>
          </section>

          {groups.map((g, gi) => (
            <section key={g.title} className="qd-a-item px-5 pt-8" style={{ animationDelay: `${0.08 + gi * 0.04}s` }}>
              <h2 className="text-[15px] font-semibold text-[#4E5968]">{g.title}</h2>
              <div className="mt-2 grid grid-cols-2 gap-x-3">
                {g.items.map((c) => {
                  const on = c.id === activeId;
                  return (
                    <button key={c.id} type="button" onClick={() => pick(c.id)} className="-mx-2 flex h-14 items-center gap-3.5 rounded-[14px] px-2 text-left transition-colors active:bg-[#F2F4F6]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {c.icon ? <img src={c.icon} alt="" width={32} height={32} className="shrink-0" /> : <span className="h-8 w-8 shrink-0 rounded-full bg-[#F2F4F6]" />}
                      <span className={`truncate text-[17px] tracking-[-0.3px] ${on ? 'font-bold text-[#3180F7]' : 'text-[#191F28]'}`}>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
