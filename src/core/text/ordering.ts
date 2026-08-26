import { STICKER_CATEGORIES } from './categories.js';
import type { StickerPlan } from './plan.js';

/**
 * 提出するスタンプの並べ方。
 *
 * 作るときの並び（9カテゴリ × 5周）は、生成される各シートを
 * 9種類バラバラにするためのもの。提出するときの並びとは目的が違う。
 */
export type SortMode = 'use' | 'sheet';

export const SORT_LABELS: Record<SortMode, string> = {
  use: '使いやすい順',
  sheet: '作った順',
};

const RANKS = new Map(STICKER_CATEGORIES.map((category) => [category.id, category.useRank]));

/**
 * 使いやすい順。よく使う種類から、種類ごとにまとめる。
 *
 * LINEのスタンプ画面は8個ずつくらいスクロールして探すため、
 *   1. 最初の1画面によく使うものが来る
 *   2. 探すときに同じ種類がまとまっている
 * の2つが効く。使用頻度の低い「困った」「おわび」は最後に置く。
 */
export function compareForUse(left: StickerPlan, right: StickerPlan): number {
  const rankDifference = (RANKS.get(left.category) ?? 99) - (RANKS.get(right.category) ?? 99);
  if (rankDifference !== 0) return rankDifference;
  // 同じ種類の中では、作った順を保つ
  return left.id - right.id;
}

/** 作った順。シート1枚目の1個目から順に並べる。 */
export function compareForSheet(left: StickerPlan, right: StickerPlan): number {
  return left.id - right.id;
}

export function comparerFor(mode: SortMode): (a: StickerPlan, b: StickerPlan) => number {
  return mode === 'use' ? compareForUse : compareForSheet;
}
