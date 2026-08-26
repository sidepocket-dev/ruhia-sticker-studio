import type { UsePreset } from './types.js';

/** 学校用。授業・部活・友達とのやりとりなど、学校生活で実際に使う言葉。 */
export const SCHOOL_PRESET: UsePreset = {
  id: 'school',
  label: '学校用',
  description: '授業・部活・友達とのやりとりなど、学校生活で使う言葉',
  defaultTone: 'casual',
  texts: [
    // ── 1周目 ──
    { polite: 'おはようございます', casual: 'おはよ' },
    { polite: 'わかりました', casual: 'わかった' },
    { polite: 'ありがとうございます', casual: 'ありがと' },
    { polite: '遅刻してすみません', casual: '遅刻した…' },
    { polite: 'できました！', casual: 'できた！' },
    { polite: 'わかりません', casual: 'わかんない…' },
    { polite: 'がんばりましょう', casual: 'がんばろー' },
    { polite: '教室に向かいます', casual: '教室行くね' },
    { polite: 'また明日', casual: 'また明日ー' },

    // ── 2周目 ──
    { polite: 'おはようございます、先生', casual: 'せんせー、おはよ' },
    { polite: '了解しました', casual: 'りょーかい' },
    { polite: '教えてくれてありがとう', casual: '教えてくれてありがと' },
    { polite: '宿題を忘れました', casual: '宿題わすれた…' },
    { polite: 'テストが終わりました', casual: 'テスト終わったー！' },
    { polite: '眠いです', casual: 'ねむい…' },
    { polite: 'テストがんばって', casual: 'テストがんば！' },
    { polite: 'お昼にしましょう', casual: 'おひるにしよ' },
    { polite: '先に帰ります', casual: 'さきに帰るね' },

    // ── 3周目 ──
    { polite: 'こんにちは', casual: 'やっほ' },
    { polite: 'なるほど、わかりました', casual: 'なるほど！' },
    { polite: 'ノートを貸してくれてありがとう', casual: 'ノートありがと' },
    { polite: '忘れ物をしました', casual: 'わすれものした…' },
    { polite: '休み時間です', casual: 'やすみ時間だー' },
    { polite: '難しいです', casual: 'むずかしい…' },
    { polite: '一緒に勉強しましょう', casual: 'いっしょに勉強しよ' },
    { polite: '部活に行きます', casual: '部活いってくる' },
    { polite: 'さようなら', casual: 'ばいばい' },

    // ── 4周目 ──
    { polite: '久しぶりですね', casual: 'ひさしぶりー' },
    { polite: '質問があります', casual: 'しつもーん' },
    { polite: '助かりました', casual: 'たすかった〜' },
    { polite: '間違えました', casual: 'まちがえた…' },
    { polite: '合格しました！', casual: 'ごうかく！' },
    { polite: '疲れました', casual: 'つかれた…' },
    { polite: '応援しています', casual: 'おうえんしてる！' },
    { polite: 'もうすぐ着きます', casual: 'もうすぐ着く' },
    { polite: 'また来週', casual: 'また来週ー' },

    // ── 5周目 ──
    { polite: '呼びました', casual: 'ねえねえ' },
    { polite: 'そうですね', casual: 'それな' },
    { polite: '本当に感謝しています', casual: '感謝！' },
    { polite: '次は気をつけます', casual: 'つぎは気をつける' },
    { polite: 'うれしいです', casual: 'やったー！' },
    { polite: 'あきらめそうです', casual: 'もうムリかも' },
    { polite: '一緒にがんばりましょう', casual: 'いっしょにがんばろ' },
    { polite: '一緒に帰りましょう', casual: 'いっしょに帰ろ' },
    { polite: 'おやすみなさい', casual: 'おやすみー' },
  ],
};
