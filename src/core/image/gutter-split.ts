import type { AlphaMask, AlphaProfile } from './types.js';

/** 見つかった隙間ひとつ分。 */
export interface Gutter {
  /** 切断位置（隙間の中心） */
  center: number;
  /** 隙間の幅（画素） */
  width: number;
  /** 隙間の始端・終端 */
  start: number;
  end: number;
}

export interface GridLines {
  /** 縦の切断位置2本（左から） */
  columns: [Gutter, Gutter];
  /** 横の切断位置2本（上から） */
  rows: [Gutter, Gutter];
}

export interface FindGridLinesOptions {
  /** 探索窓の広さ。画像の幅・高さに対する比率。 */
  searchWindowRatio: number;
  /** 「隙間」とみなす、その行/列の不透明画素数の上限比率。 */
  maxContentRatio: number;
}

/**
 * プロファイルの中から、target の周辺で最も広い「空の区間」を探す。
 *
 * 単純に長さを3等分しないのは、AI生成シートの隙間が均等な位置に無いため。
 * 実測したフィクスチャでは、均等分割の位置から最大14pxずれており、
 * 行の隙間は幅8pxしか無かった。ずれた位置で切ると内容が切れる。
 *
 * @param profile      行または列ごとの不透明画素数
 * @param target       期待する切断位置（長さの1/3, 2/3）
 * @param windowRadius target からこの距離までを探索する
 * @param emptyLimit   この値以下なら「空」とみなす
 */
export function findGutter(
  profile: Int32Array,
  target: number,
  windowRadius: number,
  emptyLimit: number,
): Gutter | null {
  const from = Math.max(0, Math.round(target - windowRadius));
  const to = Math.min(profile.length - 1, Math.round(target + windowRadius));

  let best: Gutter | null = null;
  let runStart = -1;

  const closeRun = (endInclusive: number): void => {
    if (runStart < 0) return;
    const width = endInclusive - runStart + 1;
    const center = Math.round((runStart + endInclusive) / 2);
    const candidate: Gutter = { center, width, start: runStart, end: endInclusive };

    if (best === null || isBetterGutter(candidate, best, target)) best = candidate;
    runStart = -1;
  };

  for (let i = from; i <= to; i++) {
    const isEmpty = (profile[i] ?? 0) <= emptyLimit;
    if (isEmpty && runStart < 0) runStart = i;
    if (!isEmpty) closeRun(i - 1);
  }
  closeRun(to);

  return best;
}

/**
 * 広い隙間を優先する。同じくらいの広さなら、期待位置に近い方を選ぶ。
 *
 * 広さを優先するのは、狭い隙間の中心で切ると、少しの誤差で内容を削るため。
 */
function isBetterGutter(candidate: Gutter, current: Gutter, target: number): boolean {
  if (candidate.width !== current.width) return candidate.width > current.width;
  return Math.abs(candidate.center - target) < Math.abs(current.center - target);
}

/**
 * 3 × 3 の切断線4本（縦2・横2）を探す。
 * どれか1本でも見つからなければ null を返す（単純分割では切れないシート）。
 */
export function findGridLines(
  mask: AlphaMask,
  profile: AlphaProfile,
  options: FindGridLinesOptions,
): GridLines | null {
  const { width, height } = mask;

  const columnLimit = Math.floor(height * options.maxContentRatio);
  const rowLimit = Math.floor(width * options.maxContentRatio);
  const columnRadius = width * options.searchWindowRatio;
  const rowRadius = height * options.searchWindowRatio;

  const c1 = findGutter(profile.columns, width / 3, columnRadius, columnLimit);
  const c2 = findGutter(profile.columns, (width * 2) / 3, columnRadius, columnLimit);
  const r1 = findGutter(profile.rows, height / 3, rowRadius, rowLimit);
  const r2 = findGutter(profile.rows, (height * 2) / 3, rowRadius, rowLimit);

  if (!c1 || !c2 || !r1 || !r2) return null;
  // 2本が同じ隙間を指したら、3 × 3 として成立していない
  if (c1.center >= c2.center || r1.center >= r2.center) return null;

  return { columns: [c1, c2], rows: [r1, r2] };
}

/** 切断線から9セルの境界を組み立てる。0 = 左上、8 = 右下。 */
export function cellsFromGridLines(
  mask: AlphaMask,
  lines: GridLines,
): { x: number; y: number; width: number; height: number }[] {
  const xEdges = [0, lines.columns[0].center, lines.columns[1].center, mask.width];
  const yEdges = [0, lines.rows[0].center, lines.rows[1].center, mask.height];
  const cells: { x: number; y: number; width: number; height: number }[] = [];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = xEdges[col] ?? 0;
      const y = yEdges[row] ?? 0;
      cells.push({
        x,
        y,
        width: (xEdges[col + 1] ?? mask.width) - x,
        height: (yEdges[row + 1] ?? mask.height) - y,
      });
    }
  }

  return cells;
}
