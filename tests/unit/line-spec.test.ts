import { describe, expect, it } from 'vitest';
import {
  LINE_STATIC_STICKER_SPEC,
  STICKERS_PER_SHEET,
  candidateCountFor,
  isAllowedStickerCount,
  sheetCountFor,
  stickerFileName,
} from '../../src/config/line-spec.js';

describe('LINE規格', () => {
  it('LINEが受け付ける個数だけを許可する', () => {
    for (const count of [8, 16, 24, 32, 40]) {
      expect(isAllowedStickerCount(count)).toBe(true);
    }
    for (const count of [0, 1, 9, 12, 41, 45]) {
      expect(isAllowedStickerCount(count)).toBe(false);
    }
  });

  it('main / tab の寸法が偶数である', () => {
    const { main, tab } = LINE_STATIC_STICKER_SPEC;
    for (const value of [main.width, main.height, tab.width, tab.height]) {
      expect(value % 2).toBe(0);
    }
  });
});

describe('候補数とシート枚数', () => {
  // PRODUCT_SPEC.md §21 の表
  const CASES = [
    { target: 8, candidates: 9, sheets: 1 },
    { target: 16, candidates: 18, sheets: 2 },
    { target: 24, candidates: 27, sheets: 3 },
    { target: 32, candidates: 36, sheets: 4 },
    { target: 40, candidates: 45, sheets: 5 },
  ];

  it.each(CASES)('$target 個 → 候補 $candidates 個 / $sheets 枚', ({ target, candidates, sheets }) => {
    expect(candidateCountFor(target)).toBe(candidates);
    expect(sheetCountFor(target)).toBe(sheets);
  });

  it('候補数は必ず9の倍数', () => {
    for (const count of LINE_STATIC_STICKER_SPEC.allowedCounts) {
      expect(candidateCountFor(count) % STICKERS_PER_SHEET).toBe(0);
    }
  });

  it('候補数は目標個数を下回らない', () => {
    for (const count of LINE_STATIC_STICKER_SPEC.allowedCounts) {
      expect(candidateCountFor(count)).toBeGreaterThanOrEqual(count);
    }
  });
});

describe('提出ファイル名', () => {
  it('1始まりの連番を2桁でゼロ埋めする', () => {
    expect(stickerFileName(1)).toBe('01.png');
    expect(stickerFileName(8)).toBe('08.png');
    expect(stickerFileName(40)).toBe('40.png');
  });
});
