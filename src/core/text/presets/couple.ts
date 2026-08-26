import type { UsePreset } from './types.js';

/** カップル用。恋人・パートナーとのやりとり向け。 */
export const COUPLE_PRESET: UsePreset = {
  id: 'couple',
  label: 'カップル用',
  description: '恋人やパートナーとのやりとり向け',
  defaultTone: 'casual',
  texts: [
    // ── 1周目 ──
    { polite: 'おはようございます', casual: 'おはよ♡' },
    { polite: 'わかりました', casual: 'うん、いいよ' },
    { polite: 'ありがとうございます', casual: 'ありがと♡' },
    { polite: 'ごめんなさい', casual: 'ごめんね…' },
    { polite: 'とてもうれしいです', casual: 'うれしい！' },
    { polite: 'さみしいです', casual: 'さみしい…' },
    { polite: '応援しています', casual: 'おうえんしてる' },
    { polite: '今から向かいます', casual: '今から行くね' },
    { polite: 'またお会いしましょう', casual: 'またね♡' },

    // ── 2周目 ──
    { polite: 'おかえりなさい', casual: 'おかえり♡' },
    { polite: 'そうしましょう', casual: 'そうしよ' },
    { polite: 'いつもありがとう', casual: 'いつもありがと' },
    { polite: '遅れてすみません', casual: '遅れちゃう…' },
    { polite: '幸せです', casual: 'しあわせ♡' },
    { polite: '会いたいです', casual: 'あいたい…' },
    { polite: 'がんばってください', casual: 'がんばってね' },
    { polite: '楽しみにしています', casual: 'たのしみ！' },
    { polite: 'おやすみなさい', casual: 'おやすみ♡' },

    // ── 3周目 ──
    { polite: 'こんにちは', casual: 'やっほ' },
    { polite: '了解しました', casual: 'りょーかい♡' },
    { polite: '本当に感謝しています', casual: 'かんしゃ♡' },
    { polite: '許してください', casual: 'ゆるして…' },
    { polite: '大好きです', casual: 'だいすき♡' },
    { polite: '心配しています', casual: 'しんぱい…' },
    { polite: '無理しないでください', casual: '無理しないでね' },
    { polite: '待っています', casual: '待ってるね' },
    { polite: 'また明日', casual: 'また明日ね♡' },

    // ── 4周目 ──
    { polite: '起きていますか', casual: 'おきてる？' },
    { polite: 'そのとおりです', casual: 'それな' },
    { polite: 'うれしかったです', casual: 'うれしかった' },
    { polite: '反省しています', casual: 'はんせいしてる' },
    { polite: '照れます', casual: 'てれる…' },
    { polite: '会えなくて残念です', casual: 'あえなくてざんねん' },
    { polite: '味方です', casual: 'みかただよ' },
    { polite: 'もうすぐ着きます', casual: 'もうすぐ着くよ' },
    { polite: 'お先に休みます', casual: 'さきに寝るね' },

    // ── 5周目 ──
    { polite: 'お久しぶりです', casual: 'ひさしぶり♡' },
    { polite: '賛成です', casual: 'さんせー' },
    { polite: 'そばにいてくれてありがとう', casual: 'そばにいてくれてありがと' },
    { polite: '悪気はありませんでした', casual: 'わるぎはないの' },
    { polite: 'にやけてしまいます', casual: 'にやにや' },
    { polite: '不安です', casual: 'ふあん…' },
    { polite: '一緒にいましょう', casual: 'いっしょにいよ' },
    { polite: '出発します', casual: 'いってきます！' },
    { polite: 'また連絡します', casual: 'また連絡するね' },
  ],
};
