import type { AlphaMask, ConnectedComponent, Rect } from './types.js';

/**
 * つながっている不透明領域をまとめて取り出す（8近傍）。
 *
 * Union-Find による2パス走査。1パス目で暫定ラベルを振りながら同値関係を記録し、
 * 2パス目で代表ラベルへ寄せる。再帰を使わないので、大きな領域でも
 * 呼び出し段数の制限にかからない。
 *
 * ここで得られる1つの領域は、スタンプ1個とは限らない。
 * キャラクター・文字・ハートは物理的に離れていることが多いため、
 * まとめ上げは grouping.ts が行う（PRODUCT_SPEC.md §14）。
 */
export function extractComponents(mask: AlphaMask, minArea: number): ConnectedComponent[] {
  const { data, width, height } = mask;
  const labels = new Int32Array(width * height);
  const parent: number[] = [0]; // 0 は「ラベルなし」
  let nextLabel = 1;

  const find = (label: number): number => {
    let root = label;
    while ((parent[root] ?? root) !== root) root = parent[root] ?? root;
    // 経路圧縮
    let current = label;
    while ((parent[current] ?? current) !== current) {
      const next = parent[current] ?? current;
      parent[current] = root;
      current = next;
    }
    return root;
  };

  const union = (a: number, b: number): void => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[Math.max(rootA, rootB)] = Math.min(rootA, rootB);
  };

  // 1パス目: 左・左上・上・右上を見て、既にラベルがあれば引き継ぐ
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if ((data[index] ?? 0) === 0) continue;

      let smallest = 0;
      const neighbours: number[] = [];
      const push = (nx: number, ny: number): void => {
        if (nx < 0 || nx >= width || ny < 0) return;
        const label = labels[ny * width + nx] ?? 0;
        if (label !== 0) neighbours.push(label);
      };
      push(x - 1, y);
      push(x - 1, y - 1);
      push(x, y - 1);
      push(x + 1, y - 1);

      for (const label of neighbours) {
        const root = find(label);
        if (smallest === 0 || root < smallest) smallest = root;
      }

      if (smallest === 0) {
        smallest = nextLabel++;
        parent[smallest] = smallest;
      }
      labels[index] = smallest;
      for (const label of neighbours) union(smallest, label);
    }
  }

  // 2パス目: 代表ラベルごとに範囲と重心を集計
  interface Accumulator {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    area: number;
    sumX: number;
    sumY: number;
  }
  const accumulators = new Map<number, Accumulator>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const label = labels[index] ?? 0;
      if (label === 0) continue;

      const root = find(label);
      labels[index] = root;

      const found = accumulators.get(root);
      if (found) {
        if (x < found.minX) found.minX = x;
        if (x > found.maxX) found.maxX = x;
        if (y < found.minY) found.minY = y;
        if (y > found.maxY) found.maxY = y;
        found.area++;
        found.sumX += x;
        found.sumY += y;
      } else {
        accumulators.set(root, { minX: x, minY: y, maxX: x, maxY: y, area: 1, sumX: x, sumY: y });
      }
    }
  }

  const components: ConnectedComponent[] = [];
  for (const [id, a] of accumulators) {
    if (a.area < minArea) continue;
    components.push({
      id,
      bounds: { x: a.minX, y: a.minY, width: a.maxX - a.minX + 1, height: a.maxY - a.minY + 1 },
      area: a.area,
      centerX: a.sumX / a.area,
      centerY: a.sumY / a.area,
    });
  }

  // 大きいものから。以降の処理で「本体」を先に扱えるようにする
  components.sort((left, right) => right.area - left.area);
  return components;
}

/** 2つの矩形の最短距離。触れていれば0。 */
export function rectDistance(a: Rect, b: Rect): number {
  const dx = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)));
  const dy = Math.max(0, Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height)));
  return Math.hypot(dx, dy);
}

/** 複数の矩形をすべて含む矩形。 */
export function unionRect(rects: Rect[]): Rect {
  const first = rects[0];
  if (!first) return { x: 0, y: 0, width: 0, height: 0 };

  let minX = first.x;
  let minY = first.y;
  let maxX = first.x + first.width;
  let maxY = first.y + first.height;

  for (const rect of rects) {
    if (rect.x < minX) minX = rect.x;
    if (rect.y < minY) minY = rect.y;
    if (rect.x + rect.width > maxX) maxX = rect.x + rect.width;
    if (rect.y + rect.height > maxY) maxY = rect.y + rect.height;
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
