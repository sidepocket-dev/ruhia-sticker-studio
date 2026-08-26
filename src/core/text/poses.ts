import { TOTAL_SLOTS } from './categories.js';

/** 見せ方。正面が基本で、斜めと横向きで変化をつける。 */
export type Composition = 'front' | 'angle' | 'side';

export const COMPOSITION_LABELS: Record<Composition, string> = {
  front: '正面',
  angle: '斜め',
  side: '横向き',
};

export interface PoseDesign {
  /** 表情・気持ち */
  emotion: string;
  /** 動作 */
  pose: string;
  /** 見せ方 */
  composition: Composition;
  /** 小道具。全体の3割程度にだけ付ける。衣装や体の特徴には触れない。 */
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
 */
export const POSE_DESIGNS: readonly PoseDesign[] = [
  // ── 1周目（シート1枚目） ──
  { emotion: '元気', pose: '手を振る', composition: 'front' },
  { emotion: '明るい', pose: '親指を立てる', composition: 'angle' },
  { emotion: '感動', pose: '両手を合わせる', composition: 'front' },
  { emotion: '申し訳ない', pose: '深くお辞儀する', composition: 'side' },
  { emotion: '大よろこび', pose: '両手を上げる', composition: 'front' },
  { emotion: '困惑', pose: '首をかしげる', composition: 'angle' },
  { emotion: '力強い', pose: 'こぶしを掲げる', composition: 'front' },
  { emotion: '急ぎ', pose: '走り出す', composition: 'side', prop: 'かばん' },
  { emotion: 'おだやか', pose: '小さく手を振る', composition: 'angle' },

  // ── 2周目（シート2枚目） ──
  { emotion: '眠そう', pose: '目をこすりながら手を振る', composition: 'angle' },
  { emotion: '真剣', pose: '敬礼する', composition: 'front' },
  { emotion: 'にっこり', pose: 'ぺこりとお辞儀する', composition: 'angle' },
  { emotion: 'しゅんとした', pose: '正座する', composition: 'front' },
  { emotion: 'わくわく', pose: 'ジャンプする', composition: 'angle', prop: '風船' },
  { emotion: '焦り', pose: '手で顔をおおう', composition: 'front' },
  { emotion: '応援', pose: '旗を振る', composition: 'angle', prop: '旗' },
  { emotion: '楽しみ', pose: 'カレンダーを指さす', composition: 'front', prop: 'カレンダー' },
  { emotion: '名残おしい', pose: '振り返る', composition: 'side' },

  // ── 3周目（シート3枚目） ──
  { emotion: 'にこやか', pose: '両手を広げて迎える', composition: 'front' },
  { emotion: '納得', pose: '大きくうなずく', composition: 'angle' },
  { emotion: '照れ', pose: '頭をかきながら笑う', composition: 'angle' },
  { emotion: '反省', pose: '手を合わせてあやまる', composition: 'front' },
  { emotion: '感激', pose: '目を輝かせる', composition: 'front' },
  { emotion: '疲れ', pose: '机に突っ伏す', composition: 'side', prop: '机' },
  { emotion: 'やさしい', pose: '背中を押す', composition: 'side' },
  { emotion: '準備', pose: '荷物を持ち上げる', composition: 'angle', prop: '荷物' },
  { emotion: 'さみしい', pose: '手を振りながら歩き出す', composition: 'side' },

  // ── 4周目（シート4枚目） ──
  { emotion: '元気いっぱい', pose: '飛び跳ねてあいさつする', composition: 'angle' },
  { emotion: 'きりっとした', pose: 'メモを取る', composition: 'front', prop: 'メモ帳' },
  { emotion: 'ほっこり', pose: '花束を差し出す', composition: 'front', prop: '花束' },
  { emotion: 'あわてる', pose: '頭を下げながら走る', composition: 'side' },
  { emotion: 'はしゃぐ', pose: 'くるくる回る', composition: 'angle' },
  { emotion: '泣きそう', pose: '涙をこらえる', composition: 'front', prop: 'ハンカチ' },
  { emotion: '熱い', pose: '拳を突き上げて叫ぶ', composition: 'angle' },
  { emotion: 'のんびり', pose: '時計を見る', composition: 'front', prop: '時計' },
  { emotion: '明るい笑顔', pose: '大きく手を振る', composition: 'front' },

  // ── 5周目（シート5枚目） ──
  { emotion: '落ち着き', pose: '会釈する', composition: 'side' },
  { emotion: 'ひらめき', pose: '指を立てる', composition: 'angle' },
  { emotion: '満面の笑み', pose: '抱きしめるしぐさをする', composition: 'front' },
  { emotion: 'しょんぼり', pose: 'うつむく', composition: 'side' },
  { emotion: 'しあわせ', pose: 'ほおに手をあてて笑う', composition: 'angle' },
  { emotion: 'ぐったり', pose: '座り込む', composition: 'front' },
  { emotion: '前向き', pose: '手を差し伸べる', composition: 'angle' },
  { emotion: '出発', pose: '傘をさして歩く', composition: 'side', prop: '傘' },
  { emotion: 'おやすみ', pose: '毛布にくるまる', composition: 'angle', prop: '毛布' },
];

/** 1始まりの位置から、そのスロットのポーズ設計を取り出す。 */
export function poseAt(position: number): PoseDesign {
  const found = POSE_DESIGNS[position - 1];
  if (!found) throw new Error(`位置 ${position} のポーズ設計がありません`);
  return found;
}

export const POSE_COUNT_MATCHES_SLOTS = POSE_DESIGNS.length === TOTAL_SLOTS;
