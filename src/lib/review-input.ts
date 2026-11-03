import { z } from 'zod';

const image = z.string().url().refine((url) => /^https:\/\//.test(url), '사진을 다시 업로드해주세요.').nullish();
export const reviewInput = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().min(50, '리뷰는 최소 50자 이상 작성해주세요.').max(2000),
  totalCost: z.number().int().min(0).max(2147483647).optional().default(0),
  treatmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }).nullish(),
  beforeImage: image,
  afterImage: image,
});

export function initialReviewLimitError(createdAt: string, imageCount: number, textCount: number, hasPhoto: boolean, now = Date.now()) {
  const age = now - new Date(createdAt).getTime();
  if (!Number.isFinite(age) || age < 0 || age >= 30 * 86400000) return '초기 리뷰는 병원 등록 후 30일 안에만 등록할 수 있어요.';
  if (hasPhoto && imageCount >= 10) return '이미지 초기 리뷰는 최대 10개까지 등록할 수 있어요.';
  if (!hasPhoto && textCount >= 20) return '텍스트 초기 리뷰는 최대 20개까지 등록할 수 있어요.';
  return null;
}
