import type { Rect } from '../../src/core/image/types.js';

/** 2つの矩形の一致度 (Intersection over Union)。 */
export function iou(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  const overlap = w > 0 && h > 0 ? w * h : 0;
  const union = a.width * a.height + b.width * b.height - overlap;
  return union === 0 ? 0 : overlap / union;
}
