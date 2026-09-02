import { computed, signal } from '@preact/signals';
import type { DetectFailure } from '../core/image/detect.js';
import { toBlob } from '../core/project.js';
import type { StoredImage, StoredSheet } from '../core/project.js';
import { removeBackground } from '../core/image/background.js';
import type { DetectionStrategy, PixelBuffer, StickerRegion } from '../core/image/types.js';
import { ACCEPTED_TYPES, cropToObjectUrl, loadSheet, readPixels } from '../platform/decode.js';
import type { LoadedSheet } from '../platform/decode.js';
import { prepareInWorker } from '../platform/worker/client.js';

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
  /** 背景を抜いて使っているか。表示と保存で使う */
  backgroundRemoved: boolean;
}

/** 読み込めなかったシート。1枚失敗しても他は残す。 */
export interface SheetProblem {
  name: string;
  message: string;
  hint: string;
  /** 背景を抜けば読み込めるかもしれない場合に立てる */
  canRemoveBackground?: boolean;
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
/** 保存のために、読み込んだ画像そのものも持っておく（PRODUCT_SPEC.md §51）。 */
const images = new Map<number, StoredImage>();
/** 読み込めなかったファイル。背景を抜いてやり直せるように持っておく */
const pending = new Map<string, File>();
let nextSheetId = 1;

export function getSheetSource(sheetId: number): LoadedSheet | undefined {
  return bitmaps.get(sheetId);
}

export function getSheetImage(sheetId: number): StoredImage | undefined {
  return images.get(sheetId);
}

/** 複数のシートをまとめて読み込む。1枚ずつ順に処理してメモリを抑える。 */
export async function importSheets(
  files: File[],
  options: { allowBackgroundRemoval?: boolean } = {},
): Promise<void> {
  if (files.length === 0) return;

  status.value = 'working';
  problems.value = [];
  for (const file of files) pending.set(file.name, file);

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    if (!file) continue;

    progressMessage.value =
      files.length > 1
        ? `${index + 1}枚目を読み込んでいます…（全${files.length}枚）`
        : '画像を読み込んでいます…';

    const result = await importOne(file, options.allowBackgroundRemoval ?? false);
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

async function importOne(file: File, allowBackgroundRemoval: boolean): Promise<ImportResult> {
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

  let source: LoadedSheet | null = null;
  try {
    source = await loadSheet(file);
    const pixels = readPixels(source);
    const reply = await prepareInWorker(pixels, allowBackgroundRemoval);

    if (reply.status === 'needs-background-removal') {
      source.bitmap.close();
      return {
        ok: false,
        problem: {
          name: file.name,
          message: '背景が透明ではありません。',
          hint: 'このツールは背景が透明な画像から、スタンプを1個ずつ取り出します。背景を抜いてみることもできます。',
          canRemoveBackground: true,
        },
      };
    }

    if (!reply.outcome || !reply.outcome.ok) {
      source.bitmap.close();
      return {
        ok: false,
        problem: {
          name: file.name,
          message: 'スタンプの位置をうまく判定できませんでした。',
          hint: reply.outcome ? hintFor(reply.outcome.reason) : '別の画像でお試しください。',
        },
      };
    }

    // 背景を抜いた場合は、抜いたあとの画像を切り出しに使う
    const working = reply.processed
      ? await fromPixels(reply.processed, file.name)
      : source;
    if (reply.processed) source.bitmap.close();

    const sheetId = nextSheetId++;
    bitmaps.set(sheetId, working);
    // 保存するのは抜く前の画像。いつでも戻せるようにする（PRODUCT_SPEC.md §9.4）
    images.set(sheetId, { bytes: await file.arrayBuffer(), type: file.type });

    const stickers: ExtractedSticker[] = [];
    for (const region of reply.outcome.result.regions) {
      stickers.push({
        id: `${sheetId}-${region.cellIndex}`,
        sheetId,
        region,
        previewUrl: cropToObjectUrl(working, region.bounds, PREVIEW_MAX_SIDE, region.excludeRects ?? []),
      });
    }

    return {
      ok: true,
      entry: {
        id: sheetId,
        name: file.name,
        strategy: reply.outcome.result.strategy,
        stickers,
        backgroundRemoved: reply.processed !== null,
      },
    };
  } catch (cause) {
    // ユーザーには平易な文言だけを見せ、原因は開発者コンソールへ残す
    console.error('[RUHiA Sticker Studio] シートの読み込みに失敗しました', cause);
    source?.bitmap.close();
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

/**
 * 画素から、切り出しに使えるビットマップを作る。
 *
 * ImageData は ArrayBuffer 上の Uint8ClampedArray しか受け取らないため、
 * 型を揃えてから渡す（外部から来たバッファは SharedArrayBuffer の可能性を含む型になる）。
 */
async function fromPixels(pixels: PixelBuffer, name: string): Promise<LoadedSheet> {
  const data = new Uint8ClampedArray(pixels.data.length);
  data.set(pixels.data);
  const bitmap = await createImageBitmap(new ImageData(data, pixels.width, pixels.height));
  return { name, bitmap, width: pixels.width, height: pixels.height };
}

async function fromBlob(blob: Blob, name: string): Promise<LoadedSheet> {
  const bitmap = await createImageBitmap(blob);
  return { name, bitmap, width: bitmap.width, height: bitmap.height };
}

/** 判定できなかった理由ごとの案内。技術用語は使わない（PRODUCT_SPEC.md §63）。 */
function hintFor(reason: DetectFailure): string {
  switch (reason) {
    case 'no-content':
      return '絵が見当たりませんでした。中身のある画像を選んでください。';
    case 'no-gutter':
      // 実測：段と段がくっついたシートで起きた。9個は揃っていた（§77.25）
      return '段と段の間に、透明な隙間が見つかりませんでした。上下のスタンプが近すぎるようです。文字や小物が上下の段にはみ出していないか確認してください。';
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
  images.delete(sheetId);
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

/** 背景を抜いて、もう一度読み込み直す。 */
export async function retryWithBackgroundRemoval(name: string): Promise<void> {
  const file = pending.get(name);
  if (!file) return;
  problems.value = problems.value.filter((problem) => problem.name !== name);
  await importSheets([file], { allowBackgroundRemoval: true });
}

/**
 * 保存しておいたシートを復元する。
 *
 * 抽出はやり直さない。前回と同じ結果になるとは限らず、
 * ユーザーが直した内容も失われるため、保存した範囲をそのまま使う。
 */
export async function restoreSheets(stored: StoredSheet[]): Promise<void> {
  resetAll();
  status.value = 'working';
  progressMessage.value = '前回の続きを読み込んでいます…';

  const restored: SheetEntry[] = [];
  for (const entry of stored) {
    try {
      let source = await fromBlob(toBlob(entry.image), entry.name);

      // 背景を抜いて使っていたシートは、同じ処理をやり直す。
      // 抜いた結果は保存していない（元画像だけを保存している）ため
      if (entry.backgroundRemoved === true) {
        const removed = removeBackground(readPixels(source));
        const processed = await fromPixels(removed.buffer, entry.name);
        source.bitmap.close();
        source = processed;
      }

      bitmaps.set(entry.id, source);
      images.set(entry.id, entry.image);
      nextSheetId = Math.max(nextSheetId, entry.id + 1);

      restored.push({
        id: entry.id,
        name: entry.name,
        strategy: entry.strategy,
        backgroundRemoved: entry.backgroundRemoved === true,
        stickers: entry.regions.map((region) => ({
          id: `${entry.id}-${region.cellIndex}`,
          sheetId: entry.id,
          region,
          previewUrl: cropToObjectUrl(source, region.bounds, PREVIEW_MAX_SIDE, region.excludeRects ?? []),
        })),
      });
    } catch (cause) {
      console.error('[RUHiA Sticker Studio] シートを復元できませんでした', cause);
    }
  }

  sheets.value = restored;
  progressMessage.value = '';
  status.value = restored.length > 0 ? 'ready' : 'empty';
}

/** すべて捨てて最初の状態へ戻す。 */
export function resetAll(): void {
  for (const sheet of sheets.value) {
    for (const sticker of sheet.stickers) URL.revokeObjectURL(sticker.previewUrl);
    bitmaps.get(sheet.id)?.bitmap.close();
  }
  bitmaps.clear();
  images.clear();
  pending.clear();
  sheets.value = [];
  problems.value = [];
  progressMessage.value = '';
  status.value = 'empty';
}
