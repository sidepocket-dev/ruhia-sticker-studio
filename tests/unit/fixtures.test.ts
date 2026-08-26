import { describe, expect, it } from 'vitest';
import { DEFAULT_DETECT_OPTIONS, detectStickers } from '../../src/core/image/detect.js';
import { STICKERS_PER_SHEET } from '../../src/config/line-spec.js';
import { buildPlans } from '../../src/core/text/plan.js';
import type { DetectionStrategy } from '../../src/core/image/types.js';
import { loadPng } from '../helpers/png.js';
import { toAlphaMask } from '../../src/core/image/alpha-mask.js';
import { checkInvariants, isTightlyTrimmed } from '../helpers/invariants.js';
import { iou } from '../helpers/geometry.js';
import expectedA from '../fixtures/sheet-a.expected.json' with { type: 'json' };
import expectedB from '../fixtures/sheet-b.expected.json' with { type: 'json' };
import expectedC from '../fixtures/sheet-c.expected.json' with { type: 'json' };
import expectedD from '../fixtures/sheet-d.expected.json' with { type: 'json' };
import expectedE from '../fixtures/sheet-e.expected.json' with { type: 'json' };
import expectedF from '../fixtures/sheet-f.expected.json' with { type: 'json' };
import expected1 from '../fixtures/sheet-1.expected.json' with { type: 'json' };
import expected2 from '../fixtures/sheet-2.expected.json' with { type: 'json' };
import expected3 from '../fixtures/sheet-3.expected.json' with { type: 'json' };

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
  {
    id: 'E',
    file: 'sheet-e.png',
    expected: expectedE,
    description: '白フチなし・装飾が多いシート',
    strategy: expectedE.strategy as DetectionStrategy,
  },
  {
    id: 'F',
    file: 'sheet-f.png',
    expected: expectedF,
    description: '1024pxの小さめのシート',
    strategy: expectedF.strategy as DetectionStrategy,
  },
  {
    id: '1',
    file: 'sheet-1.png',
    expected: expected1,
    description: 'このツールの計画から作った日常用の1枚目',
    strategy: expected1.strategy as DetectionStrategy,
  },
  {
    id: '2',
    file: 'sheet-2.png',
    expected: expected2,
    description: 'このツールの計画から作った日常用の2枚目',
    strategy: expected2.strategy as DetectionStrategy,
  },
  {
    id: '3',
    file: 'sheet-3.png',
    expected: expected3,
    description: 'このツールの計画から作った日常用の3枚目（範囲が噛み合う）',
    strategy: expected3.strategy as DetectionStrategy,
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

/**
 * sheet-1.png は、このツールが組み立てた計画から作られた最初の実例。
 *
 *   日常用・カジュアル → 1周目の9件 → 画像生成プロンプト → ChatGPTで生成
 *
 * 計画 → プロンプト → 生成 → 抽出 の全経路が通ることを確かめる唯一の例なので、
 * 対応関係が崩れていないかを固定しておく。
 */
describe('計画から作ったシートとの対応', () => {
  const buffer = loadPng(new URL('../fixtures/sheet-1.png', import.meta.url).pathname);
  const outcome = detectStickers(buffer);

  const planned = buildPlans({ preset: 'daily', tone: 'casual', targetCount: 8 })
    .slice(0, STICKERS_PER_SHEET)
    .map((plan) => plan.text);

  it('計画の1周目が、生成に使ったセリフと一致する', () => {
    // 2026-08-26 に実際に生成へ使った9件
    expect(planned).toEqual([
      'おはよう',
      'りょーかい',
      'ありがとう',
      'ごめんね',
      'やったー！',
      'どうしよう…',
      'がんばって！',
      'いってきまーす',
      'またね',
    ]);
  });

  it('抽出結果が左上から右下の順に9個そろう', () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // 候補の並びが計画の並びと対応する前提（PRODUCT_SPEC.md §38 / §77.10）。
    // 目視で、1個目が「おはよう」、9個目が「またね」であることを確認済み
    expect(outcome.result.regions.map((region) => region.cellIndex)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(outcome.result.regions).toHaveLength(planned.length);
  });
});

/**
 * sheet-3 は、外接矩形どうしが噛み合った初めての実例。
 *
 * 「めっちゃうれしい」の足先と「準備するね」の吹き出しの上端が6行ぶん重なり、
 * そのままでは切り出し画像の下端に吹き出しの輪郭が写り込んだ。
 * 白フチ付きのシートでは1スタンプが1つの連結領域になるため、
 * 矩形では消せず、画素の所属を見て消す必要がある。
 */
describe('範囲が噛み合うシートの写り込み除去', () => {
  const buffer = loadPng(new URL('../fixtures/sheet-3.png', import.meta.url).pathname);
  const outcome = detectStickers(buffer);

  it('噛み合った2個にだけ、消す矩形が付く', () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const withExclude = outcome.result.regions.filter(
      (region) => (region.excludeRects ?? []).length > 0,
    );
    expect(withExclude.map((region) => region.cellIndex)).toEqual([4, 7]);
  });

  it('消す量はごく一部にとどまる', () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    for (const region of outcome.result.regions) {
      const erased = (region.excludeRects ?? []).reduce(
        (sum, rect) => sum + rect.width * rect.height,
        0,
      );
      const own = region.contentBounds.width * region.contentBounds.height;
      expect(erased / own, `スタンプ ${region.cellIndex + 1}`).toBeLessThan(0.01);
    }
  });

  it('消す矩形は、自分の切り出し範囲の中に収まる', () => {
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    for (const region of outcome.result.regions) {
      for (const rect of region.excludeRects ?? []) {
        expect(rect.x).toBeGreaterThanOrEqual(region.bounds.x);
        expect(rect.y).toBeGreaterThanOrEqual(region.bounds.y);
        expect(rect.x + rect.width).toBeLessThanOrEqual(region.bounds.x + region.bounds.width);
        expect(rect.y + rect.height).toBeLessThanOrEqual(region.bounds.y + region.bounds.height);
      }
    }
  });
});
