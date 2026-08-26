import type { AlphaMask, Rect } from './types.js';

/**
 * 領域の中にある内容の外接矩形を求める。内容が無ければ null。
 *
 * 透明な余白を切り落とすのが目的。LINE上ではスタンプ画像がそのまま
 * 縮小表示されるため、余白が多いとキャラクターが小さく見える
 * （PRODUCT_SPEC.md §77.8）。
 */
export function contentBoundsIn(mask: AlphaMask, region: Rect): Rect | null {
  const { data, width, height } = mask;
  const x0 = Math.max(0, region.x);
  const y0 = Math.max(0, region.y);
  const x1 = Math.min(width, region.x + region.width);
  const y1 = Math.min(height, region.y + region.height);

  let minX = x1;
  let minY = y1;
  let maxX = x0 - 1;
  let maxY = y0 - 1;

  for (let y = y0; y < y1; y++) {
    const rowStart = y * width;
    for (let x = x0; x < x1; x++) {
      if ((data[rowStart + x] ?? 0) === 1) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** 矩形を四方に広げる。bounds の外へははみ出さない。 */
export function expandRect(rect: Rect, margin: number, bounds: Rect): Rect {
  const x = Math.max(bounds.x, rect.x - margin);
  const y = Math.max(bounds.y, rect.y - margin);
  const right = Math.min(bounds.x + bounds.width, rect.x + rect.width + margin);
  const bottom = Math.min(bounds.y + bounds.height, rect.y + rect.height + margin);
  return { x, y, width: right - x, height: bottom - y };
}

/** 2つの矩形が重なっている面積。 */
export function intersectionArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/** 内容が領域の縁に接しているか。切れている可能性の判定に使う。 */
export function touchesEdge(content: Rect, region: Rect): boolean {
  return (
    content.x <= region.x ||
    content.y <= region.y ||
    content.x + content.width >= region.x + region.width ||
    content.y + content.height >= region.y + region.height
  );
}

/**
 * 2つの矩形が「離れている量」。軸ごとの隙間のうち大きいほうを返す。
 *
 * 重なりを避けるには、どちらか一方の軸で離れていれば足りるため、
 * 小さいほうではなく大きいほうを使う。重なっている場合は0。
 */
export function rectSeparation(a: Rect, b: Rect): number {
  const gapX = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width));
  const gapY = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height));
  return Math.max(0, Math.max(gapX, gapY));
}
