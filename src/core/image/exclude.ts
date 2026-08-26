import type { Rect } from './types.js';

/**
 * ある切り出し範囲の中にある、別のスタンプの画素を消すための矩形を作る。
 *
 * 白フチ付きのシートでは1スタンプが1つの連結領域になるため、
 * 範囲どうしが数行だけ噛み合うことがある。実測したシートでは、
 * 「めっちゃうれしい」の足先と「準備するね」の吹き出しの上端が
 * 6行ぶん重なり、切り出し画像の下端に吹き出しの輪郭が526画素写り込んだ。
 *
 * 矩形では消せない（相手のスタンプ全体が1つの領域なので、
 * その外接矩形を消すと自分の内容まで削れる）。そこで画素の所属を見て、
 * 消すべき画素だけを行ごとの帯として取り出す。
 *
 * 帯は上下に連続していればまとめる。実測では6行 → 数個の矩形に収まる。
 */
export function buildExcludeRects(
  labels: Int32Array,
  sheetWidth: number,
  region: Rect,
  ownLabels: ReadonlySet<number>,
): Rect[] {
  const rects: Rect[] = [];
  const x1 = region.x + region.width;
  const y1 = region.y + region.height;

  // 1行ぶんの「消す区間」を集めながら、前の行と同じなら伸ばす
  let pending: Rect[] = [];

  for (let y = region.y; y < y1; y++) {
    const spans: { start: number; end: number }[] = [];
    let start = -1;

    for (let x = region.x; x <= x1; x++) {
      const label = x < x1 ? (labels[y * sheetWidth + x] ?? 0) : 0;
      const foreign = label !== 0 && !ownLabels.has(label);

      if (foreign && start < 0) start = x;
      if (!foreign && start >= 0) {
        spans.push({ start, end: x });
        start = -1;
      }
    }

    const sameAsPending =
      pending.length === spans.length &&
      pending.every((rect, index) => {
        const span = spans[index];
        return span !== undefined && rect.x === span.start && rect.width === span.end - span.start;
      });

    if (sameAsPending && pending.length > 0) {
      for (const rect of pending) rect.height++;
      continue;
    }

    rects.push(...pending);
    pending = spans.map((span) => ({
      x: span.start,
      y,
      width: span.end - span.start,
      height: 1,
    }));
  }

  rects.push(...pending);
  return rects;
}
