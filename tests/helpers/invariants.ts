import { countOpaqueIn, toAlphaMask } from '../../src/core/image/alpha-mask.js';
import { intersectionArea } from '../../src/core/image/trim.js';
import type { AlphaMask, PixelBuffer, Rect, StickerRegion } from '../../src/core/image/types.js';

export interface InvariantReport {
  /** 抽出範囲に含まれた内容の割合 (TEST_PLAN.md §4 C1) */
  coverage: number;
  /** 抽出範囲どうしの重なり面積の合計 (TEST_PLAN.md §4 C2) */
  overlapArea: number;
}

/**
 * 「内容を切っていない」「二重に取っていない」を機械的に測る。
 * 目視レビューの代わりになる、抽出品質の中心的な指標。
 */
export function checkInvariants(
  buffer: PixelBuffer,
  regions: StickerRegion[],
  alphaThreshold: number,
): InvariantReport {
  const mask = toAlphaMask(buffer, alphaThreshold);

  let total = 0;
  for (let i = 0; i < mask.data.length; i++) total += mask.data[i] ?? 0;

  let captured = 0;
  for (const region of regions) captured += countOpaqueIn(mask, region.bounds);

  let overlapArea = 0;
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const a = regions[i];
      const b = regions[j];
      if (a && b) overlapArea += intersectionArea(a.bounds, b.bounds);
    }
  }

  return { coverage: total === 0 ? 1 : captured / total, overlapArea };
}

/**
 * 矩形が内容にぴったり接しているか（透明な余白が残っていないか）。
 *
 * 上下左右それぞれの縁に不透明画素が1つ以上あることを確かめる。
 * どれかの縁が完全に透明なら、その分だけ余白が残っている。
 */
export function isTightlyTrimmed(mask: AlphaMask, rect: Rect): boolean {
  const { data, width } = mask;
  const x1 = rect.x + rect.width - 1;
  const y1 = rect.y + rect.height - 1;

  const hasOpaqueInRow = (y: number): boolean => {
    for (let x = rect.x; x <= x1; x++) if ((data[y * width + x] ?? 0) === 1) return true;
    return false;
  };
  const hasOpaqueInColumn = (x: number): boolean => {
    for (let y = rect.y; y <= y1; y++) if ((data[y * width + x] ?? 0) === 1) return true;
    return false;
  };

  return hasOpaqueInRow(rect.y) && hasOpaqueInRow(y1) && hasOpaqueInColumn(rect.x) && hasOpaqueInColumn(x1);
}
