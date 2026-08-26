import { IMAGE_CONFIG } from '../../config/app-config.js';
import { STICKERS_PER_SHEET } from '../../config/line-spec.js';
import { toAlphaMask } from './alpha-mask.js';
import { labelComponents } from './components.js';
import { buildExcludeRects } from './exclude.js';
import { cellsFromGridLines, findGridLines } from './gutter-split.js';
import { computeCellPriors, groupComponents } from './grouping.js';
import { computeProfile } from './profile.js';
import {
  contentBoundsIn,
  expandRect,
  intersectionArea,
  rectSeparation,
  touchesEdge,
} from './trim.js';
import type { AlphaMask, DetectionResult, PixelBuffer, Rect, StickerRegion } from './types.js';

export interface DetectOptions {
  alphaThreshold: number;
  searchWindowRatio: number;
  maxContentRatio: number;
  safeMarginPx: number;
  minComponentAreaRatio: number;
}

export const DEFAULT_DETECT_OPTIONS: DetectOptions = {
  alphaThreshold: IMAGE_CONFIG.alphaThreshold,
  searchWindowRatio: IMAGE_CONFIG.gutterSearchWindow,
  maxContentRatio: IMAGE_CONFIG.gutterMaxContentRatio,
  safeMarginPx: IMAGE_CONFIG.safeMarginPx,
  minComponentAreaRatio: IMAGE_CONFIG.minComponentAreaRatio,
};

/** 抽出できなかった理由。UIには出さず、次にどうするかを決めるために使う。 */
export type DetectFailure = 'no-content' | 'empty-cell' | 'too-few-components';

export type DetectOutcome =
  | { ok: true; result: DetectionResult }
  | { ok: false; reason: DetectFailure; totalOpaquePixels: number };

/**
 * シートから9個のスタンプを取り出す。
 *
 * まず単純分割（透明な隙間で切る）を試し、成立しなければ
 * 連結領域のまとめ上げへ切り替える。ユーザーにどちらを使うかは尋ねない
 * （PRODUCT_SPEC.md §16）。
 */
export function detectStickers(
  buffer: PixelBuffer,
  options: DetectOptions = DEFAULT_DETECT_OPTIONS,
): DetectOutcome {
  const mask = toAlphaMask(buffer, options.alphaThreshold);
  const profile = computeProfile(mask);

  const simple = trySimpleSplit(mask, profile.totalOpaque, options);
  if (simple) {
    return { ok: true, result: simple };
  }

  return trySmartDetection(mask, profile.totalOpaque, options);
}

/** 整列シート向け。隙間が見つからなければ null を返す。 */
export function trySimpleSplit(
  mask: AlphaMask,
  totalOpaque: number,
  options: DetectOptions,
): DetectionResult | null {
  const profile = computeProfile(mask);
  const lines = findGridLines(mask, profile, {
    searchWindowRatio: options.searchWindowRatio,
    maxContentRatio: options.maxContentRatio,
  });
  if (!lines) return null;

  const sheetBounds: Rect = { x: 0, y: 0, width: mask.width, height: mask.height };
  const cells = cellsFromGridLines(mask, lines);

  const found: { cellIndex: number; cell: Rect; contentBounds: Rect }[] = [];
  for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
    const cell = cells[cellIndex];
    if (!cell) continue;
    const contentBounds = contentBoundsIn(mask, cell);
    if (!contentBounds) return null;
    found.push({ cellIndex, cell, contentBounds });
  }
  if (found.length !== STICKERS_PER_SHEET) return null;

  const medianArea = median(found.map((f) => f.contentBounds.width * f.contentBounds.height));

  const regions: StickerRegion[] = found.map(({ cellIndex, cell, contentBounds }) => ({
    cellIndex,
    // 安全余白はセルの内側で止める。シート全体まで広げると、隙間が狭いシートで
    // 隣のスタンプの範囲へ食い込む（実測シートは行の隙間が8pxしかなく、
    // 余白8pxで918px分重なった）。セル境界は空の隙間の中心なので、
    // ここで止めても内容は1画素も失わない。
    bounds: expandRect(contentBounds, options.safeMarginPx, cell),
    contentBounds,
    confidence: confidenceFor(contentBounds, sheetBounds, medianArea),
  }));

  return { strategy: 'simple-split', regions, totalOpaquePixels: totalOpaque };
}

/**
 * 自由配置シート向け。連結領域を9個へまとめる。
 *
 * 実測では、白フチ付きのシートは1スタンプが1つの連結領域になり、
 * 白フチの無いシートは本体＋装飾で複数の領域に分かれた。どちらも
 * 「セルごとの本体を決めて、残りを最も近い本体へ寄せる」で扱える。
 */
export function trySmartDetection(
  mask: AlphaMask,
  totalOpaque: number,
  options: DetectOptions,
): DetectOutcome {
  const sheetBounds: Rect = { x: 0, y: 0, width: mask.width, height: mask.height };
  const contentBounds = contentBoundsIn(mask, sheetBounds);
  if (!contentBounds) return { ok: false, reason: 'no-content', totalOpaquePixels: totalOpaque };

  const minArea = Math.max(
    1,
    Math.round(mask.width * mask.height * options.minComponentAreaRatio),
  );
  const { components, labels } = labelComponents(mask, minArea);
  const priors = computeCellPriors(contentBounds);
  const outcome = groupComponents(components, priors);

  if (!outcome.ok) {
    return {
      ok: false,
      reason: outcome.reason === 'empty-cell' ? 'empty-cell' : 'too-few-components',
      totalOpaquePixels: totalOpaque,
    };
  }

  const rawBounds = outcome.groups.map((group) => group.bounds);
  const medianArea = median(rawBounds.map((b) => b.width * b.height));

  const regions: StickerRegion[] = outcome.groups.map((group, index) => {
    // 安全余白は、隣のスタンプの範囲へ入らない分だけ足す
    const others = rawBounds.filter((_, other) => other !== index);
    const margin = safeMarginWithout(group.bounds, others, options.safeMarginPx);
    const bounds = expandRect(group.bounds, margin, sheetBounds);

    const region: StickerRegion = {
      cellIndex: group.cellIndex,
      bounds,
      contentBounds: group.bounds,
      confidence: smartConfidenceFor(group.bounds, others, sheetBounds, medianArea),
    };

    // 範囲が噛み合っている場合だけ、相手の画素を消す矩形を作る
    if (others.some((other) => intersectionArea(bounds, other) > 0)) {
      const ownLabels = new Set(group.members.map((member) => member.id));
      const excludeRects = buildExcludeRects(labels, mask.width, bounds, ownLabels);
      if (excludeRects.length > 0) region.excludeRects = excludeRects;
    }

    return region;
  });

  return {
    ok: true,
    result: { strategy: 'smart-detection', regions, totalOpaquePixels: totalOpaque },
  };
}

/**
 * 隣と重ならない範囲で、足せるだけ安全余白を足す。
 *
 * 隣の「元の範囲」ではなく「隙間の半分」を上限にするのが要点。
 * 両側が同じ隙間へ伸びるため、片側だけを見て決めると足し合わせで食い込む
 * （実測シートでは、1pxしか空いていない境目に両側から8pxずつ伸びて697px重なった）。
 * 隙間は左右で分け合う。
 */
function safeMarginWithout(bounds: Rect, others: Rect[], desired: number): number {
  let margin = desired;
  for (const other of others) {
    margin = Math.min(margin, Math.floor(rectSeparation(bounds, other) / 2));
  }
  return Math.max(0, margin);
}

/**
 * 単純分割の信頼度。
 *
 * 隙間が空であることを確認してから切っているため、内容の取りこぼしは起きない。
 * したがって「切断線にどれだけ近いか」は危険信号にならない。
 * 実際に確認する価値があるのは次の2つ。
 *   1. 他の8個より極端に小さい  → スタンプ本体ではなく破片を拾った可能性
 *   2. シートの外周に接している  → 生成画像そのものが端で切れている可能性
 */
function confidenceFor(content: Rect, sheetBounds: Rect, medianArea: number): number {
  const area = content.width * content.height;
  const areaScore =
    medianArea > 0 && area < medianArea * IMAGE_CONFIG.suspiciousAreaRatio ? 0.3 : 1;
  const edgeScore = touchesEdge(content, sheetBounds) ? 0.6 : 1;
  return round2(Math.min(areaScore, edgeScore));
}

/**
 * まとめ上げの信頼度。
 *
 * 単純分割の条件に加えて、範囲どうしの重なりを見る。
 * 重なっているということは、隣のスタンプの一部が写り込むということ。
 */
function smartConfidenceFor(
  bounds: Rect,
  others: Rect[],
  sheetBounds: Rect,
  medianArea: number,
): number {
  const base = confidenceFor(bounds, sheetBounds, medianArea);
  const area = bounds.width * bounds.height;
  const overlap = others.reduce((sum, other) => sum + intersectionArea(bounds, other), 0);
  const overlapRatio = area > 0 ? overlap / area : 0;

  if (overlapRatio === 0) return base;
  // 少しの重なりでも確認する価値がある
  return round2(Math.min(base, Math.max(0, 1 - overlapRatio * 8)));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}
