import { describe, expect, it } from 'vitest';
import { DEFAULT_DETECT_OPTIONS, detectAlignedSheet } from '../../src/core/image/detect.js';
import { STICKERS_PER_SHEET } from '../../src/config/line-spec.js';
import { loadPng } from '../helpers/png.js';
import { checkInvariants } from '../helpers/invariants.js';
import { iou } from '../helpers/geometry.js';
import expected from '../fixtures/sheet-a.expected.json' with { type: 'json' };

/**
 * TC01 / TC02 / TC03 — 実際のAI生成シートでの回帰テスト。
 * 合成フィクスチャでは作れない現実の条件（微弱なノイズ、狭い隙間、
 * 完全不透明が0.12%しかないアルファ分布）を含む。
 */
describe('実シート A（整列した透過3 × 3）', () => {
  const buffer = loadPng(new URL('../fixtures/sheet-a.png', import.meta.url).pathname);
  const outcome = detectAlignedSheet(buffer);

  it('単純分割で抽出できる', () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.strategy).toBe(expected.strategy);
  });

  it('TC01: 9個を抽出する', () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.regions).toHaveLength(STICKERS_PER_SHEET);
  });

  it('TC01: 正解値と一致する (IoU >= 0.9)', () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    outcome.result.regions.forEach((region, index) => {
      const target = expected.contentBounds[index];
      expect(target, `正解値 ${index} が無い`).toBeDefined();
      if (!target) return;
      expect(iou(region.contentBounds, target), `スタンプ ${index + 1}`).toBeGreaterThanOrEqual(0.9);
    });
  });

  it('TC02: 内容を切っていない / 二重に取っていない', () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const report = checkInvariants(buffer, outcome.result.regions, DEFAULT_DETECT_OPTIONS.alphaThreshold);
    expect(report.coverage, '内容の取りこぼし').toBeGreaterThanOrEqual(0.995);
    expect(report.overlapArea, '範囲の重なり').toBe(0);
  });

  it('TC03: 透明な余白がトリムされている', () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // 抽出範囲がセルいっぱいのままなら、トリムが効いていない
    const sheetArea = buffer.width * buffer.height;
    for (const region of outcome.result.regions) {
      const area = region.contentBounds.width * region.contentBounds.height;
      expect(area).toBeLessThan(sheetArea / STICKERS_PER_SHEET);
    }
  });

  it('9個すべてが確認不要（信頼度が高い）と判定される', () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    for (const region of outcome.result.regions) {
      expect(region.confidence, `スタンプ ${region.cellIndex + 1}`).toBeGreaterThanOrEqual(0.7);
    }
  });
});
