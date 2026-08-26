import { describe, expect, it } from 'vitest';
import { STICKER_CATEGORIES } from '../../src/core/text/categories.js';
import { compareForSheet, compareForUse } from '../../src/core/text/ordering.js';
import { buildPlans } from '../../src/core/text/plan.js';

const plans = buildPlans({ preset: 'daily', tone: 'casual', targetCount: 40 }).slice(0, 40);

describe('種類の使用頻度順', () => {
  it('1から9まで重複なく振られている', () => {
    const ranks = STICKER_CATEGORIES.map((category) => category.useRank).sort((a, b) => a - b);
    expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('よく使う種類が先に来る', () => {
    const rank = (id: string): number =>
      STICKER_CATEGORIES.find((category) => category.id === id)?.useRank ?? 99;

    expect(rank('greeting')).toBeLessThan(rank('trouble'));
    expect(rank('reply')).toBeLessThan(rank('apology'));
    expect(rank('thanks')).toBeLessThan(rank('plan'));
    // 使用頻度の低い2つが最後
    expect(rank('trouble')).toBe(8);
    expect(rank('apology')).toBe(9);
  });
});

describe('使いやすい順に並べる', () => {
  const sorted = [...plans].sort(compareForUse);

  it('同じ種類がひとかたまりになる', () => {
    const seen = new Set<string>();
    let previous = '';
    for (const plan of sorted) {
      if (plan.category !== previous) {
        expect(seen.has(plan.category), `${plan.category} が分かれている`).toBe(false);
        seen.add(plan.category);
        previous = plan.category;
      }
    }
  });

  it('あいさつが先頭に来る', () => {
    expect(sorted.slice(0, 5).every((plan) => plan.category === 'greeting')).toBe(true);
    expect(sorted[0]?.text).toBe('おはよう');
  });

  it('おわびが最後に来る', () => {
    expect(sorted.slice(-4).every((plan) => plan.category === 'apology')).toBe(true);
  });

  it('同じ種類の中では作った順を保つ', () => {
    const greetings = sorted.filter((plan) => plan.category === 'greeting');
    expect(greetings.map((plan) => plan.id)).toEqual([...greetings.map((plan) => plan.id)].sort((a, b) => a - b));
  });

  it('枚数も中身も変わらない', () => {
    expect(sorted).toHaveLength(plans.length);
    expect([...sorted.map((plan) => plan.id)].sort((a, b) => a - b)).toEqual(
      plans.map((plan) => plan.id),
    );
  });

  it('40個セットでは最初の10個があいさつと返事になる', () => {
    // LINEのスタンプ画面で最初に見えるのがよく使うものになる
    const firstTen = sorted.slice(0, 10).map((plan) => plan.category);
    expect(new Set(firstTen)).toEqual(new Set(['greeting', 'reply']));
  });
});

describe('作った順に並べる', () => {
  it('通し番号どおりになる', () => {
    const shuffled = [plans[10], plans[3], plans[27], plans[0]].filter((plan) => plan !== undefined);
    const sorted = [...shuffled].sort(compareForSheet);
    expect(sorted.map((plan) => plan.id)).toEqual([1, 4, 11, 28]);
  });
});
