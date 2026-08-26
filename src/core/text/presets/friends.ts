import type { UsePreset } from './types.js';

/** 友達用。気のおけない相手とのやりとり向け。 */
export const FRIENDS_PRESET: UsePreset = {
  id: 'friends',
  label: '友達用',
  description: '気のおけない相手とのやりとり向け',
  defaultTone: 'casual',
  texts: [
    // ── 1周目 ──
    { polite: 'おはようございます', casual: 'おっはよー' },
    { polite: 'わかりました', casual: 'おけ' },
    { polite: 'ありがとうございます', casual: 'サンキュー' },
    { polite: 'ごめんなさい', casual: 'ごめーん' },
    { polite: '楽しいです！', casual: 'たのしい！' },
    { polite: '困っています', casual: 'ピンチ…' },
    { polite: '応援します', casual: 'いけいけー！' },
    { polite: '今から向かいます', casual: '今から行く' },
    { polite: 'また今度', casual: 'またねー' },

    // ── 2周目 ──
    { polite: 'こんにちは', casual: 'ちわっす' },
    { polite: 'そうなんですね', casual: 'そーなんだ' },
    { polite: '感謝しています', casual: 'まじ感謝' },
    { polite: '遅れてすみません', casual: '遅れる〜' },
    { polite: '最高です', casual: 'さいこう！' },
    { polite: '疲れました', casual: 'つかれた' },
    { polite: 'がんばってください', casual: 'ファイトー！' },
    { polite: '準備できました', casual: '準備できた' },
    { polite: 'おやすみなさい', casual: 'おやすみー' },

    // ── 3周目 ──
    { polite: 'お久しぶりです', casual: 'ひさしぶりー' },
    { polite: '了解しました', casual: 'あいよ' },
    { polite: '助かりました', casual: 'たすかる〜' },
    { polite: '申し訳ないです', casual: 'すまん！' },
    { polite: 'うれしいです', casual: 'うれしすぎ' },
    { polite: 'つらいです', casual: 'しんどい…' },
    { polite: '大丈夫ですか', casual: 'だいじょぶ？' },
    { polite: '今どこにいますか', casual: 'いまどこ？' },
    { polite: 'また明日', casual: 'また明日ね' },

    // ── 4周目 ──
    { polite: '元気ですか', casual: 'げんき？' },
    { polite: 'なるほど', casual: 'なるほどねー' },
    { polite: '本当にありがとう', casual: 'ありがとねー' },
    { polite: '反省しています', casual: 'わるかった〜' },
    { polite: '笑ってしまいました', casual: 'うけるｗ' },
    { polite: '悲しいです', casual: 'かなしい…' },
    { polite: '無理しないでください', casual: '無理すんなよ' },
    { polite: 'もうすぐ着きます', casual: 'もうつく' },
    { polite: 'お先に失礼します', casual: 'さきいくねー' },

    // ── 5周目 ──
    { polite: '呼びました', casual: 'おーい' },
    { polite: 'いいですね', casual: 'いいね！' },
    { polite: '助けてくれてありがとう', casual: '助かったわ〜' },
    { polite: '許してください', casual: 'ゆるして' },
    { polite: '大好きです', casual: 'すきー' },
    { polite: '眠いです', casual: 'ねむい…' },
    { polite: '一緒にがんばりましょう', casual: 'いっしょにがんばろ' },
    { polite: '待っています', casual: '待ってるー' },
    { polite: 'またいつか', casual: 'ばいばーい' },
  ],
};
