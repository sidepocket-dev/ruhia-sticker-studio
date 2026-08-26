import { computed, signal } from '@preact/signals';
import { IMAGE_CONFIG } from '../config/app-config.js';
import { toAlphaMask, transparentRatio } from '../core/image/alpha-mask.js';
import type { DetectFailure } from '../core/image/detect.js';
import type { DetectionStrategy, StickerRegion } from '../core/image/types.js';
import { ACCEPTED_TYPES, cropToObjectUrl, loadSheet, readPixels } from '../platform/decode.js';
import type { LoadedSheet } from '../platform/decode.js';
import { detectSheet } from '../platform/worker/client.js';

/** 一覧表示用の縮小サイズ。LINEの規格とは無関係。 */
const PREVIEW_MAX_SIDE = 300;

export interface ExtractedSticker {
  /** シートをまたいで一意 */
  id: string;
  sheetId: number;
  region: StickerRegion;
  previewUrl: string;
}

export interface SheetEntry {
  id: number;
  name: string;
  strategy: DetectionStrategy;
  stickers: ExtractedSticker[];
}

/** 読み込めなかったシート。1枚失敗しても他は残す。 */
export interface SheetProblem {
  name: string;
  message: string;
  hint: string;
}

export type SheetStatus = 'empty' | 'working' | 'ready';

export const status = signal<SheetStatus>('empty');
/** 進行中の作業内容。技術用語を出さない平易な日本語にする。 */
export const progressMessage = signal<string>('');
export const sheets = signal<SheetEntry[]>([]);
export const problems = signal<SheetProblem[]>([]);

/** すべてのシートの候補を、シートの並び順どおりに連結したもの。 */
export const candidates = computed<ExtractedSticker[]>(() =>
  sheets.value.flatMap((sheet) => sheet.stickers),
);

const bitmaps = new Map<number, LoadedSheet>();
let nextSheetId = 1;

export function getSheetSource(sheetId: number): LoadedSheet | undefined {
  return bitmaps.get(sheetId);
}

/** 複数のシートをまとめて読み込む。1枚ずつ順に処理してメモリを抑える。 */
export async function importSheets(files: File[]): Promise<void> {
  if (files.length === 0) return;

  status.value = 'working';
  problems.value = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    if (!file) continue;

    progressMessage.value =
      files.length > 1
        ? `${index + 1}枚目を読み込んでいます…（全${files.length}枚）`
        : '画像を読み込んでいます…';

    const result = await importOne(file);
    if (!result.ok) {
      problems.value = [...problems.value, result.problem];
    } else {
      sheets.value = [...sheets.value, result.entry];
    }
  }

  progressMessage.value = '';
  status.value = sheets.value.length > 0 ? 'ready' : 'empty';
}

type ImportResult = { ok: true; entry: SheetEntry } | { ok: false; problem: SheetProblem };

async function importOne(file: File): Promise<ImportResult> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return {
      ok: false,
      problem: {
        name: file.name,
        message: 'この形式のファイルは読み込めません。',
        hint: 'PNG、JPEG、WebP のいずれかを選んでください。背景が透明なPNGをおすすめします。',
      },
    };
  }

  try {
    const source = await loadSheet(file);
    const pixels = readPixels(source);

    const mask = toAlphaMask(pixels, IMAGE_CONFIG.alphaThreshold);
    if (transparentRatio(mask) < IMAGE_CONFIG.minTransparentRatio) {
      source.bitmap.close();
      return {
        ok: false,
        problem: {
          name: file.name,
          message: '背景が透明ではありません。',
          hint: 'このツールは背景が透明な画像から、スタンプを1個ずつ取り出します。背景を透明にした画像をご用意ください。',
        },
      };
    }

    const outcome = await detectSheet(pixels);
    if (!outcome.ok) {
      source.bitmap.close();
      return {
        ok: false,
        problem: {
          name: file.name,
          message: 'スタンプの位置をうまく判定できませんでした。',
          hint: hintFor(outcome.reason),
        },
      };
    }

    const sheetId = nextSheetId++;
    bitmaps.set(sheetId, source);

    const stickers: ExtractedSticker[] = [];
    for (const region of outcome.result.regions) {
      stickers.push({
        id: `${sheetId}-${region.cellIndex}`,
        sheetId,
        region,
        previewUrl: cropToObjectUrl(source, region.bounds, PREVIEW_MAX_SIDE),
      });
    }

    return {
      ok: true,
      entry: { id: sheetId, name: file.name, strategy: outcome.result.strategy, stickers },
    };
  } catch (cause) {
    // ユーザーには平易な文言だけを見せ、原因は開発者コンソールへ残す
    console.error('[RUHiA Sticker Studio] シートの読み込みに失敗しました', cause);
    return {
      ok: false,
      problem: {
        name: file.name,
        message: '画像を読み込めませんでした。',
        hint: '別の画像でお試しください。',
      },
    };
  }
}

/** 判定できなかった理由ごとの案内。技術用語は使わない（PRODUCT_SPEC.md §63）。 */
function hintFor(reason: DetectFailure): string {
  switch (reason) {
    case 'no-content':
      return '絵が見当たりませんでした。中身のある画像を選んでください。';
    case 'empty-cell':
      return '空いている場所があるようです。9個そろっているか確認してください。';
    case 'too-few-components':
      return 'スタンプどうしがくっついているようです。間を広くあけた画像でお試しください。';
  }
}

/** シート1枚を取り除く。 */
export function removeSheet(sheetId: number): void {
  const entry = sheets.value.find((sheet) => sheet.id === sheetId);
  for (const sticker of entry?.stickers ?? []) URL.revokeObjectURL(sticker.previewUrl);

  bitmaps.get(sheetId)?.bitmap.close();
  bitmaps.delete(sheetId);
  sheets.value = sheets.value.filter((sheet) => sheet.id !== sheetId);
  if (sheets.value.length === 0) status.value = 'empty';
}

/** シートの順番を入れ替える。候補の通し番号もこの順になる（PRODUCT_SPEC.md §38）。 */
export function moveSheet(from: number, to: number): void {
  const order = [...sheets.value];
  if (from < 0 || from >= order.length || to < 0 || to >= order.length || from === to) return;
  const [moved] = order.splice(from, 1);
  if (!moved) return;
  order.splice(to, 0, moved);
  sheets.value = order;
}

export function dismissProblems(): void {
  problems.value = [];
}

/** すべて捨てて最初の状態へ戻す。 */
export function resetAll(): void {
  for (const sheet of sheets.value) {
    for (const sticker of sheet.stickers) URL.revokeObjectURL(sticker.previewUrl);
    bitmaps.get(sheet.id)?.bitmap.close();
  }
  bitmaps.clear();
  sheets.value = [];
  problems.value = [];
  progressMessage.value = '';
  status.value = 'empty';
}
