import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CATEGORY_COUNT, STICKER_CATEGORIES, categoryAt } from '../../src/core/text/categories.js';
import { findDuplicates } from '../../src/core/text/duplicates.js';
import { buildIdeaPrompt } from '../../src/core/text/idea-prompt.js';
import { parsePastedText } from '../../src/core/text/parser.js';
import { buildPlans } from '../../src/core/text/plan.js';

/**
 * 実際にChatGPTが返してきた回答での回帰テスト。
 *
 * 2026-08-26 にビジネス用45枠で試したときの出力。
 * 番号がまったく無く、お礼の5枠すべてが「ありがとうございます」だった。
 * 合成データでは作れない、現実のAIの振る舞いを固定しておく。
 */
const ANSWER = readFileSync(
  new URL('../fixtures/chatgpt-answer-business.txt', import.meta.url).pathname,
  'utf8',
);

describe('実際のChatGPTの回答', () => {
  const result = parsePastedText(ANSWER);
  const texts = result.entries.map((entry) => entry.text);

  it('番号が付いていなくても45件読み取れる', () => {
    expect(result.entries).toHaveLength(45);
    expect(result.failed).toEqual([]);
    expect(texts[0]).toBe('よろしくお願いします');
    expect(texts[44]).toBe('おやすみなさい');
  });

  it('番号を上から順に振り直す', () => {
    expect(result.entries.map((entry) => entry.number)).toEqual(
      Array.from({ length: 45 }, (_, i) => i + 1),
    );
  });

  it('まったく同じセリフを見逃さない', () => {
    const same = findDuplicates(texts).filter((group) => group.kind === 'same');
    const found = new Map(same.map((group) => [texts[group.indexes[0] ?? 0], group.indexes.length]));

    // 「ありがとうございます」が6つの枠に入っていた
    expect(found.get('ありがとうございます')).toBe(6);
    expect(found.get('申し訳ございません')).toBe(3);
    expect(found.get('少々お待ちください')).toBe(2);
    expect(same.length).toBeGreaterThanOrEqual(4);
  });

  it('似ているセリフも拾う', () => {
    const contained = findDuplicates(texts).filter((group) => group.kind === 'contained');
    expect(contained.length).toBeGreaterThan(0);
  });

  it('同じ種類の枠の中で重複していた（プロンプト改善の根拠）', () => {
    const byCategory = new Map<string, string[]>();
    texts.forEach((text, index) => {
      const category = categoryAt(index + 1);
      byCategory.set(category, [...(byCategory.get(category) ?? []), text]);
    });

    const thanks = byCategory.get('thanks') ?? [];
    expect(thanks).toHaveLength(5);
    // 5枠すべてが同じ言葉だった
    expect(new Set(thanks).size).toBe(1);
  });
});

describe('改善した依頼プロンプト', () => {
  const plans = buildPlans({ preset: 'business', tone: 'polite', targetCount: 40 });
  const prompt = buildIdeaPrompt(plans, 'business', 'polite');

  it('同じ種類の枠がどれとどれかを明示する', () => {
    // これを言わないと、同じ種類の5枠が全部同じ言葉になる
    for (const category of STICKER_CATEGORIES) {
      expect(prompt).toContain(`【${category.label}】は `);
    }
    expect(prompt).toContain('5個とも違う言い方にしてください');
  });

  it('お礼の枠番号を正しく並べる', () => {
    expect(prompt).toContain('【お礼】は 3、12、21、30、39 番の5個です。');
  });

  it('重複を避ける指示を最初に置く', () => {
    const lines = prompt.split('\n');
    const rule = lines.findIndex((line) => line.includes('すべて違う言葉'));
    const slots = lines.findIndex((line) => line.startsWith('1. '));
    expect(rule).toBeGreaterThan(-1);
    expect(rule).toBeLessThan(slots);
  });

  it('よく使う言葉ほど1回だけにするよう伝える', () => {
    expect(prompt).toContain('「ありがとうございます」のようなよく使う言葉ほど、1回だけに');
  });

  it('45枠すべてに種類の名前が付く', () => {
    const labels = STICKER_CATEGORIES.map((category) => category.label);
    for (const plan of plans) {
      const line = prompt.split('\n').find((item) => item.startsWith(`${plan.id}. `));
      expect(line, `${plan.id}番の行が無い`).toBeDefined();
      expect(labels.some((label) => line?.includes(`【${label}】`))).toBe(true);
    }
  });

  it('各種類がちょうど5枠ずつになる', () => {
    const counts = new Map<string, number>();
    for (const plan of plans) counts.set(plan.category, (counts.get(plan.category) ?? 0) + 1);
    expect(counts.size).toBe(CATEGORY_COUNT);
    for (const [category, count] of counts) expect(count, category).toBe(5);
  });
});
