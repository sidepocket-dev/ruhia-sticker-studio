import type { AlphaMask, AlphaProfile } from './types.js';

/**
 * 行ごと・列ごとの不透明画素数を数える。
 *
 * この1本の集計から、3 × 3 の切断位置探索と、
 * 単純分割で安全かどうかの判定（PRODUCT_SPEC.md §16）の両方を行う。
 */
export function computeProfile(mask: AlphaMask): AlphaProfile {
  const { data, width, height } = mask;
  const columns = new Int32Array(width);
  const rows = new Int32Array(height);
  let totalOpaque = 0;

  for (let y = 0; y < height; y++) {
    const rowStart = y * width;
    let rowCount = 0;
    for (let x = 0; x < width; x++) {
      if ((data[rowStart + x] ?? 0) === 1) {
        rowCount++;
        columns[x] = (columns[x] ?? 0) + 1;
      }
    }
    rows[y] = rowCount;
    totalOpaque += rowCount;
  }

  return { columns, rows, totalOpaque };
}
