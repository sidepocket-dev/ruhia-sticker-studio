import { computed, effect, signal } from '@preact/signals';
import { EXPORT_CONFIG, IMAGE_CONFIG } from '../config/app-config.js';
import { LINE_STATIC_STICKER_SPEC, stickerFileName } from '../config/line-spec.js';
import type { Bytes } from '../core/bytes.js';
import {
  NEUTRAL_CROP,
  computeAdjustedLayout,
  computeFixedLayout,
  computeStickerSetLayout,
} from '../core/line/layout.js';
import type { CropAdjustment, ImageLayout } from '../core/line/layout.js';
import { validateExport } from '../core/line/validator.js';
import type { ExportedImage, ValidationIssue } from '../core/line/validator.js';
import { renderToPng } from '../platform/render.js';
import { createZip, downloadBytes } from '../platform/zip.js';
import { getCurrentSheet } from './sheet-store.js';
import type { ExtractedSticker } from './sheet-store.js';
import { stickers } from './sheet-store.js';

const SPEC = LINE_STATIC_STICKER_SPEC;

/** v1のMVPは1シート＝9候補なので、作れるのは8個セットのみ。 */
export const targetCount = signal<number>(8);

/** 選ばれたスタンプの cellIndex。並び順そのもの。 */
export const selectedIds = signal<number[]>([]);
export const mainId = signal<number | null>(null);
export const tabId = signal<number | null>(null);
export const tabAdjustment = signal<CropAdjustment>(NEUTRAL_CROP);

export const mainPreviewUrl = signal<string>('');
export const tabPreviewUrl = signal<string>('');

export type ExportStatus = 'idle' | 'working' | 'done';
export const exportStatus = signal<ExportStatus>('idle');
export const exportIssues = signal<ValidationIssue[]>([]);

export const selectedCount = computed(() => selectedIds.value.length);
export const remainingToSelect = computed(() => targetCount.value - selectedIds.value.length);

/** 選択状況の案内文（PRODUCT_SPEC.md §40）。 */
export const selectionMessage = computed(() => {
  const remaining = remainingToSelect.value;
  if (remaining === 0) return `${targetCount.value} / ${targetCount.value} 選択済み`;
  if (remaining > 0) return `あと${remaining}個選んでください。`;
  return `あと${-remaining}個外してください。`;
});

/** シートを読み込み直したら、選択もやり直す。すぐ書き出せる状態を初期値にする。 */
effect(() => {
  const extracted = stickers.value;
  if (extracted.length === 0) {
    selectedIds.value = [];
    mainId.value = null;
    tabId.value = null;
    exportStatus.value = 'idle';
    exportIssues.value = [];
    return;
  }

  const defaults = extracted.slice(0, targetCount.peek()).map((s) => s.region.cellIndex);
  selectedIds.value = defaults;
  mainId.value = defaults[0] ?? null;
  tabId.value = defaults[0] ?? null;
  tabAdjustment.value = NEUTRAL_CROP;
  exportStatus.value = 'idle';
  exportIssues.value = [];
});

export function toggleSelection(cellIndex: number): void {
  const current = selectedIds.value;
  selectedIds.value = current.includes(cellIndex)
    ? current.filter((id) => id !== cellIndex)
    : [...current, cellIndex];

  // 選択から外れたものはメイン・タブにも使えない
  if (!selectedIds.value.includes(mainId.value ?? -1)) mainId.value = selectedIds.value[0] ?? null;
  if (!selectedIds.value.includes(tabId.value ?? -1)) tabId.value = selectedIds.value[0] ?? null;
}

export function isSelected(cellIndex: number): boolean {
  return selectedIds.value.includes(cellIndex);
}

/** 並び替え。from の位置にあるものを to の位置へ移す。 */
export function moveSelection(from: number, to: number): void {
  const order = [...selectedIds.value];
  if (from < 0 || from >= order.length || to < 0 || to >= order.length || from === to) return;
  const [moved] = order.splice(from, 1);
  if (moved === undefined) return;
  order.splice(to, 0, moved);
  selectedIds.value = order;
}

export function setMain(cellIndex: number): void {
  mainId.value = cellIndex;
}

export function setTab(cellIndex: number): void {
  tabId.value = cellIndex;
  tabAdjustment.value = NEUTRAL_CROP;
}

export function adjustTab(change: Partial<CropAdjustment>): void {
  tabAdjustment.value = { ...tabAdjustment.value, ...change };
}

function findSticker(cellIndex: number | null): ExtractedSticker | null {
  if (cellIndex === null) return null;
  return stickers.value.find((s) => s.region.cellIndex === cellIndex) ?? null;
}

/** 選ばれたスタンプを、並び順どおりに返す。 */
export function orderedSelection(): ExtractedSticker[] {
  const found: ExtractedSticker[] = [];
  for (const id of selectedIds.value) {
    const sticker = findSticker(id);
    if (sticker) found.push(sticker);
  }
  return found;
}

function stickerLayouts(selection: ExtractedSticker[]): ImageLayout[] {
  const contents = selection.map((s) => ({
    width: s.region.contentBounds.width,
    height: s.region.contentBounds.height,
  }));
  const { layouts } = computeStickerSetLayout(contents, IMAGE_CONFIG.safeMarginPx);

  if (!EXPORT_CONFIG.uniformCanvas) return layouts;

  // すべて同じ大きさのキャンバスへ、中央に置き直す。
  // 内容の縮尺は変えない（引き伸ばすと絵が歪む）。
  const canvas = { width: SPEC.sticker.maxWidth, height: SPEC.sticker.maxHeight };
  return layouts.map((layout) => ({
    canvas,
    draw: {
      x: Math.round((canvas.width - layout.draw.width) / 2),
      y: Math.round((canvas.height - layout.draw.height) / 2),
      width: layout.draw.width,
      height: layout.draw.height,
    },
    scale: layout.scale,
  }));
}

let previewGeneration = 0;

/** メイン画像・タブ画像の見た目を作り直す。 */
export async function refreshPreviews(): Promise<void> {
  // 依存する値は非同期処理に入る前にすべて読む。
  // await をまたぐと signal の依存として追跡されないため。
  const main = findSticker(mainId.value);
  const tab = findSticker(tabId.value);
  const adjustment = tabAdjustment.value;
  const sheet = getCurrentSheet();
  if (!sheet) return;

  // 続けて操作されたときに、古い結果で上書きしない
  const generation = ++previewGeneration;

  if (main) {
    const layout = computeFixedLayout(
      main.region.contentBounds,
      { width: SPEC.main.width, height: SPEC.main.height },
      IMAGE_CONFIG.safeMarginPx,
    );
    const bytes = await renderToPng(sheet, main.region.contentBounds, layout);
    if (generation !== previewGeneration) return;
    replaceUrl(mainPreviewUrl, bytes);
  }

  if (tab) {
    const layout = computeAdjustedLayout(
      tab.region.contentBounds,
      { width: SPEC.tab.width, height: SPEC.tab.height },
      adjustment,
    );
    const bytes = await renderToPng(sheet, tab.region.contentBounds, layout);
    if (generation !== previewGeneration) return;
    replaceUrl(tabPreviewUrl, bytes);
  }
}

/** メイン・タブの選択や調整が変わったら、見た目を作り直す。 */
effect(() => {
  void refreshPreviews();
});

function replaceUrl(target: typeof mainPreviewUrl, bytes: Bytes): void {
  if (target.value) URL.revokeObjectURL(target.value);
  target.value = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
}

/** LINE提出用のZIPを作って保存する。 */
export async function exportZip(): Promise<void> {
  const sheet = getCurrentSheet();
  if (!sheet) return;

  exportStatus.value = 'working';
  exportIssues.value = [];

  try {
    const selection = orderedSelection();
    const layouts = stickerLayouts(selection);

    const stickerImages: ExportedImage[] = [];
    for (let index = 0; index < selection.length; index++) {
      const sticker = selection[index];
      const layout = layouts[index];
      if (!sticker || !layout) continue;
      stickerImages.push({
        name: stickerFileName(index + 1),
        bytes: await renderToPng(sheet, sticker.region.contentBounds, layout),
      });
    }

    const mainSticker = findSticker(mainId.value);
    const main: ExportedImage | null = mainSticker
      ? {
          name: SPEC.fileNames.main,
          bytes: await renderToPng(
            sheet,
            mainSticker.region.contentBounds,
            computeFixedLayout(
              mainSticker.region.contentBounds,
              { width: SPEC.main.width, height: SPEC.main.height },
              IMAGE_CONFIG.safeMarginPx,
            ),
          ),
        }
      : null;

    const tabSticker = findSticker(tabId.value);
    const tab: ExportedImage | null = tabSticker
      ? {
          name: SPEC.fileNames.tab,
          bytes: await renderToPng(
            sheet,
            tabSticker.region.contentBounds,
            computeAdjustedLayout(
              tabSticker.region.contentBounds,
              { width: SPEC.tab.width, height: SPEC.tab.height },
              tabAdjustment.value,
            ),
          ),
        }
      : null;

    const entries = [main, tab, ...stickerImages].filter((entry) => entry !== null);
    const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes.byteLength, 0);

    const report = validateExport({
      targetCount: targetCount.value,
      stickers: stickerImages,
      main,
      tab,
      totalBytes,
    });
    exportIssues.value = report.issues;

    if (!report.canExport) {
      exportStatus.value = 'idle';
      return;
    }

    downloadBytes(createZip(entries), SPEC.zipName, 'application/zip');
    exportStatus.value = 'done';
  } catch (cause) {
    console.error('[RUHiA Sticker Studio] 書き出しに失敗しました', cause);
    exportIssues.value = [{ kind: 'error', message: 'データを作れませんでした。もう一度お試しください。' }];
    exportStatus.value = 'idle';
  }
}
