import { describe, expect, it } from 'vitest';
import { findGutter } from '../../src/core/image/gutter-split.js';

const profileFrom = (values: number[]): Int32Array => Int32Array.from(values);

describe('隙間の探索', () => {
  it('探索窓の中で最も広い空区間の中心を返す', () => {
    //            0  1  2  3  4  5  6  7  8  9
    const p = profileFrom([9, 0, 9, 0, 0, 0, 0, 9, 9, 9]);
    // 空区間 3-6 の中心は 4.5。丸めて 5 になる
    expect(findGutter(p, 4, 5, 0)).toEqual({ center: 5, width: 4, start: 3, end: 6 });
  });

  it('同じ広さなら期待位置に近い方を選ぶ', () => {
    const p = profileFrom([0, 0, 9, 9, 9, 9, 9, 0, 0, 9]);
    // 幅2の空区間が 0-1（中心1）と 7-8（中心8）。target 7 に近い後者を選ぶ
    expect(findGutter(p, 7, 8, 0)?.center).toBe(8);
  });

  it('探索窓の外にある空区間は使わない', () => {
    const p = profileFrom([0, 0, 0, 0, 9, 9, 9, 9, 9, 9]);
    expect(findGutter(p, 8, 1, 0)).toBeNull();
  });

  it('空区間が無ければ null', () => {
    expect(findGutter(profileFrom([5, 5, 5, 5, 5]), 2, 2, 0)).toBeNull();
  });

  it('探索窓の端で終わる空区間も拾える', () => {
    const p = profileFrom([9, 9, 9, 0, 0, 0]);
    expect(findGutter(p, 4, 2, 0)).toEqual({ center: 4, width: 3, start: 3, end: 5 });
  });

  it('許容値以下の微弱なノイズは空とみなす', () => {
    const p = profileFrom([9, 9, 1, 2, 1, 9, 9]);
    expect(findGutter(p, 3, 3, 0)).toBeNull();
    expect(findGutter(p, 3, 3, 2)?.center).toBe(3);
  });
});
