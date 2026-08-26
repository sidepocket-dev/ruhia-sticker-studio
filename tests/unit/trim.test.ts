import { describe, expect, it } from 'vitest';
import { toAlphaMask } from '../../src/core/image/alpha-mask.js';
import { contentBoundsIn, expandRect, intersectionArea, touchesEdge } from '../../src/core/image/trim.js';
import { makeSheet } from '../helpers/make-sheet.js';

const SHEET: { x: number; y: number; width: number; height: number } = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
};

describe('内容の外接矩形', () => {
  it('透明な余白を除いた範囲を返す', () => {
    const mask = toAlphaMask(makeSheet(100, 100, [{ x: 20, y: 30, width: 10, height: 5 }]), 16);
    expect(contentBoundsIn(mask, SHEET)).toEqual({ x: 20, y: 30, width: 10, height: 5 });
  });

  it('内容が無ければ null', () => {
    const mask = toAlphaMask(makeSheet(100, 100, []), 16);
    expect(contentBoundsIn(mask, SHEET)).toBeNull();
  });

  it('指定した領域の外は見ない', () => {
    const mask = toAlphaMask(
      makeSheet(100, 100, [
        { x: 5, y: 5, width: 5, height: 5 },
        { x: 60, y: 60, width: 10, height: 10 },
      ]),
      16,
    );
    const bounds = contentBoundsIn(mask, { x: 50, y: 50, width: 50, height: 50 });
    expect(bounds).toEqual({ x: 60, y: 60, width: 10, height: 10 });
  });

  it('閾値未満のアルファは内容として数えない', () => {
    const buffer = makeSheet(100, 100, [
      { x: 10, y: 10, width: 4, height: 4, alpha: 8 },
      { x: 50, y: 50, width: 4, height: 4, alpha: 250 },
    ]);
    expect(contentBoundsIn(toAlphaMask(buffer, 16), SHEET)).toEqual({
      x: 50,
      y: 50,
      width: 4,
      height: 4,
    });
  });
});

describe('安全余白の付加', () => {
  it('四方に広げる', () => {
    expect(expandRect({ x: 20, y: 20, width: 10, height: 10 }, 5, SHEET)).toEqual({
      x: 15,
      y: 15,
      width: 20,
      height: 20,
    });
  });

  it('シートの外へははみ出さない', () => {
    expect(expandRect({ x: 2, y: 2, width: 10, height: 10 }, 5, SHEET)).toEqual({
      x: 0,
      y: 0,
      width: 17,
      height: 17,
    });
    expect(expandRect({ x: 90, y: 90, width: 10, height: 10 }, 5, SHEET)).toEqual({
      x: 85,
      y: 85,
      width: 15,
      height: 15,
    });
  });
});

describe('矩形の補助関数', () => {
  it('重なり面積を求める', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(intersectionArea(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(25);
    expect(intersectionArea(a, { x: 10, y: 0, width: 10, height: 10 })).toBe(0);
  });

  it('縁に接しているかを判定する', () => {
    const region = { x: 0, y: 0, width: 100, height: 100 };
    expect(touchesEdge({ x: 10, y: 10, width: 10, height: 10 }, region)).toBe(false);
    expect(touchesEdge({ x: 0, y: 10, width: 10, height: 10 }, region)).toBe(true);
    expect(touchesEdge({ x: 10, y: 10, width: 90, height: 10 }, region)).toBe(true);
  });
});
