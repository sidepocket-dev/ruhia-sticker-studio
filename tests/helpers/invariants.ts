import { countOpaqueIn, toAlphaMask } from '../../src/core/image/alpha-mask.js';
import { intersectionArea } from '../../src/core/image/trim.js';
import type { PixelBuffer, StickerRegion } from '../../src/core/image/types.js';

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
