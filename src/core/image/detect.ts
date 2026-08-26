import { IMAGE_CONFIG } from '../../config/app-config.js';
import { STICKERS_PER_SHEET } from '../../config/line-spec.js';
import { toAlphaMask } from './alpha-mask.js';
import { cellsFromGridLines, findGridLines } from './gutter-split.js';
import { computeProfile } from './profile.js';
import { contentBoundsIn, expandRect, touchesEdge } from './trim.js';
import type { DetectionResult, PixelBuffer, Rect, StickerRegion } from './types.js';

export interface DetectOptions {
  alphaThreshold: number;
  searchWindowRatio: number;
  maxContentRatio: number;
  safeMarginPx: number;
}

export const DEFAULT_DETECT_OPTIONS: DetectOptions = {
  alphaThreshold: IMAGE_CONFIG.alphaThreshold,
  searchWindowRatio: IMAGE_CONFIG.gutterSearchWindow,
  maxContentRatio: IMAGE_CONFIG.gutterMaxContentRatio,
  safeMarginPx: IMAGE_CONFIG.safeMarginPx,
};

/** 単純分割が使えなかった理由。UIには出さず、次の手を決めるために使う。 */
export type SimpleSplitFailure = 'no-gutters' | 'empty-cell';

export type DetectOutcome =
  | { ok: true; result: DetectionResult }
  | { ok: false; reason: SimpleSplitFailure; totalOpaquePixels: number };

/**
 * 整列シート（Type A）から9個を抽出する。
 *
 * 隙間を探して切り、各セルの内容だけをトリムする。
 * 隙間が見つからないシートは Smart Detection（Phase 3）へ回す。
 * PRODUCT_SPEC.md §11.1 / §16 / §77.4。
 */
export function detectAlignedSheet(
  buffer: PixelBuffer,
  options: DetectOptions = DEFAULT_DETECT_OPTIONS,
): DetectOutcome {
  const mask = toAlphaMask(buffer, options.alphaThreshold);
  const profile = computeProfile(mask);
  const sheetBounds: Rect = { x: 0, y: 0, width: mask.width, height: mask.height };

  const lines = findGridLines(mask, profile, {
    searchWindowRatio: options.searchWindowRatio,
    maxContentRatio: options.maxContentRatio,
  });

  if (!lines) {
    return { ok: false, reason: 'no-gutters', totalOpaquePixels: profile.totalOpaque };
  }

  const cells = cellsFromGridLines(mask, lines);

  // 信頼度は他の8個との比較で決めるため、先に9個分の内容範囲を確定させる
  const found: { cellIndex: number; cell: Rect; contentBounds: Rect }[] = [];
  for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
    const cell = cells[cellIndex];
    if (!cell) continue;

    const contentBounds = contentBoundsIn(mask, cell);
    if (!contentBounds) {
      return { ok: false, reason: 'empty-cell', totalOpaquePixels: profile.totalOpaque };
    }
    found.push({ cellIndex, cell, contentBounds });
  }

  const medianArea = median(found.map((f) => f.contentBounds.width * f.contentBounds.height));

  const regions: StickerRegion[] = found.map(({ cellIndex, cell, contentBounds }) => ({
    cellIndex,
    // 安全余白はセルの内側で止める。シート全体まで広げると、隙間が狭いシートで
    // 隣のスタンプの範囲へ食い込む（実測フィクスチャは行の隙間が8pxしかなく、
    // 余白8pxで918px分重なった）。セル境界は空の隙間の中心なので、
    // ここで止めても内容は1画素も失わない。
    bounds: expandRect(contentBounds, options.safeMarginPx, cell),
    contentBounds,
    confidence: confidenceFor(contentBounds, sheetBounds, medianArea),
  }));

  if (regions.length !== STICKERS_PER_SHEET) {
    return { ok: false, reason: 'empty-cell', totalOpaquePixels: profile.totalOpaque };
  }

  return {
    ok: true,
    result: { strategy: 'simple-split', regions, totalOpaquePixels: profile.totalOpaque },
  };
}

/**
 * この抽出をどれだけ信用してよいか。低いものだけユーザーに確認を促す。
 *
 * 隙間が空であることを確認してから切っているため、単純分割では内容の取りこぼしは
 * 起きない。したがって「切断線にどれだけ近いか」は危険信号にならない
 * （実測フィクスチャでは、9個すべて正しく取れているのに2個が低評価になった）。
 *
 * 実際に確認する価値があるのは次の2つ。
 *   1. 他の8個より極端に小さい  → スタンプ本体ではなく破片を拾った可能性
 *   2. シートの外周に接している  → 生成画像そのものが端で切れている可能性
 */
function confidenceFor(content: Rect, sheetBounds: Rect, medianArea: number): number {
  const area = content.width * content.height;
  const areaScore =
    medianArea > 0 && area < medianArea * IMAGE_CONFIG.suspiciousAreaRatio ? 0.3 : 1;
  const edgeScore = touchesEdge(content, sheetBounds) ? 0.6 : 1;
  return Math.round(Math.min(areaScore, edgeScore) * 100) / 100;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}
