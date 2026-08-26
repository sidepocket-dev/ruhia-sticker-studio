import type { PixelBuffer } from './types.js';

/**
 * 背景を抜いて透過にする（PRODUCT_SPEC.md §9）。
 *
 * 「白い画素をすべて透明にする」ではなく、**外側からつながっている背景だけ**を抜く。
 * 全体の色で判定すると、キャラクターの中の白（目の白目、白い模様）や
 * 白いステッカー縁まで消えてしまう。外側から届く範囲に限れば、
 * 囲まれた白は残る。
 *
 * 背景色は画像の縁から拾う。「白」と決め打ちしない。
 * 生成画像の背景は薄いグレーやクリーム色のこともある。
 *
 * 背景色を2色まで受け入れるのは、透過に見せかけた市松模様が
 * 描かれている画像があるため。2色を背景として扱えば、模様のまま抜ける。
 *
 * 白いステッカー縁の復元はしない。背景が不透明な画像では、白い縁と白い背景は
 * 同じ色でつながっており、色だけでは区別できない。縁は生成時のプロンプトで
 * 付けてもらう（sticker-prompt.ts 参照）。抜いたあとに描き戻す方式も試したが、
 * 戻しすぎると隣のスタンプとつながって分離できなくなり、適量の判定も
 * シートごとに変わるため採用しない。
 */

export interface BackgroundOptions {
  /** 背景色とみなす色の差の許容値（0-255のユークリッド距離） */
  tolerance: number;
  /** 背景として扱う色の数。市松模様に対応するため2 */
  maxColors: number;
  /** 縁をなじませる幅。0だとギザつく */
  feather: number;
  /** これ未満のアルファは、すでに透明として扱う */
  alphaThreshold: number;
}

export const DEFAULT_BACKGROUND_OPTIONS: BackgroundOptions = {
  tolerance: 26,
  maxColors: 2,
  feather: 26,
  alphaThreshold: 16,
};

export type BackgroundWarning =
  | 'almost-everything-removed'
  | 'almost-nothing-removed'
  | 'light-outline-risk';

export interface BackgroundResult {
  buffer: PixelBuffer;
  /** 透明にした画素の割合 */
  removedRatio: number;
  /** 背景と判定した色 */
  colors: [number, number, number][];
  warnings: BackgroundWarning[];
}

type Color = [number, number, number];

function distance(data: Uint8ClampedArray, index: number, color: Color): number {
  const dr = (data[index] ?? 0) - color[0];
  const dg = (data[index + 1] ?? 0) - color[1];
  const db = (data[index + 2] ?? 0) - color[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * 画像の縁から背景色を拾う。
 *
 * 最も多い色をまず取り、それと十分に離れた色が縁の15%以上を占めるなら
 * 2色目として採用する（市松模様の想定）。
 */
export function sampleBackgroundColors(
  buffer: PixelBuffer,
  options: BackgroundOptions,
): Color[] {
  const { data, width, height } = buffer;
  const ring = Math.max(2, Math.round(Math.min(width, height) * 0.004));
  const buckets = new Map<number, { count: number; sum: [number, number, number] }>();
  let sampled = 0;

  const take = (x: number, y: number): void => {
    const index = (y * width + x) * 4;
    if ((data[index + 3] ?? 0) < options.alphaThreshold) return;
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    // 近い色をまとめて数える
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const found = buckets.get(key);
    if (found) {
      found.count++;
      found.sum[0] += r;
      found.sum[1] += g;
      found.sum[2] += b;
    } else {
      buckets.set(key, { count: 1, sum: [r, g, b] });
    }
    sampled++;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < ring; x++) take(x, y);
    for (let x = Math.max(ring, width - ring); x < width; x++) take(x, y);
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < ring; y++) take(x, y);
    for (let y = Math.max(ring, height - ring); y < height; y++) take(x, y);
  }

  if (sampled === 0) return [];

  const sorted = [...buckets.values()]
    .map((bucket) => ({
      count: bucket.count,
      color: bucket.sum.map((value) => Math.round(value / bucket.count)) as Color,
    }))
    .sort((left, right) => right.count - left.count);

  const first = sorted[0];
  if (!first) return [];
  const colors: Color[] = [first.color];

  for (const candidate of sorted.slice(1)) {
    if (colors.length >= options.maxColors) break;
    if (candidate.count / sampled < 0.15) break;
    const far = colors.every(
      (color) =>
        Math.hypot(
          candidate.color[0] - color[0],
          candidate.color[1] - color[1],
          candidate.color[2] - color[2],
        ) > options.tolerance * 2,
    );
    if (far) colors.push(candidate.color);
  }

  return colors;
}

/**
 * 外側からつながっている背景を抜く。
 *
 * 縁のどこからでも入れる場所を起点に塗り広げる。
 * 再帰は使わない（大きな画像で呼び出し段数の制限にかかる）。
 */
export function removeBackground(
  buffer: PixelBuffer,
  options: BackgroundOptions = DEFAULT_BACKGROUND_OPTIONS,
): BackgroundResult {
  const { width, height } = buffer;
  const colors = sampleBackgroundColors(buffer, options);
  const data = new Uint8ClampedArray(buffer.data);
  const result: BackgroundResult = {
    buffer: { data, width, height },
    removedRatio: 0,
    colors,
    warnings: [],
  };
  if (colors.length === 0) return result;

  const nearestDistance = (index: number): number => {
    let best = Infinity;
    for (const color of colors) {
      const value = distance(data, index, color);
      if (value < best) best = value;
    }
    return best;
  };

  const isBackgroundColor = (index: number): boolean =>
    (data[index + 3] ?? 0) < options.alphaThreshold || nearestDistance(index) <= options.tolerance;

  // 0 = 未訪問, 1 = 背景
  const marks = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let top = 0;

  const push = (x: number, y: number): void => {
    const cell = y * width + x;
    if (marks[cell] === 1) return;
    if (!isBackgroundColor(cell * 4)) return;
    marks[cell] = 1;
    stack[top++] = cell;
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  let removed = 0;
  while (top > 0) {
    const cell = stack[--top] ?? 0;
    removed++;
    const x = cell % width;
    const y = (cell - x) / width;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }

  // 背景を透明にする
  for (let cell = 0; cell < marks.length; cell++) {
    if (marks[cell] === 1) data[cell * 4 + 3] = 0;
  }

  // 縁をなじませる。
  //
  // 元画像が透過だったものを不透明な背景へ焼き込むと、輪郭に1〜2画素の
  // 中間色の帯ができる。そこを背景色との近さに応じて半透明にする。
  // 背景から数えて2画素までに限るのは、キャラクターの中の淡い色を
  // 誤って透明にしないため（PRODUCT_SPEC.md §9.3）。
  if (options.feather > 0) {
    const softened: { cell: number; alpha: number }[] = [];
    let ring: number[] = [];
    const seen = new Uint8Array(width * height);

    const collect = (from: number[]): number[] => {
      const next: number[] = [];
      for (const cell of from) {
        const x = cell % width;
        const y = (cell - x) / width;
        const neighbours = [
          x > 0 ? cell - 1 : -1,
          x < width - 1 ? cell + 1 : -1,
          y > 0 ? cell - width : -1,
          y < height - 1 ? cell + width : -1,
        ];
        for (const neighbour of neighbours) {
          if (neighbour < 0) continue;
          if (marks[neighbour] === 1) continue;
          if (seen[neighbour] === 1) continue;
          seen[neighbour] = 1;
          next.push(neighbour);
        }
      }
      return next;
    };

    // 抜いた範囲そのものを起点にする
    const removedCells: number[] = [];
    for (let cell = 0; cell < marks.length; cell++) {
      if (marks[cell] === 1) removedCells.push(cell);
    }
    ring = collect(removedCells);

    for (let step = 0; step < 2 && ring.length > 0; step++) {
      for (const cell of ring) {
        const value = nearestDistance(cell * 4);
        if (value >= options.tolerance + options.feather) continue;
        const ratio = (value - options.tolerance) / options.feather;
        const alpha = Math.max(0, Math.min(255, Math.round(255 * ratio)));
        if (alpha < (data[cell * 4 + 3] ?? 0)) softened.push({ cell, alpha });
      }
      ring = collect(ring);
    }

    for (const item of softened) data[item.cell * 4 + 3] = item.alpha;
  }

  result.removedRatio = removed / (width * height);

  if (result.removedRatio > 0.97) result.warnings.push('almost-everything-removed');
  if (result.removedRatio < 0.02) result.warnings.push('almost-nothing-removed');
  // 背景が明るいと、白いステッカー縁と見分けがつかず一緒に消える恐れがある
  if (colors.some((color) => Math.min(...color) > 235)) {
    result.warnings.push('light-outline-risk');
  }

  return result;
}
