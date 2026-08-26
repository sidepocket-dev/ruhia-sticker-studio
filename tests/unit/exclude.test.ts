import { describe, expect, it } from 'vitest';
import { buildExcludeRects } from '../../src/core/image/exclude.js';
import type { Rect } from '../../src/core/image/types.js';

/** 幅 width の所属マップを、行ごとの文字列から作る。'.'=なし、数字=その番号 */
function labelsFrom(rows: string[]): { labels: Int32Array; width: number } {
  const width = rows[0]?.length ?? 0;
  const labels = new Int32Array(width * rows.length);
  rows.forEach((row, y) => {
    [...row].forEach((char, x) => {
      labels[y * width + x] = char === '.' ? 0 : Number(char);
    });
  });
  return { labels, width };
}

const area = (rects: Rect[]): number =>
  rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);

describe('別のスタンプを消す矩形', () => {
  it('自分だけなら何も消さない', () => {
    const { labels, width } = labelsFrom(['.111.', '.111.', '.....']);
    expect(buildExcludeRects(labels, width, { x: 0, y: 0, width: 5, height: 3 }, new Set([1]))).toEqual(
      [],
    );
  });

  it('別の番号の画素だけを消す', () => {
    const { labels, width } = labelsFrom(['.1122', '.1122', '.....']);
    const rects = buildExcludeRects(labels, width, { x: 0, y: 0, width: 5, height: 3 }, new Set([1]));
    expect(area(rects)).toBe(4);
    expect(rects).toEqual([{ x: 3, y: 0, width: 2, height: 2 }]);
  });

  it('上下に続く同じ形をひとつの矩形にまとめる', () => {
    const { labels, width } = labelsFrom(['.2222', '.2222', '.2222']);
    const rects = buildExcludeRects(labels, width, { x: 0, y: 0, width: 5, height: 3 }, new Set([1]));
    expect(rects).toEqual([{ x: 1, y: 0, width: 4, height: 3 }]);
  });

  it('1行の中に離れた区間があっても両方消す', () => {
    const { labels, width } = labelsFrom(['2.1.2']);
    const rects = buildExcludeRects(labels, width, { x: 0, y: 0, width: 5, height: 1 }, new Set([1]));
    expect(rects).toHaveLength(2);
    expect(area(rects)).toBe(2);
  });

  it('形が変わったら矩形を分ける', () => {
    const { labels, width } = labelsFrom(['.222.', '..22.', '.....']);
    const rects = buildExcludeRects(labels, width, { x: 0, y: 0, width: 5, height: 3 }, new Set([1]));
    expect(rects).toEqual([
      { x: 1, y: 0, width: 3, height: 1 },
      { x: 2, y: 1, width: 2, height: 1 },
    ]);
  });

  it('指定した範囲の外は見ない', () => {
    const { labels, width } = labelsFrom(['22222', '.111.', '22222']);
    const rects = buildExcludeRects(labels, width, { x: 0, y: 1, width: 5, height: 1 }, new Set([1]));
    expect(rects).toEqual([]);
  });

  it('自分の番号が複数あってもまとめて扱える', () => {
    // 本体と装飾で番号が分かれている場合
    const { labels, width } = labelsFrom(['1.3.2']);
    const rects = buildExcludeRects(labels, width, { x: 0, y: 0, width: 5, height: 1 }, new Set([1, 3]));
    expect(rects).toEqual([{ x: 4, y: 0, width: 1, height: 1 }]);
  });
});
