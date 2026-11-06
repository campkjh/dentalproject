/** 지역 등 홈의 기존 조건을 통과한 상품 안에서 관심 진료과목을 추천한다. */
export function interestedProducts<T extends { category: string; likeCount: number; reviewCount: number }>(products: T[], categoryIds: string[]): T[] {
  const interests = new Set(categoryIds);
  return products.filter(product => interests.has(product.category))
    .sort((a,b) => (b.likeCount + b.reviewCount) - (a.likeCount + a.reviewCount)).slice(0,8);
}
