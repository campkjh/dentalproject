// 커뮤니티 글 자동 태그(261031) — 글을 읽고 정해진 태그 목록에서만 고른다.
//  · ANTHROPIC_API_KEY 가 있으면 Claude, 없으면 GEMINI_API_KEY 로 Gemini, 둘 다 없거나 실패하면 낱말 규칙.
//  · 고객 질문·의사 꿀팁(question) = 진료 카테고리 최대 2개 / 의사 라운지(free·dental) = 의사 태그 최대 3개.
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { communityCategories } from '@/lib/community';
import { communityTags } from '@/lib/mock-data';

const TagSchema = z.object({ tags: z.array(z.string()) });

const RULES: Record<string, string[]> = {
  임플란트: ['임플란트', '뼈이식', '픽스처', '지대주', '상악동'],
  교정: ['교정', '인비절라인', '브라켓', '유지장치', '덧니', '돌출입'],
  치아미백: ['미백', '화이트닝', '누런', '착색'],
  사랑니: ['사랑니', '매복'],
  스케일링: ['스케일링', '치석', '잇몸', '치주'],
  일반진료: ['충치', '신경치료', '크라운', '레진', '인레이', '시림', '때우', '발치'],
  병원경영: ['경영', '매출', '직원', '인건비', '운영'],
  보험청구: ['청구', '심평원', '삭감'],
  임상케이스: ['케이스', '증례', '임상'],
  환자상담: ['상담', '컴플레인', '환자 응대'],
  의료법: ['의료법', '소송', '분쟁', '법적'],
  의료마케팅: ['마케팅', '광고', '블로그', '홍보'],
  개원준비: ['개원'],
  학회정보: ['학회'],
  세미나공유: ['세미나', '강의'],
  전공의수련: ['전공의', '수련'],
  봉직의: ['봉직', '페이닥'],
};

export function allowedTagsFor(board: string) {
  return board === 'question' ? communityCategories.slice(1) : communityTags;
}

function ruleTags(text: string, allowed: string[], max: number) {
  return allowed
    .map(tag => ({ tag, hits: [tag, ...(RULES[tag] ?? [])].reduce((n, word) => n + (text.includes(word) ? 1 : 0), 0) }))
    .filter(x => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, max)
    .map(x => x.tag);
}

function prompt(allowed: string[], max: number) {
  return `너는 치과·의료 커뮤니티 글에 태그를 붙인다. 아래 목록에 있는 태그만, 글과 분명히 관련된 것을 최대 ${max}개 고른다. 관련된 게 없으면 빈 배열. 목록: ${allowed.join(', ')}`;
}

async function claudeTags(text: string, allowed: string[], max: number) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const response = await new Anthropic().messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 1000,
    output_config: { effort: 'low', format: zodOutputFormat(TagSchema) },
    system: prompt(allowed, max),
    messages: [{ role: 'user', content: text }],
  });
  if (response.stop_reason === 'refusal' || !response.parsed_output) return null;
  return response.parsed_output.tags;
}

async function geminiTags(text: string, allowed: string[], max: number) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: prompt(allowed, max) }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: { type: 'OBJECT', properties: { tags: { type: 'ARRAY', items: { type: 'STRING', enum: allowed } } }, required: ['tags'] },
        maxOutputTokens: 200,
      },
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const out: string = json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('') ?? '';
  const parsed = TagSchema.safeParse(JSON.parse(out || '{}'));
  return parsed.success ? parsed.data.tags : null;
}

/** 글 내용으로 태그 고르기 — 늘 허용 목록 안의 값만, 실패해도 빈 배열(글 저장을 막지 않는다) */
export async function autoTags(board: string, title: string, content: string): Promise<string[]> {
  const allowed = allowedTagsFor(board);
  const max = board === 'question' ? 2 : 3;
  const text = `${title}\n${content}`.slice(0, 3000);
  const clean = (tags: string[] | null) => tags ? [...new Set(tags.map(t => t.trim()).filter(t => allowed.includes(t)))].slice(0, max) : null;
  try {
    const ai = clean(await claudeTags(text, allowed, max)) ?? clean(await geminiTags(text, allowed, max));
    if (ai) return ai;
  } catch { /* AI 실패 → 규칙 */ }
  return ruleTags(text, allowed, max);
}
