import type { AlphaMask, PixelBuffer, Rect } from './types.js';

/**
 * RGBA画素から二値マスクを作る。
 *
 * 閾値が必要な理由：AI生成画像の透明部分には微弱なアルファのノイズが乗る。
 * 実測したフィクスチャでは、閾値1では隙間が1本も検出できず、閾値8以上で
 * 初めて隙間が現れた。逆に閾値を255付近にすると、完全不透明な画素が
 * 全体の0.12%しかないため内容がほぼ消える。
 */
export function toAlphaMask(buffer: PixelBuffer, threshold: number): AlphaMask {
  const { data, width, height } = buffer;
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < mask.length; i++) {
    mask[i] = (data[i * 4 + 3] ?? 0) >= threshold ? 1 : 0;
  }

  return { data: mask, width, height };
}

/** マスク全体の不透明画素数。 */
export function countOpaque(mask: AlphaMask): number {
  let count = 0;
  for (let i = 0; i < mask.data.length; i++) count += mask.data[i] ?? 0;
  return count;
}

/** 矩形の内側の不透明画素数。内容欠損の検証に使う（TEST_PLAN.md §4 C1）。 */
export function countOpaqueIn(mask: AlphaMask, rect: Rect): number {
  const { data, width, height } = mask;
  const x0 = Math.max(0, rect.x);
  const y0 = Math.max(0, rect.y);
  const x1 = Math.min(width, rect.x + rect.width);
  const y1 = Math.min(height, rect.y + rect.height);

  let count = 0;
  for (let y = y0; y < y1; y++) {
    const row = y * width;
    for (let x = x0; x < x1; x++) count += data[row + x] ?? 0;
  }
  return count;
}

/**
 * 透明とみなせる画素の割合。
 * これが極端に低い画像は透過が無い（JPEG等）と判断し、背景除去を提案する。
 */
export function transparentRatio(mask: AlphaMask): number {
  return 1 - countOpaque(mask) / mask.data.length;
}
