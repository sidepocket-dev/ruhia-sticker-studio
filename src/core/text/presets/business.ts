import type { UsePreset } from './types.js';

/** ビジネス用。社内外の連絡で使う、失礼にならない言い回しを中心に。 */
export const BUSINESS_PRESET: UsePreset = {
  id: 'business',
  label: 'ビジネス用',
  description: '仕事の連絡で使う、失礼にならない言い回し',
  defaultTone: 'polite',
  texts: [
    // ── 1周目 ──
    { polite: 'おはようございます', casual: 'おはよう' },
    { polite: '承知しました', casual: 'りょうかい' },
    { polite: 'ありがとうございます', casual: 'ありがとう' },
    { polite: '申し訳ございません', casual: 'ごめん' },
    { polite: 'よかったです', casual: 'よかった！' },
    { polite: '確認させてください', casual: 'ちょっと確認させて' },
    { polite: 'よろしくお願いします', casual: 'よろしく！' },
    { polite: '向かっています', casual: '今から向かう' },
    { polite: '失礼します', casual: 'またあとで' },

    // ── 2周目 ──
    { polite: 'お疲れさまです', casual: 'おつかれ！' },
    { polite: '了解しました', casual: 'はーい' },
    { polite: '助かります', casual: 'たすかる！' },
    { polite: '失礼いたしました', casual: 'すまん' },
    { polite: 'うれしいです', casual: 'やった！' },
    { polite: '少々お待ちください', casual: 'ちょっと待って' },
    { polite: '応援しています', casual: 'がんばって！' },
    { polite: '本日中に対応します', casual: '今日中にやる' },
    { polite: 'お先に失礼します', casual: 'お先！' },

    // ── 3周目 ──
    { polite: 'いつもお世話になっております', casual: 'いつもどうも' },
    { polite: 'かしこまりました', casual: 'わかった' },
    { polite: '恐れ入ります', casual: '感謝です' },
    { polite: 'ご迷惑をおかけしました', casual: 'めいわくかけた' },
    { polite: '無事に完了しました', casual: '完了！' },
    { polite: '難しいかもしれません', casual: 'ちょっと厳しいかも' },
    { polite: 'お力になります', casual: '手伝うよ' },
    { polite: '準備を進めます', casual: '準備しとく' },
    { polite: '本日はありがとうございました', casual: '今日はここまで！' },

    // ── 4周目 ──
    { polite: 'お待たせしました', casual: 'おまたせ' },
    { polite: '確認いたします', casual: '確認する' },
    { polite: '感謝申し上げます', casual: 'おかげさまで' },
    { polite: '大変失礼いたしました', casual: 'やらかした…' },
    { polite: '順調です', casual: 'じゅんちょう！' },
    { polite: '助けていただけますか', casual: '助けて…' },
    { polite: '一緒に進めましょう', casual: '一緒にやろう' },
    { polite: 'まもなく到着します', casual: 'もうすぐ着く' },
    { polite: '引き続きよろしくお願いします', casual: 'ひきつづきよろしく' },

    // ── 5周目 ──
    { polite: 'ご無沙汰しております', casual: 'ひさしぶり' },
    { polite: 'なるほど、承知しました', casual: 'なるほど' },
    { polite: '重ねてお礼申し上げます', casual: '重ね重ねどうも' },
    { polite: '以後気をつけます', casual: '気をつける' },
    { polite: 'とても助かりました', casual: 'めっちゃ助かった' },
    { polite: '対応が遅れております', casual: '遅れてる…' },
    { polite: '無理なさらないでください', casual: '無理しないで' },
    { polite: '明日ご連絡します', casual: '明日連絡する' },
    { polite: 'お疲れさまでした', casual: 'また明日！' },
  ],
};
