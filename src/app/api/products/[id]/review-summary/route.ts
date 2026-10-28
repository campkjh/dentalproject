// 상품 후기 요약 — 프리티풀 '스타일 소개' 카드처럼 실제 후기만 모아 두 문장 + 키워드 넷.
//  · ANTHROPIC_API_KEY 가 있으면 Claude, 없으면 GEMINI_API_KEY(프리티풀과 같은 Google AI Studio 키)로 Gemini 가 요약(source 'ai').
//    둘 다 없거나 실패하면 후기 글에서 자주 나온 말을 세어 만든 규칙 요약(source 'rule').
//  · 후기 2건 미만이면 null(카드를 띄우지 않는다). 같은 상품·같은 후기 수는 하루 기억한다.
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export type ReviewSummary = { summary: string; keywords: string[]; source: 'ai' | 'rule'; reviewCount: number };

const DAY = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: ReviewSummary | null }>();

const SummarySchema = z.object({
  summary: z.string(),
  keywords: z.array(z.string()),
});

/** 후기 글에서 세는 말 — 키워드 칩 이름 · 찾을 낱말들 */
const RULE_KEYWORDS: { label: string; words: string[] }[] = [
  { label: '친절한 상담', words: ['친절', '상담'] },
  { label: '꼼꼼한 설명', words: ['꼼꼼', '설명', '자세'] },
  { label: '통증 적음', words: ['안 아', '안아', '통증', '아프지'] },
  { label: '자연스러운 결과', words: ['자연스', '만족', '결과'] },
  { label: '빠른 회복', words: ['회복', '붓기', '금방'] },
  { label: '깔끔한 시설', words: ['깔끔', '시설', '청결', '깨끗'] },
  { label: '합리적인 가격', words: ['가격', '저렴', '가성비', '합리'] },
  { label: '재방문 의사', words: ['재방문', '또 ', '다음에도', '추천'] },
];

function ruleSummary(reviews: { rating: number; content: string }[]): ReviewSummary {
  const text = reviews.map(r => r.content).join('\n');
  const ranked = RULE_KEYWORDS
    .map(k => ({ label: k.label, n: k.words.reduce((sum, w) => sum + (text.split(w).length - 1), 0) }))
    .filter(k => k.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 4)
    .map(k => k.label);
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const top = ranked.slice(0, 2);
  const summary = top.length > 0
    ? `후기 ${reviews.length}건에서 '${top.join("', '")}' 이야기가 가장 많았어요. 평균 별점은 ${avg.toFixed(1)}점이에요.`
    : `후기 ${reviews.length}건의 평균 별점은 ${avg.toFixed(1)}점이에요.`;
  return { summary, keywords: ranked, source: 'rule', reviewCount: reviews.length };
}

const SYSTEM_PROMPT =
  '당신은 치과·의료 시술 예약 앱의 후기 요약을 씁니다. 주어진 실제 후기에 적힌 내용만 근거로, 시술을 고민하는 사람이 읽기 쉬운 한국어 존댓말(~해요체) 두 문장을 씁니다. ' +
  '후기에 없는 효과·수치·약속은 쓰지 않고, 의학적 조언이나 과장은 하지 않습니다. keywords 는 후기에 자주 나온 만족 포인트 4개, 각 2~7자 명사구(예: 친절한 상담, 통증 적음).';

/** Gemini(프리티풀과 같은 키·모델) — JSON 스키마로 받는다 */
async function geminiSummary(title: string, reviews: { rating: number; content: string }[]): Promise<ReviewSummary | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const list = reviews.map((r, i) => `${i + 1}. (별점 ${r.rating}) ${r.content}`).join('\n');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: `시술: ${title}\n후기 ${reviews.length}건:\n${list}` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: { summary: { type: 'STRING' }, keywords: { type: 'ARRAY', items: { type: 'STRING' } } },
          required: ['summary', 'keywords'],
        },
        maxOutputTokens: 600,
      },
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status} ${(await res.text().catch(() => '')).replace(/AIza[\w-]+/g, '[key]').slice(0, 200)}`);
  const json = await res.json();
  const text: string = json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('') ?? '';
  const parsed = SummarySchema.safeParse(JSON.parse(text || '{}'));
  if (!parsed.success || !parsed.data.summary.trim()) return null;
  return { summary: parsed.data.summary.trim(), keywords: parsed.data.keywords.map(k => k.trim()).filter(Boolean).slice(0, 4), source: 'ai', reviewCount: reviews.length };
}

async function aiSummary(title: string, reviews: { rating: number; content: string }[]): Promise<ReviewSummary | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic();
  const list = reviews.map((r, i) => `${i + 1}. (별점 ${r.rating}) ${r.content}`).join('\n');
  const response = await client.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 2000,
    output_config: { effort: 'low', format: zodOutputFormat(SummarySchema) },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `시술: ${title}\n후기 ${reviews.length}건:\n${list}` }],
  });
  if (response.stop_reason === 'refusal' || !response.parsed_output) return null;
  const { summary, keywords } = response.parsed_output;
  return { summary: summary.trim(), keywords: keywords.map(k => k.trim()).filter(Boolean).slice(0, 4), source: 'ai', reviewCount: reviews.length };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ data: null });

  const sb = await createClient();
  const [{ data: product }, { data: rows }] = await Promise.all([
    sb.from('products').select('title').eq('id', id).maybeSingle(),
    sb.from('reviews').select('rating, content').eq('product_id', id).order('created_at', { ascending: false }).limit(40),
  ]);
  const reviews = (rows ?? [])
    .map(r => ({ rating: Number(r.rating) || 0, content: String(r.content ?? '').trim() }))
    .filter(r => r.content.length > 0);
  if (reviews.length < 2) return NextResponse.json({ data: null });

  const key = `${id}:${reviews.length}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < DAY) return NextResponse.json({ data: hit.value });

  let value: ReviewSummary | null = null;
  try {
    value = (await aiSummary(product?.title ?? '', reviews)) ?? (await geminiSummary(product?.title ?? '', reviews));
  } catch (error) {
    console.error('[review-summary] AI 요약 실패 — 규칙 요약으로 대신', error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : error);
  }
  value = value ?? ruleSummary(reviews);
  cache.set(key, { at: Date.now(), value });
  return NextResponse.json({ data: value });
}
