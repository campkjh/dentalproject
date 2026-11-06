export const REVIEW_REPORT_REASONS=['욕설·비방','광고·스팸','허위·부적절한 내용','개인정보 노출','기타'] as const;
export function visibleReviews<T extends {authorId?: string}>(reviews:T[],blockedIds:string[]):T[]{
 const blocked=new Set(blockedIds);return reviews.filter(review=>!review.authorId||!blocked.has(review.authorId));
}
