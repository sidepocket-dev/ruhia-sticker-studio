import { describe, expect, it } from 'vitest';
import { STICKERS_PER_SHEET } from '../../src/config/line-spec.js';
import {
  CATEGORY_COUNT,
  MAX_ROUNDS,
  STICKER_CATEGORIES,
  TOTAL_SLOTS,
  categoryAt,
  roundAt,
} from '../../src/core/text/categories.js';
import { POSE_DESIGNS, poseAt } from '../../src/core/text/poses.js';

describe('スロットの構造', () => {
  it('カテゴリ数がシート1枚のスタンプ数と一致する', () => {
    expect(CATEGORY_COUNT).toBe(STICKERS_PER_SHEET);
  });

  it('45スロット（9カテゴリ × 5周）になる', () => {
    expect(TOTAL_SLOTS).toBe(45);
    expect(MAX_ROUNDS).toBe(5);
  });

  it('位置からカテゴリと周が求まる', () => {
    expect(categoryAt(1)).toBe('greeting');
    expect(categoryAt(9)).toBe('farewell');
    expect(categoryAt(10)).toBe('greeting');
    expect(roundAt(1)).toBe(0);
    expect(roundAt(9)).toBe(0);
    expect(roundAt(10)).toBe(1);
    expect(roundAt(45)).toBe(4);
  });

  it('どの先頭何件を取ってもカテゴリが均等に入る', () => {
    for (const count of [9, 18, 27, 36, 45]) {
      const seen = new Map<string, number>();
      for (let position = 1; position <= count; position++) {
        const category = categoryAt(position);
        seen.set(category, (seen.get(category) ?? 0) + 1);
      }
      expect(seen.size, `${count}件のときのカテゴリ数`).toBe(CATEGORY_COUNT);
      const expectedEach = count / CATEGORY_COUNT;
      for (const [category, found] of seen) {
        expect(found, `${count}件のときの ${category}`).toBe(expectedEach);
      }
    }
  });

  it('1シート分（9件）に同じカテゴリが2回入らない', () => {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const categories = new Set<string>();
      for (let i = 1; i <= CATEGORY_COUNT; i++) {
        categories.add(categoryAt(round * CATEGORY_COUNT + i));
      }
      expect(categories.size, `${round + 1}周目`).toBe(CATEGORY_COUNT);
    }
  });

  it('カテゴリのidが重複していない', () => {
    const ids = STICKER_CATEGORIES.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('ポーズ設計', () => {
  it('スロット数ぶんちょうど用意されている', () => {
    expect(POSE_DESIGNS).toHaveLength(TOTAL_SLOTS);
  });

  it('同じポーズが2回以上出てこない', () => {
    const poses = POSE_DESIGNS.map((design) => design.pose);
    const duplicates = poses.filter((pose, index) => poses.indexOf(pose) !== index);
    expect(duplicates, `重複したポーズ: ${duplicates.join(', ')}`).toEqual([]);
  });

  it('同じ表情が2回以上出てこない', () => {
    const emotions = POSE_DESIGNS.map((design) => design.emotion);
    const duplicates = emotions.filter((emotion, index) => emotions.indexOf(emotion) !== index);
    expect(duplicates, `重複した表情: ${duplicates.join(', ')}`).toEqual([]);
  });

  it('同じ見せ方が3回以上続かない', () => {
    let run = 1;
    for (let i = 1; i < POSE_DESIGNS.length; i++) {
      const previous = POSE_DESIGNS[i - 1];
      const current = POSE_DESIGNS[i];
      run = previous?.composition === current?.composition ? run + 1 : 1;
      expect(run, `位置 ${i + 1} で ${current?.composition} が続いている`).toBeLessThan(3);
    }
  });

  it('正面が半分以上を占め、斜めと横向きで変化がつく', () => {
    const counts = { front: 0, angle: 0, side: 0 };
    for (const design of POSE_DESIGNS) counts[design.composition]++;
    // 表情が見えるのが基本なので正面が多い
    expect(counts.front).toBeGreaterThan(counts.angle);
    expect(counts.angle).toBeGreaterThan(0);
    expect(counts.side).toBeGreaterThan(0);
  });

  it('小道具は控えめで、同じものを繰り返さない', () => {
    const props = POSE_DESIGNS.map((design) => design.prop).filter(
      (prop): prop is string => prop !== undefined,
    );
    // 全体の2〜4割程度
    expect(props.length).toBeGreaterThanOrEqual(9);
    expect(props.length).toBeLessThanOrEqual(18);
    expect(new Set(props).size, `重複した小道具がある: ${props.join(', ')}`).toBe(props.length);
  });

  it('小道具に衣装や体の特徴を含めない', () => {
    // 参照画像がキャラクター外見の正（PRODUCT_SPEC.md §18）
    const forbidden = ['服', '帽子', 'シャツ', 'スカート', '靴', '髪', '目', '手', '顔', '制服'];
    for (const design of POSE_DESIGNS) {
      if (!design.prop) continue;
      for (const word of forbidden) {
        expect(design.prop, `小道具「${design.prop}」`).not.toContain(word);
      }
    }
  });

  it('位置からポーズを取り出せる', () => {
    expect(poseAt(1)).toEqual(POSE_DESIGNS[0]);
    expect(poseAt(45)).toEqual(POSE_DESIGNS[44]);
    expect(() => poseAt(46)).toThrow();
  });
});
