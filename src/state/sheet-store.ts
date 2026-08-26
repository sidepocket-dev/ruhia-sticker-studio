import { signal } from '@preact/signals';
import { IMAGE_CONFIG } from '../config/app-config.js';
import { toAlphaMask, transparentRatio } from '../core/image/alpha-mask.js';
import type { StickerRegion } from '../core/image/types.js';
import { ACCEPTED_TYPES, cropToObjectUrl, loadSheet, readPixels } from '../platform/decode.js';
import type { LoadedSheet } from '../platform/decode.js';
import { detectSheet } from '../platform/worker/client.js';

export interface ExtractedSticker {
  region: StickerRegion;
  previewUrl: string;
}

export type SheetStatus = 'empty' | 'working' | 'ready' | 'failed';

/** 一覧表示用の縮小サイズ。LINEの規格とは無関係。 */
const PREVIEW_MAX_SIDE = 300;

export const status = signal<SheetStatus>('empty');
/** 進行中の作業内容。技術用語を出さない平易な日本語にする。 */
export const progressMessage = signal<string>('');
export const errorMessage = signal<string>('');
export const errorHint = signal<string>('');
export const sheetName = signal<string>('');
export const stickers = signal<ExtractedSticker[]>([]);

let currentSheet: LoadedSheet | null = null;

function releasePreviews(): void {
  for (const sticker of stickers.value) URL.revokeObjectURL(sticker.previewUrl);
  stickers.value = [];
}

function fail(message: string, hint: string): void {
  status.value = 'failed';
  progressMessage.value = '';
  errorMessage.value = message;
  errorHint.value = hint;
}

/** シートを1枚読み込み、9個のスタンプを取り出す。 */
export async function importSheet(file: File): Promise<void> {
  releasePreviews();
  errorMessage.value = '';
  errorHint.value = '';
  status.value = 'working';
  sheetName.value = file.name;

  if (!ACCEPTED_TYPES.includes(file.type)) {
    fail(
      'この形式のファイルは読み込めません。',
      'PNG、JPEG、WebP のいずれかを選んでください。背景が透明なPNGをおすすめします。',
    );
    return;
  }

  try {
    progressMessage.value = '画像を読み込んでいます…';
    const sheet = await loadSheet(file);
    currentSheet = sheet;

    progressMessage.value = '背景を確認しています…';
    const pixels = readPixels(sheet);

    const mask = toAlphaMask(pixels, IMAGE_CONFIG.alphaThreshold);
    if (transparentRatio(mask) < IMAGE_CONFIG.minTransparentRatio) {
      fail(
        '背景が透明ではありません。',
        'このツールは背景が透明な画像から、スタンプを1個ずつ取り出します。背景を透明にした画像をご用意ください。',
      );
      return;
    }

    progressMessage.value = 'スタンプを探しています…';
    const outcome = await detectSheet(pixels);

    if (!outcome.ok) {
      fail(
        'スタンプの位置をうまく判定できませんでした。',
        outcome.reason === 'empty-cell'
          ? '9個そろっているか確認してください。空いている場所があるようです。'
          : 'スタンプどうしが近すぎるか、重なっているようです。スタンプの間を広くあけた画像でお試しください。',
      );
      return;
    }

    progressMessage.value = 'スタンプを切り出しています…';
    const extracted: ExtractedSticker[] = [];
    for (const region of outcome.result.regions) {
      extracted.push({
        region,
        previewUrl: await cropToObjectUrl(sheet, region.bounds, PREVIEW_MAX_SIDE),
      });
    }

    stickers.value = extracted;
    status.value = 'ready';
    progressMessage.value = '';
  } catch (cause) {
    // ユーザーには平易な文言だけを見せ、原因は開発者コンソールへ残す
    console.error('[RUHiA Sticker Studio] シートの読み込みに失敗しました', cause);
    fail('画像を読み込めませんでした。', '別の画像でお試しください。');
  }
}

/** 読み込んだシートを捨てて最初の状態へ戻す。 */
export function resetSheet(): void {
  releasePreviews();
  currentSheet?.bitmap.close();
  currentSheet = null;
  sheetName.value = '';
  errorMessage.value = '';
  errorHint.value = '';
  progressMessage.value = '';
  status.value = 'empty';
}

export function getCurrentSheet(): LoadedSheet | null {
  return currentSheet;
}
