import { TOTAL_SLOTS } from './categories.js';

/** 見せ方。正面が基本で、斜めと横向きで変化をつける。 */
export type Composition = 'front' | 'angle' | 'side';

export const COMPOSITION_LABELS: Record<Composition, string> = {
  front: '正面',
  angle: '斜め',
  side: '横向き',
};

export interface PoseDesign {
  /** 表情・気持ち。「様子」へそのまま続く形で持つ（例：「元気な」「感動した」） */
  emotion: string;
  /** 動作 */
  pose: string;
  /** 見せ方 */
  composition: Composition;
  /**
   * 場面に登場する小物。全体の3割程度にだけ付ける。衣装や体の特徴には触れない。
   * 文としては pose 側に書き込んであるので、この欄は変化の量を測るための控え。
   */
  prop?: string;
}

/**
 * 45スロットのポーズ設計。用途によらず共通。
 *
 * 表情やポーズはキャラクターの話であって用途の話ではないため、
 * 日常用でもビジネス用でも同じ表を使う。用途ごとに変わるのはセリフだけ。
 * これで、どの用途を選んでもポーズの多様性が保証される。
 *
 * 並び順は「9カテゴリ × 5周」。位置 p のカテゴリは (p - 1) % 9 で決まる。
 *
 * 小道具に衣装・体の特徴を含めないのは、参照画像がキャラクター外見の正であり、
 * 言語化するとそこからずれるため（PRODUCT_SPEC.md §18）。
 *
 * 相手が必要な動作は使わない。実測で「背中を押す」と指示したところ、
 * 押される相手としてキャラクターが2体描かれた。
 * スタンプは1体で成立する動作でなければならない。
 *
 * 沈んだ表情は「おわび」「困った」だけに使う。実測で、
 * 「また明日ね」に「さみしそうな」を割り当てていたため、
 * 前向きな言葉なのに浮かない顔のスタンプになった。
 * 表情は言葉と噛み合っていなければならない。
 */
export const POSE_DESIGNS: readonly PoseDesign[] = [
  // ── 1周目（シート1枚目） ──
  { emotion: '元気な', pose: '手を振る', composition: 'front' },
  { emotion: '明るい', pose: '親指を立てる', composition: 'angle' },
  { emotion: '感動した', pose: '両手を合わせる', composition: 'front' },
  { emotion: '申し訳なさそうな', pose: '深くお辞儀する', composition: 'side' },
  { emotion: '大よろこびの', pose: '両手を上げる', composition: 'front' },
  { emotion: '困惑した', pose: '首をかしげる', composition: 'angle' },
  { emotion: '力強い', pose: 'こぶしを掲げる', composition: 'front' },
  { emotion: '急いでいる', pose: 'かばんを持って走り出す', composition: 'side', prop: 'かばん' },
  { emotion: 'おだやかな', pose: '小さく手を振る', composition: 'angle' },

  // ── 2周目（シート2枚目） ──
  { emotion: '眠そうな', pose: '目をこすりながら手を振る', composition: 'angle' },
  { emotion: '真剣な', pose: '敬礼する', composition: 'front' },
  { emotion: 'にっこりした', pose: 'ぺこりとお辞儀する', composition: 'angle' },
  { emotion: 'しゅんとした', pose: '正座する', composition: 'front' },
  { emotion: 'わくわくした', pose: '風船を持ってジャンプする', composition: 'angle', prop: '風船' },
  { emotion: 'あせった', pose: '手で顔をおおう', composition: 'front' },
  { emotion: '応援する', pose: '旗を振る', composition: 'angle', prop: '旗' },
  { emotion: '楽しみな', pose: 'カレンダーを指さす', composition: 'front', prop: 'カレンダー' },
  { emotion: '名残おしそうな', pose: '振り返る', composition: 'side' },

  // ── 3周目（シート3枚目） ──
  { emotion: 'にこやかな', pose: '両手を大きく広げる', composition: 'front' },
  { emotion: '納得した', pose: '大きくうなずく', composition: 'angle' },
  { emotion: '照れた', pose: '頭をかきながら笑う', composition: 'angle' },
  { emotion: '反省した', pose: '手を合わせてあやまる', composition: 'front' },
  { emotion: '感激した', pose: '目を輝かせる', composition: 'front' },
  { emotion: '疲れた', pose: '机に突っ伏す', composition: 'side', prop: '机' },
  { emotion: 'やさしい', pose: '手をたたいて応援する', composition: 'side' },
  { emotion: '準備をする', pose: '荷物を持ち上げる', composition: 'angle', prop: '荷物' },
  { emotion: 'ごきげんな', pose: '手を振りながら歩き出す', composition: 'side' },

  // ── 4周目（シート4枚目） ──
  { emotion: '元気いっぱいの', pose: '飛び跳ねてあいさつする', composition: 'angle' },
  { emotion: 'きりっとした', pose: 'メモ帳に書きこむ', composition: 'front', prop: 'メモ帳' },
  { emotion: 'ほっこりした', pose: '花束をかかげる', composition: 'front', prop: '花束' },
  { emotion: 'あわてた', pose: '頭を下げながら走る', composition: 'side' },
  { emotion: 'はしゃいだ', pose: 'くるくる回る', composition: 'angle' },
  { emotion: '泣きそうな', pose: 'ハンカチで涙をぬぐう', composition: 'front', prop: 'ハンカチ' },
  { emotion: '熱のこもった', pose: '拳を突き上げて叫ぶ', composition: 'angle' },
  { emotion: 'のんびりした', pose: '時計をのぞきこむ', composition: 'front', prop: '時計' },
  { emotion: '明るい笑顔の', pose: '大きく手を振る', composition: 'front' },

  // ── 5周目（シート5枚目） ──
  { emotion: '落ち着いた', pose: '会釈する', composition: 'side' },
  { emotion: 'ひらめいた', pose: '指を立てる', composition: 'angle' },
  { emotion: '満面の笑みの', pose: '両手でハートの形をつくる', composition: 'front' },
  { emotion: 'しょんぼりした', pose: 'うつむく', composition: 'side' },
  { emotion: 'しあわせそうな', pose: 'ほおに手をあてて笑う', composition: 'angle' },
  { emotion: 'ぐったりした', pose: '座り込む', composition: 'front' },
  { emotion: '前向きな', pose: '胸をたたいて見せる', composition: 'angle' },
  { emotion: '出発する', pose: '傘をさして歩く', composition: 'side', prop: '傘' },
  { emotion: 'おやすみ前の', pose: '毛布にくるまる', composition: 'angle', prop: '毛布' },
];

/** 1始まりの位置から、そのスロットのポーズ設計を取り出す。 */
export function poseAt(position: number): PoseDesign {
  const found = POSE_DESIGNS[position - 1];
  if (!found) throw new Error(`位置 ${position} のポーズ設計がありません`);
  return found;
}

export const POSE_COUNT_MATCHES_SLOTS = POSE_DESIGNS.length === TOTAL_SLOTS;
