import type { UsePreset } from './types.js';

/** 家族用。家族・親戚とのやりとり向け。連絡や気づかいの言葉を中心に。 */
export const FAMILY_PRESET: UsePreset = {
  id: 'family',
  label: '家族用',
  description: '家族や親戚との連絡・気づかいの言葉',
  defaultTone: 'casual',
  texts: [
    // ── 1周目 ──
    { polite: 'おはようございます', casual: 'おはよう' },
    { polite: 'わかりました', casual: 'わかったよ' },
    { polite: 'ありがとうございます', casual: 'ありがとう' },
    { polite: 'ごめんなさい', casual: 'ごめんね' },
    { polite: 'うれしいです', casual: 'うれしい！' },
    { polite: '困っています', casual: 'こまった…' },
    { polite: '無理しないでください', casual: '無理しないでね' },
    { polite: '行ってきます', casual: 'いってきます' },
    { polite: 'また連絡します', casual: 'また連絡するね' },

    // ── 2周目 ──
    { polite: 'ただいま帰りました', casual: 'ただいま' },
    { polite: '了解しました', casual: 'りょーかい' },
    { polite: 'いつもありがとうございます', casual: 'いつもありがとう' },
    { polite: '遅くなってすみません', casual: '遅くなってごめん' },
    { polite: '楽しかったです', casual: 'たのしかった！' },
    { polite: '疲れました', casual: 'つかれた…' },
    { polite: '体に気をつけてください', casual: '体に気をつけてね' },
    { polite: '買い物に行ってきます', casual: '買い物いってくる' },
    { polite: 'おやすみなさい', casual: 'おやすみ' },

    // ── 3周目 ──
    { polite: 'おかえりなさい', casual: 'おかえり' },
    { polite: 'そうしましょう', casual: 'そうしよう' },
    { polite: '助かりました', casual: '助かったよ' },
    { polite: '心配をかけてごめんなさい', casual: '心配かけてごめん' },
    { polite: '元気です', casual: 'げんきだよ' },
    { polite: '風邪をひきました', casual: '風邪ひいた…' },
    { polite: 'ゆっくり休んでください', casual: 'ゆっくり休んでね' },
    { polite: '夕飯はいりません', casual: '夕飯いらない' },
    { polite: 'また今度', casual: 'また今度ね' },

    // ── 4周目 ──
    { polite: 'お久しぶりです', casual: 'ひさしぶり' },
    { polite: '承知しました', casual: 'はーい' },
    { polite: '心から感謝しています', casual: '感謝してる' },
    { polite: '反省しています', casual: '反省してる' },
    { polite: '会えてうれしいです', casual: '会えてうれしい' },
    { polite: '寝坊しました', casual: 'ねぼうした…' },
    { polite: '応援しています', casual: '応援してるよ' },
    { polite: 'もうすぐ着きます', casual: 'もうすぐ着くよ' },
    { polite: '気をつけて帰ってください', casual: '気をつけて帰ってね' },

    // ── 5周目 ──
    { polite: '元気にしていますか', casual: 'げんきー？' },
    { polite: 'なるほど', casual: 'なるほどね' },
    { polite: 'ごちそうさまでした', casual: 'ごちそうさま！' },
    { polite: '次は気をつけます', casual: '次は気をつけるね' },
    { polite: 'しあわせです', casual: 'しあわせ' },
    { polite: 'さみしいです', casual: 'さみしいな' },
    { polite: '手伝いましょうか', casual: '手伝おうか？' },
    { polite: 'これから帰ります', casual: 'これから帰るね' },
    { polite: 'またね', casual: 'またねー' },
  ],
};
