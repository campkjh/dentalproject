type DraftInput = { hospital: string; treatment: string; rating: number; content: string; aspects: { kindness: number; cleanliness: number; price: number; revisit: number } };

export function tidyReviewSpacing(content: string) {
  return content.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n')
    .replace(/([.!?])(?=[가-힣A-Za-z])/g, '$1 ')
    .replace(/(정말|너무)(친절|깔끔|만족|좋았|아쉬)/g, '$1 $2')
    .replace(/수있/g, '수 있').replace(/것같/g, '것 같').trim();
}

/** Local template only: never send a member's treatment or review data externally. */
export function reviewDraft(input: DraftInput) {
  if (input.content.trim()) return tidyReviewSpacing(input.content);
  const lines = [
    `${input.hospital.trim()}에서 받은 ${input.treatment.trim()} 후기를 남겨요.`,
    `전체적인 이용 경험은 ${input.rating}점으로 평가했어요.`,
    input.rating >= 4 ? '전반적으로 만족스러운 경험이었어요.' : input.rating >= 3 ? '만족한 부분도 있고 아쉬운 부분도 있었어요.' : '전반적으로 아쉬운 경험이었어요.',
  ];
  if (input.aspects.kindness) lines.push(input.aspects.kindness >= 4 ? '친절한 응대가 좋았어요.' : input.aspects.kindness <= 2 ? '응대에서는 아쉬운 점이 있었어요.' : '응대는 무난했어요.');
  if (input.aspects.cleanliness) lines.push(input.aspects.cleanliness >= 4 ? '병원 청결도에도 만족했어요.' : input.aspects.cleanliness <= 2 ? '병원 청결도는 개선되면 좋겠어요.' : '병원 청결도는 보통이었어요.');
  if (input.aspects.price) lines.push(input.aspects.price >= 4 ? '가격에 대한 만족도도 높았어요.' : input.aspects.price <= 2 ? '가격 면에서는 아쉬움이 남았어요.' : '가격에 대한 만족도는 보통이었어요.');
  if (input.aspects.revisit >= 4) lines.push('필요한 진료가 있다면 다시 방문할 생각이 있어요.');
  return tidyReviewSpacing(lines.join('\n'));
}
