'use client';

// 상품 인사이트(261101) — 내 병원 등록 상품의 노출·조회·조회율 + 좋아요·포켓·예약.
//  · 위 = 기간 분할(7·30·90일) · 연파랑 핵심 카드(노출 → 조회) · 회색 숫자 칸.
//  · 가운데 = 날짜별 막대(한 색·한 축) — 노출/조회/조회율 바꿔 보기, 누르면(올리면) 그날 값 말풍선.
//  · 아래 = 상품별 줄(조회 순) — 누르면 그 상품만 그래프로. ?product=<id> 로 바로 열 수 있다.
//  · 노출 = 목록에서 카드가 절반 이상 보인 것 / 조회 = 상세를 연 것(같은 사람·같은 상품은 하루 한 번).

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TopBar from '@/components/common/TopBar';
import MonoIcon from '@/components/common/MonoIcon';
import { useSession } from '@/lib/supabase/SessionProvider';
import { ChevronRight } from 'lucide-react';
import { normalizeProductImageUrl } from '@/lib/images';

type Daily = { day: string; impressions: number; views: number };
type Item = {
  id: string; title: string; imageUrl: string | null; price: number | null; status: string | null;
  impressions: number; views: number; likes: number; pockets: number; reservations: number; totalLikes: number;
  spark: number[];
};
type Insights = { days: number; daily: Daily[]; productDaily?: Daily[] | null; totals: Omit<Item, 'id' | 'title' | 'imageUrl' | 'price' | 'status' | 'spark' | 'totalLikes'>; products: Item[]; trackingSince: string };
type Metric = 'impressions' | 'views' | 'rate';

const PERIODS = [7, 30, 90] as const;
const METRICS: { key: Metric; label: string }[] = [
  { key: 'impressions', label: '노출' },
  { key: 'views', label: '조회' },
  { key: 'rate', label: '조회율' },
];
const num = (n: number) => n.toLocaleString('ko-KR');
const pct = (v: number, i: number) => (i > 0 ? `${((v / i) * 100).toFixed(1)}%` : '-');
const md = (d: string) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`;

export default function InsightsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <InsightsInner />
    </Suspense>
  );
}

function InsightsInner() {
  const { authUser } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const productId = params.get('product');
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [metric, setMetric] = useState<Metric>('views');
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/my-hospital/product-insights?days=${days}${productId ? `&product=${productId}` : ''}`, { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (!cancelled) { setData(json); setFailed(false); }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authUser, days, productId]);

  const selected = productId ? data?.products.find(p => p.id === productId) ?? null : null;
  const daily = selected && data?.productDaily ? data.productDaily : data?.daily ?? [];
  const totals = selected ?? data?.totals;
  const products = useMemo(() => [...(data?.products ?? [])].sort((a, b) => b.views - a.views || b.impressions - a.impressions), [data]);
  const pick = (id: string | null) => router.replace(id ? `/partner/insights?product=${id}` : '/partner/insights', { scroll: false });

  if (!authUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
          <MonoIcon name="lock" size={34} color="#B0B8C1" />
        </span>
        <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">로그인이 필요해요</p>
      </div>
    );
  }

  return (
    <div className="bg-white pb-12">
      <TopBar title="상품 인사이트" sub="내 상품이 고객에게 얼마나 보이고 눌렸는지 확인해요." />

      {/* 기간 */}
      <div className="px-5 pb-4 pt-1">
        <nav className="pd-seg is-wide" aria-label="기간" style={{ ['--n' as string]: PERIODS.length, ['--i' as string]: PERIODS.indexOf(days) }}>
          <span className="pd-seg-thumb" aria-hidden />
          {PERIODS.map(p => (
            <button key={p} type="button" className={days === p ? 'is-active' : undefined} onClick={() => setDays(p)}>최근 {p}일</button>
          ))}
        </nav>
      </div>

      {loading && !data ? (
        <p className="py-20 text-center text-[15px] text-[#8B95A1]">불러오는 중…</p>
      ) : failed && !data ? (
        <Empty icon="exclamation-circle" title="불러오지 못했어요" sub="잠시 뒤 다시 열어 주세요" />
      ) : !data || data.products.length === 0 ? (
        <Empty icon="tag" title="등록된 상품이 없어요" sub="상품을 추가하면 노출·조회를 여기서 볼 수 있어요" />
      ) : (
        <>
          {selected && (
            <div className="qd-a-item px-5 pb-3">
              <div className="flex items-center gap-3 rounded-[16px] bg-[#F2F4F6] py-2.5 pl-2.5 pr-3">
                <Thumb src={selected.imageUrl} size={44} />
                <span className="min-w-0 flex-1 truncate text-[16px] font-bold tracking-[-0.3px] text-[#191F28]">{selected.title}</span>
                <button type="button" onClick={() => pick(null)} className="h-9 shrink-0 rounded-[8px] bg-white px-3 text-[14px] font-semibold text-[#4E5968] active:scale-[0.97]">전체 보기</button>
              </div>
            </div>
          )}

          {/* 핵심 카드 */}
          {totals && (
            <div className="qd-a-item px-5 pb-7">
              <div className="rounded-[14px] bg-[#EFF5FE] px-5 pb-5 pt-4">
                <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">최근 {days}일</span>
                <div className="mt-3 flex items-end gap-6">
                  <div>
                    <p className="text-[15px] font-semibold text-[#1E3A78]">노출</p>
                    <p className="mt-0.5 text-[30px] font-bold tracking-[-0.8px] text-[#1E3A78]">{num(totals.impressions)}</p>
                  </div>
                  <ChevronRight size={20} strokeWidth={2.2} className="mb-3 text-[#9DB6E6]" />
                  <div>
                    <p className="text-[15px] font-semibold text-[#1E3A78]">조회</p>
                    <p className="mt-0.5 text-[30px] font-bold tracking-[-0.8px] text-[#1E3A78]">{num(totals.views)}</p>
                  </div>
                </div>
                <p className="mt-1 text-[14px] text-[#4E5968]">노출된 고객 중 <b className="font-bold text-[#1E3A78]">{pct(totals.views, totals.impressions)}</b>가 상세를 열었어요</p>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { label: '좋아요', value: totals.likes },
                  { label: '포켓', value: totals.pockets },
                  { label: '예약', value: totals.reservations },
                ].map(t => (
                  <div key={t.label} className="rounded-[14px] bg-[#F2F4F6] px-4 py-3.5">
                    <p className="text-[14px] text-[#6B7684]">{t.label}</p>
                    <p className="mt-0.5 text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">{num(t.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-2.5 bg-[#F2F4F6]" />

          {/* 날짜별 그래프 */}
          <section className="qd-a-item px-5 py-7" style={{ animationDelay: '.06s' }}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="!text-[20px] font-bold !leading-[1.3] tracking-[-0.4px] text-[#191F28]">날짜별 {METRICS.find(m => m.key === metric)!.label}</h2>
              <div className="flex gap-1.5">
                {METRICS.map(m => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMetric(m.key)}
                    className={`h-8 rounded-[8px] px-2.5 text-[14px] font-semibold transition active:scale-[0.97] ${metric === m.key ? 'bg-[#EFF5FE] text-[#2F6FE4]' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <BarChart daily={daily} metric={metric} />
            <p className="mt-4 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
              <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px shrink-0" />
              <span className="min-w-0 flex-1 break-keep">노출은 목록에서 상품 카드가 화면에 보인 것, 조회는 상품 상세를 연 것이에요. 같은 고객은 하루 한 번만 세요. {md(data.trackingSince)}부터 집계해요.</span>
            </p>
          </section>

          <div className="h-2.5 bg-[#F2F4F6]" />

          {/* 상품별 */}
          <section className="qd-a-item px-5 py-7" style={{ animationDelay: '.12s' }}>
            <h2 className="!text-[20px] font-bold !leading-[1.3] tracking-[-0.4px] text-[#191F28]">상품별 성과</h2>
            <p className="mt-1 text-[14px] text-[#8B95A1]">조회가 많은 순서예요. 누르면 그 상품만 볼 수 있어요.</p>
            <ul className="mt-4 space-y-1">
              {products.map(p => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => pick(p.id === productId ? null : p.id)}
                    className={`-mx-2 flex w-[calc(100%+16px)] items-center gap-3.5 rounded-[16px] px-2 py-2.5 text-left transition-colors active:bg-[#F9FAFB] ${p.id === productId ? 'bg-[#F2F4F6]' : ''}`}
                  >
                    <Thumb src={p.imageUrl} size={52} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-bold tracking-[-0.3px] text-[#191F28]">{p.title}</span>
                      <span className="mt-1 flex flex-wrap gap-x-2.5 text-[13.5px] text-[#6B7684]">
                        <span>노출 <b className="font-semibold text-[#333D4B]">{num(p.impressions)}</b></span>
                        <span>조회 <b className="font-semibold text-[#333D4B]">{num(p.views)}</b></span>
                        <span>조회율 <b className="font-semibold text-[#333D4B]">{pct(p.views, p.impressions)}</b></span>
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-x-2.5 text-[13px] text-[#8B95A1]">
                        <span>좋아요 {num(p.likes)}</span><span>포켓 {num(p.pockets)}</span><span>예약 {num(p.reservations)}</span>
                      </span>
                    </span>
                    <Spark values={p.spark} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

/** 날짜별 막대 — 한 색(#4A82EE)·한 축, 끝 4px 둥글게, 누르거나 올리면 그날 값 */
function BarChart({ daily, metric }: { daily: Daily[]; metric: Metric }) {
  const [hover, setHover] = useState<number | null>(null);
  const values = daily.map(d => (metric === 'rate' ? (d.impressions > 0 ? (d.views / d.impressions) * 100 : 0) : d[metric]));
  const max = Math.max(...values, 0);
  const niceMax = metric === 'rate' ? Math.max(10, Math.ceil(max / 10) * 10) : Math.max(4, niceCeil(max));
  const fmt = (v: number) => (metric === 'rate' ? `${v.toFixed(1)}%` : num(Math.round(v)));
  const H = 168;
  const gap = daily.length > 40 ? 1 : 2;
  const tickEvery = daily.length <= 7 ? 1 : daily.length <= 30 ? 7 : 15;

  return (
    <div className="relative mt-6 select-none" onMouseLeave={() => setHover(null)}>
      {/* 가로 눈금 3줄 */}
      <div className="relative" style={{ height: H }}>
        {[1, 0.5, 0].map(r => (
          <div key={r} className="absolute inset-x-0 flex items-center gap-2" style={{ top: (1 - r) * H - 0.5 }}>
            <span className="h-px flex-1 bg-[#F2F4F6]" />
            <span className="w-9 shrink-0 text-right text-[11.5px] tabular-nums text-[#B0B8C1]">{fmt(niceMax * r)}</span>
          </div>
        ))}
        <div className="absolute inset-y-0 left-0 right-11 flex items-end" style={{ gap }}>
          {daily.map((d, i) => {
            const h = niceMax > 0 ? (values[i] / niceMax) * H : 0;
            const dim = hover !== null && hover !== i;
            return (
              <button
                key={d.day}
                type="button"
                aria-label={`${md(d.day)} ${fmt(values[i])}`}
                onMouseEnter={() => setHover(i)}
                onClick={() => setHover(hover === i ? null : i)}
                className="relative flex h-full min-w-0 flex-1 items-end"
              >
                <span
                  className="block w-full rounded-t-[4px] transition-[height,opacity] duration-500"
                  style={{ height: Math.max(values[i] > 0 ? 3 : 0, h), background: '#4A82EE', opacity: dim ? 0.35 : 1 }}
                />
              </button>
            );
          })}
        </div>
        {hover !== null && daily[hover] && (
          <Tip index={hover} count={daily.length}>
            <p className="text-[12.5px] text-[#B0B8C1]">{md(daily[hover].day)}</p>
            <p className="text-[14px] font-bold text-white">{METRICS.find(m => m.key === metric)!.label} {fmt(values[hover])}</p>
            {metric === 'rate' && <p className="text-[12.5px] text-[#D1D6DB]">노출 {num(daily[hover].impressions)} · 조회 {num(daily[hover].views)}</p>}
          </Tip>
        )}
      </div>
      {/* 날짜 */}
      <div className="relative mr-11 mt-2 h-4">
        {daily.map((d, i) => (i % tickEvery === 0 || i === daily.length - 1) && (
          <span key={d.day} className="absolute -translate-x-1/2 whitespace-nowrap text-[11.5px] tabular-nums text-[#8B95A1]" style={{ left: `${((i + 0.5) / daily.length) * 100}%` }}>{md(d.day)}</span>
        ))}
      </div>
    </div>
  );
}

function Tip({ index, count, children }: { index: number; count: number; children: React.ReactNode }) {
  const ratio = (index + 0.5) / count;
  return (
    <div
      className="pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-[10px] bg-[#191F28] px-3 py-2 shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
      style={ratio > 0.55 ? { right: `calc(44px + (100% - 44px) * ${1 - ratio})` } : { left: `calc((100% - 44px) * ${ratio})` }}
    >
      {children}
    </div>
  );
}

function niceCeil(v: number) {
  if (v <= 0) return 0;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/** 최근 14일 조회 작은 막대 */
function Spark({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <span className="flex h-7 w-[58px] shrink-0 items-end gap-[2px]" aria-hidden>
      {values.map((v, i) => (
        <span key={i} className="flex-1 rounded-t-[2px]" style={{ height: `${Math.max(v > 0 ? 12 : 6, (v / max) * 100)}%`, background: v > 0 ? '#4A82EE' : '#E5E8EB' }} />
      ))}
    </span>
  );
}

function Thumb({ src, size }: { src: string | null; size: number }) {
  const url = normalizeProductImageUrl(src);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="shrink-0 rounded-[14px] bg-[#F2F4F6] object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="shrink-0 rounded-[14px] bg-[#F2F4F6]" style={{ width: size, height: size }} aria-hidden />
  );
}

function Empty({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
        <MonoIcon name={icon} size={34} color="#B0B8C1" />
      </span>
      <p className="mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]">{title}</p>
      <p className="mt-1.5 text-[15px] text-[#8B95A1]">{sub}</p>
    </div>
  );
}
