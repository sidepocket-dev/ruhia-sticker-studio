import { describe, expect, it } from 'vitest';
import { toAlphaMask } from '../../src/core/image/alpha-mask.js';
import { extractComponents, rectDistance, unionRect } from '../../src/core/image/components.js';
import { makeSheet } from '../helpers/make-sheet.js';

const maskOf = (shapes: { x: number; y: number; width: number; height: number }[], size = 200) =>
  toAlphaMask(makeSheet(size, size, shapes), 16);

describe('連結領域の抽出', () => {
  it('離れた領域を別々に数える', () => {
    const components = extractComponents(
      maskOf([
        { x: 10, y: 10, width: 20, height: 20 },
        { x: 100, y: 100, width: 30, height: 30 },
      ]),
      1,
    );
    expect(components).toHaveLength(2);
  });

  it('接している領域をひとつにまとめる', () => {
    const components = extractComponents(
      maskOf([
        { x: 10, y: 10, width: 20, height: 20 },
        { x: 30, y: 10, width: 20, height: 20 },
      ]),
      1,
    );
    expect(components).toHaveLength(1);
    expect(components[0]?.bounds).toEqual({ x: 10, y: 10, width: 40, height: 20 });
  });

  it('斜めに接していてもひとつにまとめる（8近傍）', () => {
    const components = extractComponents(
      maskOf([
        { x: 10, y: 10, width: 10, height: 10 },
        { x: 20, y: 20, width: 10, height: 10 },
      ]),
      1,
    );
    expect(components).toHaveLength(1);
  });

  it('コの字型のように回り込んだ形もひとつにまとめる', () => {
    const components = extractComponents(
      maskOf([
        { x: 20, y: 20, width: 60, height: 8 },
        { x: 20, y: 20, width: 8, height: 60 },
        { x: 20, y: 72, width: 60, height: 8 },
      ]),
      1,
    );
    expect(components).toHaveLength(1);
    expect(components[0]?.bounds).toEqual({ x: 20, y: 20, width: 60, height: 60 });
  });

  it('面積の小さい領域を取り除ける', () => {
    const components = extractComponents(
      maskOf([
        { x: 10, y: 10, width: 40, height: 40 },
        { x: 100, y: 100, width: 3, height: 3 },
      ]),
      100,
    );
    expect(components).toHaveLength(1);
    expect(components[0]?.area).toBe(1600);
  });

  it('大きいものから順に並ぶ', () => {
    const components = extractComponents(
      maskOf([
        { x: 10, y: 10, width: 10, height: 10 },
        { x: 60, y: 60, width: 40, height: 40 },
        { x: 140, y: 140, width: 20, height: 20 },
      ]),
      1,
    );
    expect(components.map((c) => c.area)).toEqual([1600, 400, 100]);
  });

  it('重心を求める', () => {
    const components = extractComponents(maskOf([{ x: 20, y: 40, width: 10, height: 10 }]), 1);
    expect(components[0]?.centerX).toBeCloseTo(24.5, 1);
    expect(components[0]?.centerY).toBeCloseTo(44.5, 1);
  });

  it('内容が無ければ空を返す', () => {
    expect(extractComponents(maskOf([]), 1)).toEqual([]);
  });
});

describe('矩形の距離', () => {
  const base = { x: 0, y: 0, width: 10, height: 10 };

  it('離れていれば距離を返す', () => {
    expect(rectDistance(base, { x: 20, y: 0, width: 10, height: 10 })).toBe(10);
  });

  it('重なっていれば0', () => {
    expect(rectDistance(base, { x: 5, y: 5, width: 10, height: 10 })).toBe(0);
  });

  it('斜めに離れていれば斜辺の長さ', () => {
    expect(rectDistance(base, { x: 13, y: 14, width: 10, height: 10 })).toBeCloseTo(5, 5);
  });
});

describe('矩形の合成', () => {
  it('すべてを含む矩形を返す', () => {
    expect(
      unionRect([
        { x: 10, y: 20, width: 10, height: 10 },
        { x: 50, y: 5, width: 10, height: 10 },
      ]),
    ).toEqual({ x: 10, y: 5, width: 50, height: 25 });
  });

  it('空なら大きさ0', () => {
    expect(unionRect([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});
