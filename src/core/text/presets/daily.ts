import type { UsePreset } from './types.js';

/** 日常用。家族・友人・知人など、相手を選ばず使える基本のセット。 */
export const DAILY_PRESET: UsePreset = {
  id: 'daily',
  label: '日常用',
  description: '毎日のやりとりで使う、いちばん基本のセット',
  defaultTone: 'casual',
  texts: [
    // ── 1周目 ──
    { polite: 'おはようございます', casual: 'おはよう' },
    { polite: 'わかりました', casual: 'りょーかい' },
    { polite: 'ありがとうございます', casual: 'ありがとう' },
    { polite: 'ごめんなさい', casual: 'ごめんね' },
    { polite: 'うれしいです！', casual: 'やったー！' },
    { polite: '困りました…', casual: 'どうしよう…' },
    { polite: 'がんばってください', casual: 'がんばって！' },
    { polite: '行ってきます', casual: 'いってきまーす' },
    { polite: 'またお会いしましょう', casual: 'またね' },

    // ── 2周目 ──
    { polite: 'こんにちは', casual: 'やっほー' },
    { polite: '承知しました', casual: 'おっけー' },
    { polite: '助かりました', casual: '助かった！' },
    { polite: '遅れてすみません', casual: '遅れてごめん' },
    { polite: '最高です！', casual: 'さいこう！' },
    { polite: '疲れました…', casual: 'つかれた…' },
    { polite: '応援しています', casual: '応援してる！' },
    { polite: '今から向かいます', casual: '今から行くね' },
    { polite: '失礼します', casual: 'ばいばい' },

    // ── 3周目 ──
    { polite: 'ただいま戻りました', casual: 'ただいま' },
    { polite: 'なるほど', casual: 'なるほどね' },
    { polite: '感謝しています', casual: '感謝！' },
    { polite: '申し訳ありません', casual: 'ほんとごめん' },
    { polite: 'とてもうれしいです', casual: 'めっちゃうれしい' },
    { polite: 'まいりました…', casual: 'こまった…' },
    { polite: '大丈夫ですか', casual: 'だいじょうぶ？' },
    { polite: '準備しますね', casual: '準備するね' },
    { polite: 'また明日', casual: 'また明日ね' },

    // ── 4周目 ──
    { polite: 'お久しぶりです', casual: 'ひさしぶり！' },
    { polite: 'かしこまりました', casual: 'はーい' },
    { polite: '本当にありがとうございます', casual: 'ほんとにありがとう' },
    { polite: '失礼しました', casual: 'わるかった' },
    { polite: 'しあわせです', casual: 'しあわせ〜' },
    { polite: '泣きそうです', casual: '泣きそう…' },
    { polite: 'ファイトです！', casual: 'ファイト！' },
    { polite: 'もうすぐ着きます', casual: 'もうすぐ着く' },
    { polite: 'お先に失礼します', casual: 'お先ー' },

    // ── 5周目 ──
    { polite: 'おかえりなさい', casual: 'おかえり' },
    { polite: 'そうですね', casual: 'そうだね' },
    { polite: 'おかげさまです', casual: 'ありがとね' },
    { polite: '反省しています', casual: '反省してる…' },
    { polite: '大好きです', casual: 'だいすき' },
    { polite: 'もう限界です', casual: 'もうムリ' },
    { polite: '一緒にがんばりましょう', casual: 'いっしょにがんばろ' },
    { polite: '出発します', casual: '出発！' },
    { polite: 'おやすみなさい', casual: 'おやすみ' },
  ],
};
