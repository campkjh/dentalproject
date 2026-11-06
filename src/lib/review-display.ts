/** 이름 가운데를 가려 사진 후기에서도 작성자 실명이 그대로 노출되지 않게 한다. */
export function maskReviewAuthor(value: string): string {
  const name = value.trim();
  if (!name) return '익명';
  if (name.includes('*')) return name;
  const chars = Array.from(name);
  if (chars.length === 1) return '*';
  if (chars.length === 2) return `${chars[0]}*`;
  return `${chars[0]}${'*'.repeat(chars.length - 2)}${chars.at(-1)}`;
}
