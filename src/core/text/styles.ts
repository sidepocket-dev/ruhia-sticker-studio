/**
 * 全体の仕上がり設定（追加仕様 §6）。
 *
 * モデル固有ではなく、スタンプ全体の設定として扱う。
 * 標準は「おまかせ」。モデル本来のステッカー表現を活かせるよう、
 * 余計な指定を足さない（追加仕様 §5）。
 *
 * 文字色や装飾の指定は「おまかせ」には入れない。
 * 以前の検証で、指定なしのほうがキャラクターの可愛さが際立つ仕上がりになった一方、
 * 「文字をカラフルに」と指定すると文字が目立つ仕上がりになった。
 * どちらも用途によって使えるため、片方に固定しない。
 *
 * 各プリセットが実際に見た目を変えられるかは、生成して確かめる必要がある
 * （追加仕様 §6 / §8.3）。差が出ないものは整理する。
 */
export type StylePresetId = 'auto' | 'character' | 'balanced' | 'text' | 'calm';

export interface StylePreset {
  id: StylePresetId;
  label: string;
  description: string;
  /** プロンプトへ足す文。おまかせは何も足さない */
  lines: readonly string[];
}

export const STYLE_PRESETS: readonly StylePreset[] = [
  {
    id: 'auto',
    label: 'おまかせ',
    description: 'AIの得意な表現にまかせます',
    lines: [],
  },
  {
    id: 'character',
    label: 'キャラクター重視',
    description: 'キャラクターを主役に見せます',
    lines: [
      'キャラクターを主役として大きく見せてください。',
      'セリフはキャラクターを隠さない大きさにしてください。',
    ],
  },
  {
    id: 'balanced',
    label: 'バランス',
    description: 'キャラクターもセリフも見やすく',
    lines: ['キャラクターとセリフの両方がはっきり見えるようにしてください。'],
  },
  {
    id: 'text',
    label: '文字くっきり',
    description: 'セリフを目立たせます',
    lines: [
      'セリフを大きく、はっきり目立たせてください。',
      '文字色はカラフルで楽しい印象にして構いません。',
    ],
  },
  {
    id: 'calm',
    label: '落ち着いた仕上がり',
    description: '仕事の連絡でも使いやすく',
    lines: [
      // 「派手にしすぎず」だけでは効かなかった（§77.24）。
      // まとめて頼むプロンプトと同じで、数えられる形で書く
      '文字色は1〜2色にとどめ、彩度の低い落ち着いた色にしてください。',
      'ハート、星、キラキラ、効果線などの飾りは付けないでください。',
      '仕事の連絡でも使いやすい、落ち着いた見た目にしてください。',
    ],
  },
];

export function findStyle(id: StylePresetId): StylePreset {
  return STYLE_PRESETS.find((style) => style.id === id) ?? STYLE_PRESETS[0]!;
}
