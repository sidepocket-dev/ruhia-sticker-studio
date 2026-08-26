/**
 * LINE静止画スタンプの規格。
 *
 * PRODUCT_SPEC.md §6 のとおり、LINEの規格値は**このファイルにのみ**書く。
 * 他のどのファイルにも 370 / 320 / 240 / 96 / 74 といった数値を直接書いてはならない
 * (tests/unit/architecture.test.ts が機械的に検証する)。
 *
 * リリース前には最新のLINE公式ガイドラインを再確認し、verifiedAt を更新すること。
 */
export const LINE_STATIC_STICKER_SPEC = {
  /** この規格値を公式ガイドラインで確認した日 */
  verifiedAt: '2026-08-26',

  /** LINEが受け付けるスタンプ個数 */
  allowedCounts: [8, 16, 24, 32, 40],

  /** スタンプ画像。この寸法「以内」であればよい (ちょうどである必要はない) */
  sticker: {
    maxWidth: 370,
    maxHeight: 320,
    maxBytes: 1_000_000,
  },

  /** メイン画像。この寸法「ちょうど」であること */
  main: {
    width: 240,
    height: 240,
  },

  /** トークルームタブ画像。この寸法「ちょうど」であること */
  tab: {
    width: 96,
    height: 74,
  },

  /** ZIP全体の上限 */
  zipMaxBytes: 60_000_000,

  /** 提出ZIP内のファイル名 */
  fileNames: {
    main: 'main.png',
    tab: 'tab.png',
    /** スタンプは 01.png から連番 */
    stickerPad: 2,
    stickerExt: '.png',
  },

  /** 提出ZIPの名前 */
  zipName: 'LINE_UPLOAD.zip',
} as const;

export type AllowedStickerCount = (typeof LINE_STATIC_STICKER_SPEC.allowedCounts)[number];

/** 1シートあたりのステッカー数 (3 × 3) */
export const STICKERS_PER_SHEET = 9;

/** LINEが受け付ける個数か */
export function isAllowedStickerCount(count: number): boolean {
  const allowed: readonly number[] = LINE_STATIC_STICKER_SPEC.allowedCounts;
  return allowed.includes(count);
}

/**
 * 目標個数に対して用意すべき候補数。
 * PRODUCT_SPEC.md §21: ceil(target / 9) × 9
 */
export function candidateCountFor(targetCount: number): number {
  return sheetCountFor(targetCount) * STICKERS_PER_SHEET;
}

/** 目標個数に対して必要なシート枚数 */
export function sheetCountFor(targetCount: number): number {
  return Math.ceil(targetCount / STICKERS_PER_SHEET);
}

/** 1始まりの順番からスタンプのファイル名を作る (1 → "01.png") */
export function stickerFileName(sequence: number): string {
  const { stickerPad, stickerExt } = LINE_STATIC_STICKER_SPEC.fileNames;
  return `${String(sequence).padStart(stickerPad, '0')}${stickerExt}`;
}
