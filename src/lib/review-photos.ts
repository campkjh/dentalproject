export type ReviewPhotosValue = { mode: 'before-after' | 'single'; before: string; after: string; single: string };

export function reviewPhotoSources(value: ReviewPhotosValue) {
  return value.mode === 'single'
    ? { beforeImage: '', afterImage: value.single }
    : { beforeImage: value.before, afterImage: value.after };
}
