import { describe, expect, it } from 'vitest';
import { DEFAULT_DETECT_OPTIONS, detectStickers } from '../../src/core/image/detect.js';
import {
  addFaintHaze,
  addSpeckles,
  makeAlignedGrid,
  makeSheet,
  makeStaggeredGrid,
} from '../helpers/make-sheet.js';
import { checkInvariants } from '../helpers/invariants.js';
import { iou } from '../helpers/geometry.js';
import type { StickerRegion } from '../../src/core/image/types.js';

const THRESHOLD = DEFAULT_DETECT_OPTIONS.alphaThreshold;

function expectMatchesExpected(regions: StickerRegion[], expected: { x: number; y: number; width: number; height: number }[]): void {
  expect(regions).toHaveLength(9);
  regions.forEach((region, index) => {
    const target = expected[index];
    expect(target).toBeDefined();
    if (!target) return;
    // contentBounds は安全余白を含まないので、正解と厳密に一致するはず
    expect(region.contentBounds, `セル ${index}`).toEqual(target);
  });
}

describe('整列シートの抽出', () => {
  it('均等な3 × 3 から9個を正しく取り出す', () => {
    const { buffer, expected } = makeAlignedGrid({ size: 900, margin: 40, gap: 60 });
    const outcome = detectStickers(buffer);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.strategy).toBe('simple-split');
    expectMatchesExpected(outcome.result.regions, expected);
  });

  it('隙間が均等位置からずれていても正しく取り出す', () => {
    // 各スタンプを別方向へずらし、隙間の位置を不均等にする
    const { buffer, expected } = makeAlignedGrid({
      size: 900,
      margin: 40,
      gap: 60,
      inset: 10,
      offsets: {
        0: { dx: -8, dy: -6 },
        2: { dx: 12, dy: 0 },
        4: { dx: 0, dy: 14 },
        6: { dx: -4, dy: 9 },
        8: { dx: 10, dy: -11 },
      },
    });
    const outcome = detectStickers(buffer);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expectMatchesExpected(outcome.result.regions, expected);
  });

  it('薄いドロップシャドウを内容として拾わない', () => {
    const { buffer, expected } = makeAlignedGrid({ size: 900, margin: 40, gap: 60 });
    const hazed = addFaintHaze(buffer, THRESHOLD - 1);
    const outcome = detectStickers(hazed);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expectMatchesExpected(outcome.result.regions, expected);
  });

  it('透明部分の微弱なノイズを内容として拾わない', () => {
    const { buffer, expected } = makeAlignedGrid({ size: 900, margin: 40, gap: 60 });
    const speckled = addSpeckles(buffer, THRESHOLD - 8, 7);
    const outcome = detectStickers(speckled);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expectMatchesExpected(outcome.result.regions, expected);
  });

  it('隣どうしが物理的につながっていたら分けない', () => {
    const { buffer } = makeAlignedGrid({ size: 900, margin: 40, gap: 60 });
    const cell = Math.floor((900 - 80 - 120) / 3);
    const gutterStart = 40 + cell;
    // 隙間をまたいで2個を橋渡しする帯を足す
    const crossing = makeSheet(900, 900, [
      { x: gutterStart - 5, y: 200, width: 70, height: 30 },
    ]);
    for (let i = 0; i < buffer.data.length; i++) {
      if ((crossing.data[i] ?? 0) !== 0) buffer.data[i] = crossing.data[i] ?? 0;
    }

    // つながっている以上、どの方式でも9個には分けられない。
    // 誤った位置で切るより、手動修正へ回すほうがよい。
    const outcome = detectStickers(buffer);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe('too-few-components');
  });

  it('空のセルがあれば抽出しない', () => {
    const { buffer } = makeAlignedGrid({ size: 900, margin: 40, gap: 60 });
    // 中央セルを消す
    const cell = Math.floor((900 - 80 - 120) / 3);
    const x0 = 40 + cell + 60;
    const y0 = 40 + cell + 60;
    for (let y = y0; y < y0 + cell; y++) {
      for (let x = x0; x < x0 + cell; x++) buffer.data[(y * 900 + x) * 4 + 3] = 0;
    }

    const outcome = detectStickers(buffer);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(['empty-cell', 'too-few-components']).toContain(outcome.reason);
  });

  it('一面が塗りつぶされたシートは抽出しない', () => {
    const buffer = makeSheet(900, 900, [{ x: 0, y: 0, width: 900, height: 900 }]);
    const outcome = detectStickers(buffer);
    expect(outcome.ok).toBe(false);
  });
});

describe('自由配置シートの抽出', () => {
  it('隙間が縦一直線に空いていなくても9個に分ける', () => {
    // 実測シート b と同じ構造。行ごとに横位置がずれている
    const { buffer, expected } = makeStaggeredGrid({
      size: 900,
      margin: 40,
      gap: 50,
      rowShift: 40,
    });

    const outcome = detectStickers(buffer);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // 単純分割では切れないので、まとめ上げへ切り替わっているはず
    expect(outcome.result.strategy).toBe('smart-detection');
    expect(outcome.result.regions).toHaveLength(9);
    expectMatchesExpected(outcome.result.regions, expected);
  });

  it('自由配置でも内容を切らず、範囲が重ならない', () => {
    const { buffer } = makeStaggeredGrid({ size: 900, margin: 40, gap: 50, rowShift: 40 });
    const outcome = detectStickers(buffer);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const report = checkInvariants(buffer, outcome.result.regions, THRESHOLD);
    expect(report.coverage).toBeGreaterThanOrEqual(0.995);
    expect(report.overlapArea).toBe(0);
  });

  it('離れた装飾を、いちばん近いキャラクターへまとめる', () => {
    const { buffer } = makeStaggeredGrid({ size: 900, margin: 40, gap: 50, rowShift: 40 });
    const cell = Math.floor((900 - 80 - 100) / 3);

    // 中央のスタンプの右上へ、離れたハートを置く
    const heartX = 40 + cell + 50 + cell + 6;
    const heartY = 40 + cell + 50 - 6;
    const decoration = makeSheet(900, 900, [{ x: heartX, y: heartY, width: 22, height: 22 }]);
    for (let i = 0; i < buffer.data.length; i++) {
      if ((decoration.data[i] ?? 0) !== 0) buffer.data[i] = decoration.data[i] ?? 0;
    }

    const outcome = detectStickers(buffer);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // ハートが独立したスタンプになっていない
    expect(outcome.result.regions).toHaveLength(9);
    const middle = outcome.result.regions.find((region) => region.cellIndex === 4);
    expect(middle).toBeDefined();
    if (!middle) return;

    // 中央のスタンプの範囲がハートを含んでいる
    expect(middle.contentBounds.x + middle.contentBounds.width).toBeGreaterThanOrEqual(heartX + 22);
    expect(checkInvariants(buffer, outcome.result.regions, THRESHOLD).coverage).toBeGreaterThanOrEqual(0.995);
  });
});

describe('抽出の不変条件', () => {
  it('内容を切らず、範囲が重ならない', () => {
    const { buffer } = makeAlignedGrid({ size: 900, margin: 40, gap: 60, inset: 8 });
    const outcome = detectStickers(buffer);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const report = checkInvariants(buffer, outcome.result.regions, THRESHOLD);
    expect(report.coverage).toBeGreaterThanOrEqual(0.995);
    expect(report.overlapArea).toBe(0);
  });

  it('安全余白は内容の外側にだけ付く', () => {
    const { buffer, expected } = makeAlignedGrid({ size: 900, margin: 40, gap: 60, inset: 8 });
    const outcome = detectStickers(buffer);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const margin = DEFAULT_DETECT_OPTIONS.safeMarginPx;
    outcome.result.regions.forEach((region, index) => {
      const target = expected[index];
      if (!target) return;
      expect(iou(region.contentBounds, target)).toBe(1);
      expect(region.bounds.width).toBe(target.width + margin * 2);
      expect(region.bounds.height).toBe(target.height + margin * 2);
    });
  });
});

describe('信頼度', () => {
  it('隙間が狭くても、正しく取れていれば低評価にしない', () => {
    // 実測フィクスチャの行の隙間は8pxしかない。それでも抽出は完全なので減点しない
    const { buffer } = makeAlignedGrid({ size: 900, margin: 40, gap: 8 });
    const outcome = detectStickers(buffer);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    for (const region of outcome.result.regions) {
      expect(region.confidence).toBe(1);
    }
  });

  it('隙間が狭くても抽出範囲が重ならない', () => {
    // 安全余白(8px)が隙間(6px)より広い状況。セル境界で止まらないと重なる
    const { buffer } = makeAlignedGrid({ size: 900, margin: 40, gap: 6 });
    const outcome = detectStickers(buffer);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(checkInvariants(buffer, outcome.result.regions, THRESHOLD).overlapArea).toBe(0);
  });

  it('他より極端に小さい抽出は確認を促す', () => {
    const { buffer } = makeAlignedGrid({ size: 900, margin: 40, gap: 60, inset: 20 });
    const cell = Math.floor((900 - 80 - 120) / 3);
    // 中央セルの内容を小さな破片だけにする
    const x0 = 40 + cell + 60;
    const y0 = 40 + cell + 60;
    for (let y = y0; y < y0 + cell; y++) {
      for (let x = x0; x < x0 + cell; x++) buffer.data[(y * 900 + x) * 4 + 3] = 0;
    }
    for (let y = y0 + 50; y < y0 + 70; y++) {
      for (let x = x0 + 50; x < x0 + 70; x++) buffer.data[(y * 900 + x) * 4 + 3] = 250;
    }

    const outcome = detectStickers(buffer);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const middle = outcome.result.regions.find((r) => r.cellIndex === 4);
    expect(middle?.confidence).toBeLessThan(0.7);
    const others = outcome.result.regions.filter((r) => r.cellIndex !== 4);
    for (const region of others) expect(region.confidence).toBe(1);
  });

  it('シートの端に接している抽出は確認を促す', () => {
    // 左上のスタンプだけシート外周に接する位置へ動かす
    const { buffer } = makeAlignedGrid({
      size: 900,
      margin: 40,
      gap: 60,
      offsets: { 0: { dx: -40, dy: -40 } },
    });
    const outcome = detectStickers(buffer);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.regions.find((r) => r.cellIndex === 0)?.confidence).toBeLessThan(0.7);
  });
});
