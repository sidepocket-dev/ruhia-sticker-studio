import { toAlphaMask } from '../../src/core/image/alpha-mask.js';
import type { AlphaMask, PixelBuffer, Rect, StickerRegion } from '../../src/core/image/types.js';

export interface InvariantReport {
  /** 抽出範囲に含まれた内容の割合 (TEST_PLAN.md §4 C1) */
  coverage: number;
  /** 2つ以上のスタンプが同じ画素を取っている数 (TEST_PLAN.md §4 C2) */
  overlapArea: number;
}

/**
 * 「内容を切っていない」「二重に取っていない」を機械的に測る。
 * 目視レビューの代わりになる、抽出品質の中心的な指標。
 *
 * 矩形の重なりではなく、画素ごとに何個のスタンプが取ったかを数える。
 * 自由配置のシートでは、内容が触れていなくても外接矩形どうしが
 * 噛み合うことがあり、そのとき写り込む画素は消してから切り出す。
 * 矩形で測ると、消したはずの分まで重なりとして数えてしまう。
 */
export function checkInvariants(
  buffer: PixelBuffer,
  regions: StickerRegion[],
  alphaThreshold: number,
): InvariantReport {
  const mask = toAlphaMask(buffer, alphaThreshold);
  const claims = new Uint8Array(mask.data.length);

  let total = 0;
  for (let i = 0; i < mask.data.length; i++) total += mask.data[i] ?? 0;

  for (const region of regions) {
    const erased = erasedPixels(mask, region);
    const { x, y, width, height } = region.bounds;
    const x1 = Math.min(mask.width, x + width);
    const y1 = Math.min(mask.height, y + height);

    for (let py = Math.max(0, y); py < y1; py++) {
      for (let px = Math.max(0, x); px < x1; px++) {
        const index = py * mask.width + px;
        if ((mask.data[index] ?? 0) === 0) continue;
        if (erased.has(index)) continue;
        if ((claims[index] ?? 0) < 255) claims[index] = (claims[index] ?? 0) + 1;
      }
    }
  }

  let captured = 0;
  let doubled = 0;
  for (let i = 0; i < claims.length; i++) {
    const count = claims[i] ?? 0;
    if (count >= 1) captured++;
    if (count >= 2) doubled += count - 1;
  }

  return { coverage: total === 0 ? 1 : captured / total, overlapArea: doubled };
}

/** その範囲で消される画素の位置。 */
function erasedPixels(mask: AlphaMask, region: StickerRegion): Set<number> {
  const erased = new Set<number>();
  for (const rect of region.excludeRects ?? []) {
    const x1 = Math.min(mask.width, rect.x + rect.width);
    const y1 = Math.min(mask.height, rect.y + rect.height);
    for (let y = Math.max(0, rect.y); y < y1; y++) {
      for (let x = Math.max(0, rect.x); x < x1; x++) erased.add(y * mask.width + x);
    }
  }
  return erased;
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
