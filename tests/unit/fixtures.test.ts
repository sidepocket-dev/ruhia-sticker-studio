import { describe, expect, it } from 'vitest';
import { DEFAULT_DETECT_OPTIONS, detectStickers } from '../../src/core/image/detect.js';
import { STICKERS_PER_SHEET } from '../../src/config/line-spec.js';
import type { DetectionStrategy } from '../../src/core/image/types.js';
import { loadPng } from '../helpers/png.js';
import { toAlphaMask } from '../../src/core/image/alpha-mask.js';
import { checkInvariants, isTightlyTrimmed } from '../helpers/invariants.js';
import { iou } from '../helpers/geometry.js';
import expectedA from '../fixtures/sheet-a.expected.json' with { type: 'json' };
import expectedB from '../fixtures/sheet-b.expected.json' with { type: 'json' };
import expectedC from '../fixtures/sheet-c.expected.json' with { type: 'json' };
import expectedD from '../fixtures/sheet-d.expected.json' with { type: 'json' };

/**
 * 実際のAI生成シートでの回帰テスト。
 * 合成フィクスチャでは作れない現実の条件を含む。
 *   - 完全不透明が全体の0.2%前後しかないアルファ分布
 *   - 透明部分に散った微弱なノイズ
 *   - 8pxしかない隙間、行ごとに位置がずれた隙間
 *   - 白フチが本体・文字・装飾をひとつにつなげた状態
 */
const FIXTURES = [
  {
    id: 'A',
    file: 'sheet-a.png',
    expected: expectedA,
    description: '整列した透過3 × 3',
    strategy: 'simple-split' as DetectionStrategy,
  },
  {
    id: 'B',
    file: 'sheet-b.png',
    expected: expectedB,
    description: '白フチ付きの自由配置（ステッカー機能の出力）',
    strategy: 'smart-detection' as DetectionStrategy,
  },
  {
    id: 'C',
    file: 'sheet-c.png',
    expected: expectedC,
    description: '文字が多いシート',
    strategy: 'simple-split' as DetectionStrategy,
  },
  {
    id: 'D',
    file: 'sheet-d.png',
    expected: expectedD,
    description: '白フチ付き・装飾が離れているシート',
    strategy: expectedD.strategy as DetectionStrategy,
  },
];

describe.each(FIXTURES)('実シート $id（$description）', ({ file, expected, strategy }) => {
  const buffer = loadPng(new URL(`../fixtures/${file}`, import.meta.url).pathname);
  const outcome = detectStickers(buffer);

  it('抽出できる', () => {
    expect(outcome.ok).toBe(true);
  });

  it(`${strategy} で処理される`, () => {
    if (!outcome.ok) return;
    expect(outcome.result.strategy).toBe(strategy);
  });

  it('TC01 / TC09: 9個を抽出する', () => {
    if (!outcome.ok) return;
    expect(outcome.result.regions).toHaveLength(STICKERS_PER_SHEET);
  });

  it('正解値と一致する (IoU >= 0.9)', () => {
    if (!outcome.ok) return;
    outcome.result.regions.forEach((region, index) => {
      const target = expected.contentBounds[index];
      expect(target, `正解値 ${index} が無い`).toBeDefined();
      if (!target) return;
      expect(iou(region.contentBounds, target), `スタンプ ${index + 1}`).toBeGreaterThanOrEqual(0.9);
    });
  });

  it('TC02 / TC10: 内容を切っていない / 二重に取っていない', () => {
    if (!outcome.ok) return;
    const report = checkInvariants(
      buffer,
      outcome.result.regions,
      DEFAULT_DETECT_OPTIONS.alphaThreshold,
    );
    expect(report.coverage, '内容の取りこぼし').toBeGreaterThanOrEqual(0.995);
    expect(report.overlapArea, '範囲の重なり').toBe(0);
  });

  it('TC03: 透明な余白がトリムされている', () => {
    if (!outcome.ok) return;
    // 抽出範囲の上下左右それぞれの縁に内容が接していること。
    // 「面積が小さい」ではなく、余白が残っていないことを直接確かめる
    const mask = toAlphaMask(buffer, DEFAULT_DETECT_OPTIONS.alphaThreshold);
    for (const region of outcome.result.regions) {
      expect(
        isTightlyTrimmed(mask, region.contentBounds),
        `スタンプ ${region.cellIndex + 1} に透明な余白が残っている`,
      ).toBe(true);
    }
  });

  it('9個すべてが確認不要（信頼度が高い）と判定される', () => {
    if (!outcome.ok) return;
    for (const region of outcome.result.regions) {
      expect(region.confidence, `スタンプ ${region.cellIndex + 1}`).toBeGreaterThanOrEqual(0.7);
    }
  });
});
