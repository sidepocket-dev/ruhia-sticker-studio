import { STICKERS_PER_SHEET } from '../../config/line-spec.js';

/**
 * スタンプの用途分類。
 *
 * 数がシート1枚のスタンプ数（9）と一致しているのが要点。
 * 45スロットを「9カテゴリ × 5周」で並べることで、次の3つが同時に成り立つ。
 *
 *   1. どこで切っても偏らない（9個でも18個でも全カテゴリが均等に入る）
 *   2. 1シート = 1周 なので、生成される各シートが必ず9種類バラバラになる
 *   3. シート単位で作り直せる（3枚目だけ失敗したら3枚目だけ再生成）
 *
 * UIにはカテゴリ名を原則表示しない（PRODUCT_SPEC.md §4）。
 */
export const STICKER_CATEGORIES = [
  { id: 'greeting', label: 'あいさつ' },
  { id: 'reply', label: '返事' },
  { id: 'thanks', label: 'お礼' },
  { id: 'apology', label: 'おわび' },
  { id: 'joy', label: 'よろこび' },
  { id: 'trouble', label: '困った' },
  { id: 'cheer', label: '応援' },
  { id: 'plan', label: '予定' },
  { id: 'farewell', label: 'わかれ' },
] as const;

export type CategoryId = (typeof STICKER_CATEGORIES)[number]['id'];

/** カテゴリ数。シート1枚のスタンプ数と一致する。 */
export const CATEGORY_COUNT = STICKER_CATEGORIES.length;

/** 何周ぶん用意するか。5周 × 9カテゴリ = 45候補（最大の40個セット用）。 */
export const MAX_ROUNDS = 5;

/** 用意するスロットの総数。 */
export const TOTAL_SLOTS = CATEGORY_COUNT * MAX_ROUNDS;

/** 1始まりの位置から、そのスロットのカテゴリを求める。 */
export function categoryAt(position: number): CategoryId {
  const index = (position - 1) % CATEGORY_COUNT;
  return STICKER_CATEGORIES[index]?.id ?? 'greeting';
}

/** 1始まりの位置から、何周目か（0始まり）を求める。シート番号に対応する。 */
export function roundAt(position: number): number {
  return Math.floor((position - 1) / CATEGORY_COUNT);
}

/** カテゴリ数がシート1枚の枚数と一致していることを、型ではなく実行時にも固定する。 */
export const CATEGORIES_MATCH_SHEET = CATEGORY_COUNT === STICKERS_PER_SHEET;
