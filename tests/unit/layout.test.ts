import { describe, expect, it } from 'vitest';
import { LINE_STATIC_STICKER_SPEC } from '../../src/config/line-spec.js';
import {
  computeAdjustedLayout,
  computeFixedLayout,
  computeStickerSetLayout,
  toEven,
} from '../../src/core/line/layout.js';

const SPEC = LINE_STATIC_STICKER_SPEC;
const MARGIN = 4;

describe('偶数への丸め', () => {
  it('奇数は切り上げ、偶数はそのまま', () => {
    expect(toEven(10)).toBe(10);
    expect(toEven(11)).toBe(12);
    expect(toEven(0)).toBe(2);
  });
});

describe('スタンプ画像の配置', () => {
  // 実シート A の実測値
  const REAL_CONTENTS = [
    { width: 290, height: 398 },
    { width: 328, height: 404 },
    { width: 268, height: 339 },
    { width: 310, height: 380 },
    { width: 286, height: 339 },
    { width: 281, height: 379 },
    { width: 260, height: 352 },
    { width: 317, height: 344 },
    { width: 273, height: 380 },
  ];

  it('すべてLINEの上限に収まる', () => {
    const { layouts } = computeStickerSetLayout(REAL_CONTENTS, MARGIN);
    for (const layout of layouts) {
      expect(layout.canvas.width).toBeLessThanOrEqual(SPEC.sticker.maxWidth);
      expect(layout.canvas.height).toBeLessThanOrEqual(SPEC.sticker.maxHeight);
    }
  });

  it('すべて偶数サイズになる', () => {
    const { layouts } = computeStickerSetLayout(REAL_CONTENTS, MARGIN);
    for (const layout of layouts) {
      expect(layout.canvas.width % 2).toBe(0);
      expect(layout.canvas.height % 2).toBe(0);
    }
  });

  it('セット全体で同じ倍率を使い、体格差を保つ', () => {
    const { layouts, scale } = computeStickerSetLayout(REAL_CONTENTS, MARGIN);
    for (const layout of layouts) expect(layout.scale).toBe(scale);

    // 元が大きいスタンプは、出力でも大きい
    const big = layouts[1];
    const small = layouts[6];
    expect(big).toBeDefined();
    expect(small).toBeDefined();
    if (!big || !small) return;
    expect(big.draw.height).toBeGreaterThan(small.draw.height);

    // 相対比が元のまま保たれている（丸め誤差の範囲）
    const sourceRatio = 404 / 352;
    const outputRatio = big.draw.height / small.draw.height;
    expect(Math.abs(outputRatio - sourceRatio)).toBeLessThan(0.01);
  });

  it('一番大きいスタンプが上限いっぱいまで使う', () => {
    const { layouts } = computeStickerSetLayout(REAL_CONTENTS, MARGIN);
    const tallest = layouts[1];
    expect(tallest?.canvas.height).toBe(SPEC.sticker.maxHeight);
  });

  it('内容を描く位置がキャンバスの中に収まる', () => {
    const { layouts } = computeStickerSetLayout(REAL_CONTENTS, MARGIN);
    for (const layout of layouts) {
      expect(layout.draw.x).toBeGreaterThanOrEqual(0);
      expect(layout.draw.y).toBeGreaterThanOrEqual(0);
      expect(layout.draw.x + layout.draw.width).toBeLessThanOrEqual(layout.canvas.width);
      expect(layout.draw.y + layout.draw.height).toBeLessThanOrEqual(layout.canvas.height);
    }
  });

  it('小さい元画像を引き伸ばさない', () => {
    const { layouts, scale, upscaled } = computeStickerSetLayout(
      [{ width: 80, height: 60 }, { width: 60, height: 40 }],
      MARGIN,
    );
    expect(scale).toBe(1);
    expect(upscaled).toBe(true);
    expect(layouts[0]?.draw.width).toBe(80);
  });

  it('極端に横長でも縦長でも上限を超えない', () => {
    for (const content of [{ width: 3000, height: 40 }, { width: 40, height: 3000 }]) {
      const { layouts } = computeStickerSetLayout([content], MARGIN);
      const layout = layouts[0];
      expect(layout).toBeDefined();
      if (!layout) return;
      expect(layout.canvas.width).toBeLessThanOrEqual(SPEC.sticker.maxWidth);
      expect(layout.canvas.height).toBeLessThanOrEqual(SPEC.sticker.maxHeight);
    }
  });

  it('空の入力を受け取っても壊れない', () => {
    expect(computeStickerSetLayout([], MARGIN).layouts).toEqual([]);
  });
});

describe('メイン画像の配置', () => {
  const canvas = { width: SPEC.main.width, height: SPEC.main.height };

  it('正方形のキャンバスへ中央配置する', () => {
    const layout = computeFixedLayout({ width: 290, height: 398 }, canvas, 8);
    expect(layout.canvas).toEqual(canvas);
    expect(layout.draw.height).toBe(canvas.height - 16);
    // 描く幅が奇数だと中心は0.5画素ずれる。それ以上ずれていなければよい
    const centerOffset = Math.abs(layout.draw.x + layout.draw.width / 2 - canvas.width / 2);
    expect(centerOffset).toBeLessThanOrEqual(0.5);
    expect(layout.draw.y).toBe(8);
  });

  it('横長の内容でもはみ出さない', () => {
    const layout = computeFixedLayout({ width: 800, height: 100 }, canvas, 8);
    expect(layout.draw.width).toBeLessThanOrEqual(canvas.width);
    expect(layout.draw.x).toBeGreaterThanOrEqual(0);
  });
});

describe('タブ画像の配置', () => {
  const canvas = { width: SPEC.tab.width, height: SPEC.tab.height };

  it('拡大率1でちょうど収まる', () => {
    const layout = computeAdjustedLayout({ width: 290, height: 398 }, canvas, {
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    });
    expect(layout.draw.height).toBe(canvas.height);
    expect(layout.draw.width).toBeLessThanOrEqual(canvas.width);
  });

  it('拡大するとはみ出す（切り取られる）', () => {
    const layout = computeAdjustedLayout({ width: 100, height: 100 }, canvas, {
      zoom: 2,
      offsetX: 0,
      offsetY: 0,
    });
    expect(layout.draw.height).toBeGreaterThan(canvas.height);
    expect(layout.draw.y).toBeLessThan(0);
  });

  it('位置のずれが反映される', () => {
    const base = computeAdjustedLayout({ width: 100, height: 100 }, canvas, {
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    });
    const moved = computeAdjustedLayout({ width: 100, height: 100 }, canvas, {
      zoom: 1,
      offsetX: 10,
      offsetY: -5,
    });
    expect(moved.draw.x - base.draw.x).toBe(10);
    expect(moved.draw.y - base.draw.y).toBe(-5);
  });
});

describe('統一キャンバス設定', () => {
  it('内容の縮尺を変えずに中央へ置き直せる', () => {
    // export-store と同じ組み立て方を、計算部分だけ検証する
    const { layouts } = computeStickerSetLayout(
      [{ width: 290, height: 398 }, { width: 200, height: 200 }],
      MARGIN,
    );
    const canvas = { width: SPEC.sticker.maxWidth, height: SPEC.sticker.maxHeight };
    const uniform = layouts.map((layout) => ({
      canvas,
      draw: {
        x: Math.round((canvas.width - layout.draw.width) / 2),
        y: Math.round((canvas.height - layout.draw.height) / 2),
        width: layout.draw.width,
        height: layout.draw.height,
      },
    }));

    for (let i = 0; i < uniform.length; i++) {
      const before = layouts[i];
      const after = uniform[i];
      if (!before || !after) continue;
      // 描く大きさは変わらない＝絵が歪まない
      expect(after.draw.width).toBe(before.draw.width);
      expect(after.draw.height).toBe(before.draw.height);
      expect(after.draw.x).toBeGreaterThanOrEqual(0);
      expect(after.draw.y).toBeGreaterThanOrEqual(0);
    }
  });
});
