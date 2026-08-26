import type { DetectionStrategy, StickerRegion } from './image/types.js';
import type { CropAdjustment } from './line/layout.js';
import type { Tone, UsePresetId } from './text/presets.js';

/**
 * 保存するプロジェクトの中身（PRODUCT_SPEC.md §51）。
 *
 * 40個の制作は長時間になる。ブラウザを閉じたら消える作りにはしない。
 * 画像そのものも保存する。抽出結果だけ残しても、切り出し直せないため。
 */
export const PROJECT_VERSION = 1;

/**
 * 読み込んだ画像そのもの。
 *
 * Blob ではなくバイト列で持つ。WebKit は IndexedDB に Blob を保存できず、
 * 「Error preparing Blob/File data to be stored in object store」で失敗する。
 * ArrayBuffer なら保存できることを実測で確認している。
 */
export interface StoredImage {
  bytes: ArrayBuffer;
  /** image/png など */
  type: string;
}

export interface StoredSheet {
  id: number;
  name: string;
  strategy: DetectionStrategy;
  regions: StickerRegion[];
  /** 読み込んだ画像そのもの。背景を抜いた場合も、抜く前を保持する（§9.4） */
  image: StoredImage;
  /**
   * 背景を抜いて使っているか。
   * 抜いた結果は保存せず、復元時に同じ処理をやり直す。
   * 元画像を残しておけば、いつでも抜く前へ戻せる。
   */
  backgroundRemoved?: boolean;
}

export function toBlob(image: StoredImage): Blob {
  return new Blob([image.bytes], { type: image.type });
}

export interface ProjectSnapshot {
  version: number;
  /** ISO 8601。保存した時刻 */
  savedAt: string;
  targetCount: number;
  preset: UsePresetId;
  tone: Tone;
  /** 書き換えたセリフ。キーは通し番号 */
  textOverrides: Record<number, string>;
  sheets: StoredSheet[];
  selectedIds: string[];
  mainId: string | null;
  tabId: string | null;
  tabAdjustment: CropAdjustment;
}

/** 保存されていた中身が、いまのバージョンで読めるか。 */
export function isReadable(snapshot: unknown): snapshot is ProjectSnapshot {
  if (typeof snapshot !== 'object' || snapshot === null) return false;
  const value = snapshot as Partial<ProjectSnapshot>;
  return (
    value.version === PROJECT_VERSION &&
    Array.isArray(value.sheets) &&
    Array.isArray(value.selectedIds) &&
    typeof value.targetCount === 'number'
  );
}

/** 保存内容の要約。「前回の続き」を案内するために使う。 */
export function describeSnapshot(snapshot: ProjectSnapshot): string {
  const sheets = snapshot.sheets.length;
  const selected = snapshot.selectedIds.length;
  return `シート${sheets}枚・${selected}個選択済み`;
}
