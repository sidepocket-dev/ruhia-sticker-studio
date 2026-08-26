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
 *
 * useRank は提出するときの並び順。よく使う種類ほど小さい。
 * LINEのスタンプ画面は少しずつスクロールして探すため、
 * 最初の1画面によく使うものが来て、同じ種類がまとまっているほうが探しやすい。
 * 生成用の並び（9カテゴリ × 5周）とは目的が違うので、別に持つ。
 *
 * hint は依頼プロンプトへ入れる「変え方」の指示。
 * 実測で、種類だけ伝えても「あいさつ」の5枠が
 * 「おはようございます」「おはようございます」「こんにちは」「こんにちはー！」に
 * 寄った。日本語のあいさつは語彙が限られるため、
 * 「場面を変えろ」まで言わないとAIは寄せてくる。
 */
export const STICKER_CATEGORIES = [
  {
    id: 'greeting',
    useRank: 1,
    label: 'あいさつ',
    hint: '朝・昼・夜・久しぶり・帰ってきたときなど、場面を変えてください',
  },
  {
    id: 'reply',
    useRank: 2,
    label: '返事',
    hint: '軽い返事・きちんとした返事・納得・確認など、返し方を変えてください',
  },
  {
    id: 'thanks',
    useRank: 3,
    label: 'お礼',
    hint: '軽いお礼から深いお礼まで、気持ちの重さを変えてください',
  },
  {
    id: 'apology',
    useRank: 9,
    label: 'おわび',
    hint: '軽い謝りから深い謝りまで、度合いを変えてください',
  },
  {
    id: 'joy',
    useRank: 5,
    label: 'よろこび',
    hint: 'うれしい・楽しい・できた・しあわせなど、よろこびの種類を変えてください',
  },
  {
    id: 'trouble',
    useRank: 8,
    label: '困った',
    hint: '困った・疲れた・わからない・つらいなど、困りごとの種類を変えてください',
  },
  {
    id: 'cheer',
    useRank: 6,
    label: '応援',
    hint: '応援・励まし・気づかい・一緒にがんばるなど、声のかけ方を変えてください',
  },
  {
    id: 'plan',
    useRank: 7,
    label: '予定',
    hint: '出発・到着・準備・時間の確認など、場面を変えてください',
  },
  {
    id: 'farewell',
    useRank: 4,
    label: 'わかれ',
    hint: 'すぐまた会う・明日また会う・夜の別れなど、場面を変えてください',
  },
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
