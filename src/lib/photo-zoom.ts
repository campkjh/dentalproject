export type PhotoTransform = { scale: number; x: number; y: number };
export type PhotoPoint = { x: number; y: number };
export type PhotoBounds = { width: number; height: number };
export const INITIAL_PHOTO_TRANSFORM: PhotoTransform = { scale: 1, x: 0, y: 0 };

export function constrainPhotoTransform(value: PhotoTransform, bounds: PhotoBounds): PhotoTransform {
  const scale = Math.min(4, Math.max(1, Number.isFinite(value.scale) ? value.scale : 1));
  if (scale < 1.02) return { ...INITIAL_PHOTO_TRANSFORM };
  const maxX = Math.max(0, bounds.width * (scale - 1) / 2);
  const maxY = Math.max(0, bounds.height * (scale - 1) / 2);
  return { scale, x: Math.max(-maxX, Math.min(maxX, value.x)), y: Math.max(-maxY, Math.min(maxY, value.y)) };
}

export function pinchPhotoTransform(start: PhotoTransform, origin: PhotoPoint, current: PhotoPoint, ratio: number, bounds: PhotoBounds): PhotoTransform {
  if (!Number.isFinite(ratio) || ratio <= 0) return constrainPhotoTransform(start, bounds);
  const scale = Math.max(1, Math.min(4, start.scale * ratio));
  return constrainPhotoTransform({ scale,
    x: current.x - (origin.x - start.x) * scale / start.scale,
    y: current.y - (origin.y - start.y) * scale / start.scale,
  }, bounds);
}
