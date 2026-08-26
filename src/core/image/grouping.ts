import { STICKERS_PER_SHEET } from '../../config/line-spec.js';
import { rectDistance, unionRect } from './components.js';
import type { ConnectedComponent, Rect } from './types.js';

/** 3 × 3 の想定中心。切断線ではなく、あくまで手がかりとして使う。 */
export interface CellPriors {
  centers: { x: number; y: number }[];
  cellWidth: number;
  cellHeight: number;
}

export interface Group {
  cellIndex: number;
  members: ConnectedComponent[];
  bounds: Rect;
}

export type GroupingFailure = 'empty-cell' | 'too-few-components';

export type GroupingOutcome =
  | { ok: true; groups: Group[] }
  | { ok: false; reason: GroupingFailure };

/**
 * 内容全体の範囲を3 × 3 に割り、9つの想定中心を求める。
 *
 * 画像の寸法ではなく内容の範囲を使うのは、シートの余白が上下左右で
 * 均等とは限らないため（実測シートは上18px・下43pxだった）。
 */
export function computeCellPriors(contentBounds: Rect): CellPriors {
  const cellWidth = contentBounds.width / 3;
  const cellHeight = contentBounds.height / 3;
  const centers: { x: number; y: number }[] = [];

  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      centers.push({
        x: contentBounds.x + cellWidth * (column + 0.5),
        y: contentBounds.y + cellHeight * (row + 0.5),
      });
    }
  }

  return { centers, cellWidth, cellHeight };
}

/**
 * 想定中心に最も近いセルを返す。
 */
export function nearestCell(x: number, y: number, priors: CellPriors): number {
  let best = 0;
  let bestDistance = Infinity;

  priors.centers.forEach((center, index) => {
    const distance = Math.hypot(x - center.x, y - center.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });

  return best;
}

export interface GroupingOptions {
  /**
   * 「どの本体に属するか」を決めるときの、位置ヒントの重み。
   * 0 なら距離だけで決め、大きくするほど3 × 3 の位置を重視する。
   */
  cellPriorWeight: number;
}

export const DEFAULT_GROUPING_OPTIONS: GroupingOptions = { cellPriorWeight: 0.25 };

/**
 * 連結領域を9個のスタンプへまとめる。
 *
 * 手順は2段階。
 *
 * 1. 各セルで一番大きい領域を「本体」とする。9セルすべてに本体が必要。
 * 2. 残りの領域（文字・ハート・効果線など）を、最も近い本体へ寄せる。
 *    このとき距離だけでなく、3 × 3 のどこにあるかも加味する。
 *    実測では装飾のほとんどが本体の範囲に接しているため距離が決め手になるが、
 *    離れている場合に位置ヒントが効く（PRODUCT_SPEC.md §14 / §15）。
 */
export function groupComponents(
  components: ConnectedComponent[],
  priors: CellPriors,
  options: GroupingOptions = DEFAULT_GROUPING_OPTIONS,
): GroupingOutcome {
  if (components.length < STICKERS_PER_SHEET) return { ok: false, reason: 'too-few-components' };

  // 1. セルごとの本体を決める
  const anchors = new Map<number, ConnectedComponent>();
  for (const component of components) {
    const cell = nearestCell(component.centerX, component.centerY, priors);
    const current = anchors.get(cell);
    if (!current || component.area > current.area) anchors.set(cell, component);
  }

  if (anchors.size !== STICKERS_PER_SHEET) return { ok: false, reason: 'empty-cell' };

  // 2. 残りを最も近い本体へ寄せる
  const members = new Map<number, ConnectedComponent[]>();
  for (const [cell, anchor] of anchors) members.set(cell, [anchor]);

  const anchorIds = new Set([...anchors.values()].map((a) => a.id));
  for (const component of components) {
    if (anchorIds.has(component.id)) continue;
    const cell = bestCellFor(component, anchors, priors, options);
    members.get(cell)?.push(component);
  }

  const groups: Group[] = [];
  for (const [cellIndex, list] of members) {
    groups.push({ cellIndex, members: list, bounds: unionRect(list.map((c) => c.bounds)) });
  }
  groups.sort((left, right) => left.cellIndex - right.cellIndex);

  return { ok: true, groups };
}

function bestCellFor(
  component: ConnectedComponent,
  anchors: Map<number, ConnectedComponent>,
  priors: CellPriors,
  options: GroupingOptions,
): number {
  let bestCell = 0;
  let bestScore = Infinity;

  for (const [cell, anchor] of anchors) {
    const center = priors.centers[cell];
    if (!center) continue;

    const distance = rectDistance(component.bounds, anchor.bounds);
    const priorDistance = Math.hypot(component.centerX - center.x, component.centerY - center.y);
    const score = distance + priorDistance * options.cellPriorWeight;

    if (score < bestScore) {
      bestScore = score;
      bestCell = cell;
    }
  }

  return bestCell;
}
