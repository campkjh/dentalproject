'use client';

// 상품 후기 요약 카드 — 프리티풀 StyleIntroCard('이 사회자의 스타일을 소개합니다') 그대로.
//  · 순서: 카드 페이드업 → 본문 칸 촤락 펼침 → 요약 문장 단어 단위 흐림→선명 → 특징 칩 차례로(globals .style-*).
//  · 데이터 = GET /api/products/:id/review-summary(실제 후기만, 2건 미만이면 null → 카드 안 띄움).
//  · AI 가 쓴 요약(source 'ai')일 때만 AI 별·'AI 후기 요약' 제목, 규칙 요약이면 '후기 한눈에 보기'.
import { useEffect, useRef, useState } from 'react';
import AiIcon from '@/components/icons/AiIcon';

export type StyleSummary = { summary: string; keywords: string[]; source: 'ai' | 'rule'; reviewCount: number };

const summaryCache = new Map<string, { at: number; value: StyleSummary | null }>();

export function useReviewSummary(productId: string | null | undefined, reviewCount: number) {
  const [state, setState] = useState<{ loading: boolean; value: StyleSummary | null }>(() => {
    const hit = productId ? summaryCache.get(productId) : undefined;
    return hit && Date.now() - hit.at < 10 * 60_000 ? { loading: false, value: hit.value } : { loading: false, value: null };
  });
  useEffect(() => {
    if (!productId || reviewCount < 2) return;
    const hit = summaryCache.get(productId);
    if (hit && Date.now() - hit.at < 10 * 60_000) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 요청 시작 표시(원본과 같은 흐름)
    setState({ loading: true, value: null });
    fetch(`/api/products/${productId}/review-summary`)
      .then(r => (r.ok ? r.json() : { data: null }))
      .then(({ data }) => {
        summaryCache.set(productId, { at: Date.now(), value: data ?? null });
        if (alive) setState({ loading: false, value: data ?? null });
      })
      .catch(() => { if (alive) setState({ loading: false, value: null }); });
    return () => { alive = false; };
  }, [productId, reviewCount]);
  return state;
}

export default function ReviewSummaryCard({
  summary,
  loading,
  compact = false,
  className = '',
  waitText = '후기를 읽고 있어요…',
}: {
  summary: StyleSummary | null;
  loading: boolean;
  /** PC 상세 리뷰 옆 좁은 칸 — 글자·여백을 줄이고 문장은 세 줄까지 */
  compact?: boolean;
  className?: string;
  waitText?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') { const t = window.setTimeout(() => setSeen(true), 0); return () => window.clearTimeout(t); }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setSeen(true); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(el);
    // 관찰자가 안 오는 웹뷰(안드)도 굴리면 보이게 — 스크롤 때 자리만 잰다
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      if (r.top < (window.innerHeight || 800) * 0.9 && r.bottom > 0) setSeen(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); };
    // 카드는 요약을 받기 시작할 때 생긴다 — 그때(loading·summary 가 바뀔 때) 다시 붙여야 보이는 걸 잡는다
  }, [seen, loading, summary]);

  if (!loading && !summary) return null;
  const words = summary ? summary.summary.split(/\s+/).filter(Boolean) : [];
  const wordBase = 0.55; // 칸이 펼쳐지기 시작한 뒤
  const chipBase = wordBase + words.length * 0.045 + 0.2;
  const open = seen && Boolean(summary);

  return (
    <div
      ref={ref}
      className={`style-intro rounded-[20px] border border-[#F5E4EE] ${compact ? 'px-4 py-3.5' : 'px-[18px] py-4'} ${seen ? '' : 'is-waiting'} ${className}`}
    >
      <div className="flex items-center gap-2">
        {(loading || summary?.source === 'ai') && <AiIcon size={compact ? 18 : 20} tile={false} spin={loading && !summary} />}
        <p className={`style-intro-title font-bold tracking-[-0.3px] ${compact ? 'text-[15px]' : 'text-[17px]'}`}>{summary?.source === 'rule' ? '후기 한눈에 보기' : 'AI 후기 요약'}</p>
      </div>
      {loading && !summary && (
        <p className={`style-intro-wait mt-2.5 tracking-[-0.2px] text-[#9A8FAE] ${compact ? 'text-[13px]' : 'text-[14px]'}`}>{waitText}</p>
      )}
      <div className={`style-intro-body${open ? ' is-open' : ''}`}>
        <div className="min-h-0 overflow-hidden">
          {open && summary && (
            <>
              <p className={`tracking-[-0.3px] text-[#333D4B] ${compact ? 'mt-2 line-clamp-3 text-[13.5px] leading-[1.6]' : 'mt-3 text-[15.5px] leading-[1.7]'}`}>
                {words.map((word, i) => (
                  <span key={i} className="style-word" style={{ animationDelay: `${wordBase + i * 0.045}s` }}>
                    {word}{i < words.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </p>
              {summary.keywords.length > 0 && (
                <div className={`flex flex-wrap gap-1.5 ${compact ? 'mt-2' : 'mt-3'}`}>
                  {summary.keywords.map((keyword, i) => (
                    <span
                      key={keyword}
                      className={`style-chip rounded-[8px] bg-white/80 font-semibold tracking-[-0.2px] text-[#6A4BB8] ring-1 ring-[#EFE6FB] ${compact ? 'px-2 py-[3px] text-[12px]' : 'px-2.5 py-[5px] text-[13px]'}`}
                      style={{ animationDelay: `${chipBase + i * 0.08}s` }}
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
