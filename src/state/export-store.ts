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
import { deliverFile } from '../platform/share.js';
import type { DeliverResult } from '../platform/share.js';
import { createZip } from '../platform/zip.js';
import { comparerFor } from '../core/text/ordering.js';
import type { SortMode } from '../core/text/ordering.js';
import type { StickerPlan } from '../core/text/plan.js';
import { plans } from './plan-store.js';
import { targetCount } from './project.js';
import { candidates, getSheetSource } from './sheet-store.js';
import type { ExtractedSticker } from './sheet-store.js';

const SPEC = LINE_STATIC_STICKER_SPEC;

/** 選ばれたスタンプのid。並び順そのもの。 */
export const selectedIds = signal<string[]>([]);
export const mainId = signal<string | null>(null);
export const tabId = signal<string | null>(null);
export const tabAdjustment = signal<CropAdjustment>(NEUTRAL_CROP);

export const mainPreviewUrl = signal<string>('');
export const tabPreviewUrl = signal<string>('');

export type ExportStatus = 'idle' | 'working' | 'done';
export const exportStatus = signal<ExportStatus>('idle');
/** 書き出したファイルをどう渡したか。案内文を変えるために持つ。 */
export const exportDelivery = signal<DeliverResult | null>(null);
export const exportIssues = signal<ValidationIssue[]>([]);

export const selectedCount = computed(() => selectedIds.value.length);
export const remainingToSelect = computed(() => targetCount.value - selectedIds.value.length);

/** 選ばれたスタンプを、並び順どおりに返す。 */
export const orderedSelection = computed<ExtractedSticker[]>(() => {
  const byId = new Map(candidates.value.map((sticker) => [sticker.id, sticker]));
  const found: ExtractedSticker[] = [];
  for (const id of selectedIds.value) {
    const sticker = byId.get(id);
    if (sticker) found.push(sticker);
  }
  return found;
});

/**
 * 選んだスタンプに対応するセリフ計画を、並び順どおりに返す。
 *
 * 候補の通し番号と計画の通し番号が一致している前提で対応づける。
 * AIが指示どおりの順で描かない場合があるため、これは推定として扱い、
 * 表示のみに使う（PRODUCT_SPEC.md §77.10）。
 */
export const orderedPlans = computed(() => {
  const order = new Map(candidates.value.map((sticker, index) => [sticker.id, index + 1]));
  const byId = new Map(plans.value.map((plan) => [plan.id, plan]));
  return orderedSelection.value
    .map((sticker) => byId.get(order.get(sticker.id) ?? -1))
    .filter((plan) => plan !== undefined);
});

/**
 * 候補と、想定しているセリフ計画の対応。
 *
 * 候補の通し番号と計画の通し番号が一致している前提。
 * 絵から文字を読み取っているわけではないので、AIが順番や文言を変えた場合はずれる。
 * カード上でセリフを直せるようにしてあるので、合っていなければ直してもらう
 * （PRODUCT_SPEC.md §77.10）。
 */
export const planByCandidate = computed(() => {
  const byId = new Map(plans.value.map((plan) => [plan.id, plan]));
  const result = new Map<string, StickerPlan>();
  candidates.value.forEach((sticker, index) => {
    const plan = byId.get(index + 1);
    if (plan) result.set(sticker.id, plan);
  });
  return result;
});

/** 候補の通し番号から、想定しているセリフを引く。 */
export const plannedTextByCandidate = computed(() => {
  const result = new Map<string, string>();
  for (const [id, plan] of planByCandidate.value) result.set(id, plan.text);
  return result;
});

/** 選択状況の案内文（PRODUCT_SPEC.md §40）。 */
export const selectionMessage = computed(() => {
  const remaining = remainingToSelect.value;
  const target = targetCount.value;
  if (remaining === 0) return `${target} / ${target} 選択済み`;
  if (remaining > 0) return `あと${remaining}個選んでください。`;
  return `あと${-remaining}個外してください。`;
});

/**
 * 候補や目標個数が変わったら、選択を整え直す。
 *
 * 既に選ばれているものはできるだけ残し、足りない分だけ先頭から補う。
 * シートを追加するたびに選び直させないため。
 */
effect(() => {
  const available = candidates.value;
  const target = targetCount.value;

  const availableIds = new Set(available.map((sticker) => sticker.id));
  const kept = selectedIds.peek().filter((id) => availableIds.has(id));

  const filled = [...kept];
  for (const sticker of available) {
    if (filled.length >= target) break;
    if (!filled.includes(sticker.id)) filled.push(sticker.id);
  }
  const next = filled.slice(0, target);

  if (next.length !== kept.length || next.some((id, index) => id !== kept[index])) {
    selectedIds.value = next;
  }

  // メイン・タブが選択から外れたら、先頭へ寄せる
  const first = next[0] ?? null;
  if (!mainId.peek() || !next.includes(mainId.peek() ?? '')) mainId.value = first;
  if (!tabId.peek() || !next.includes(tabId.peek() ?? '')) tabId.value = first;

  exportStatus.value = 'idle';
  exportIssues.value = [];
});

export function toggleSelection(id: string): void {
  const current = selectedIds.value;
  selectedIds.value = current.includes(id)
    ? current.filter((other) => other !== id)
    : [...current, id];

  const next = selectedIds.value;
  if (!next.includes(mainId.value ?? '')) mainId.value = next[0] ?? null;
  if (!next.includes(tabId.value ?? '')) tabId.value = next[0] ?? null;
}

export function isSelected(id: string): boolean {
  return selectedIds.value.includes(id);
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

/**
 * 選んだスタンプを並べ替える。
 *
 * 40個を手で並べるのは現実的ではないため、ボタン一つで並ぶようにする。
 * 対応づけが崩れている場合は正しく並ばないので、
 * カード上でセリフを直してから使ってもらう。
 */
export function sortSelection(mode: SortMode): void {
  const byId = planByCandidate.value;
  const compare = comparerFor(mode);

  selectedIds.value = [...selectedIds.value].sort((left, right) => {
    const leftPlan = byId.get(left);
    const rightPlan = byId.get(right);
    if (!leftPlan || !rightPlan) return 0;
    return compare(leftPlan, rightPlan);
  });
}

export function setMain(id: string): void {
  mainId.value = id;
}

export function setTab(id: string): void {
  tabId.value = id;
  tabAdjustment.value = NEUTRAL_CROP;
}

export function adjustTab(change: Partial<CropAdjustment>): void {
  tabAdjustment.value = { ...tabAdjustment.value, ...change };
}

function findSticker(id: string | null): ExtractedSticker | null {
  if (id === null) return null;
  return candidates.value.find((sticker) => sticker.id === id) ?? null;
}

function stickerLayouts(selection: ExtractedSticker[]): ImageLayout[] {
  const contents = selection.map((sticker) => ({
    width: sticker.region.contentBounds.width,
    height: sticker.region.contentBounds.height,
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

function renderSticker(sticker: ExtractedSticker, layout: ImageLayout): Bytes | null {
  const source = getSheetSource(sticker.sheetId);
  if (!source) return null;
  return renderToPng(
    source,
    sticker.region.contentBounds,
    layout,
    sticker.region.excludeRects ?? [],
  );
}

let previewGeneration = 0;

/** メイン画像・タブ画像の見た目を作り直す。 */
export function refreshPreviews(): void {
  // 依存する値は非同期処理に入る前にすべて読む。
  // await をまたぐと signal の依存として追跡されないため。
  const main = findSticker(mainId.value);
  const tab = findSticker(tabId.value);
  const adjustment = tabAdjustment.value;

  // 続けて操作されたときに、古い結果で上書きしない
  const generation = ++previewGeneration;

  if (main) {
    const layout = computeFixedLayout(
      main.region.contentBounds,
      { width: SPEC.main.width, height: SPEC.main.height },
      IMAGE_CONFIG.safeMarginPx,
    );
    const bytes = renderSticker(main, layout);
    if (generation !== previewGeneration) return;
    if (bytes) replaceUrl(mainPreviewUrl, bytes);
  }

  if (tab) {
    const layout = computeAdjustedLayout(
      tab.region.contentBounds,
      { width: SPEC.tab.width, height: SPEC.tab.height },
      adjustment,
    );
    const bytes = renderSticker(tab, layout);
    if (generation !== previewGeneration) return;
    if (bytes) replaceUrl(tabPreviewUrl, bytes);
  }
}

/** メイン・タブの選択や調整が変わったら、見た目を作り直す。 */
effect(() => {
  refreshPreviews();
});

function replaceUrl(target: typeof mainPreviewUrl, bytes: Bytes): void {
  // peek で読むのが重要。この関数は effect の中から呼ばれるため、
  // .value で読むと「自分が書き込む値を自分が見張る」形になり循環する
  const previous = target.peek();
  if (previous) URL.revokeObjectURL(previous);
  target.value = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
}

/**
 * LINE提出用のZIPを作って渡す。
 *
 * 押した流れのまま共有シートを出す必要があるため、
 * 渡すところまで await を挟まずに進める。描画もZIP作成も同期処理なので成立する。
 */
export function exportZip(): void {
  exportStatus.value = 'working';
  exportIssues.value = [];
  exportDelivery.value = null;

  try {
    const selection = orderedSelection.value;
    const layouts = stickerLayouts(selection);

    const stickerImages: ExportedImage[] = [];
    for (let index = 0; index < selection.length; index++) {
      const sticker = selection[index];
      const layout = layouts[index];
      if (!sticker || !layout) continue;
      const bytes = renderSticker(sticker, layout);
      if (bytes) stickerImages.push({ name: stickerFileName(index + 1), bytes });
    }

    const main = renderNamed(findSticker(mainId.value), SPEC.fileNames.main, (content) =>
      computeFixedLayout(
        content,
        { width: SPEC.main.width, height: SPEC.main.height },
        IMAGE_CONFIG.safeMarginPx,
      ),
    );

    const tab = renderNamed(findSticker(tabId.value), SPEC.fileNames.tab, (content) =>
      computeAdjustedLayout(
        content,
        { width: SPEC.tab.width, height: SPEC.tab.height },
        tabAdjustment.value,
      ),
    );

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

    void deliverFile(createZip(entries), SPEC.zipName, 'application/zip').then((result) => {
      exportDelivery.value = result;
      exportStatus.value = result === 'cancelled' ? 'idle' : 'done';
    });
  } catch (cause) {
    console.error('[RUHiA Sticker Studio] 書き出しに失敗しました', cause);
    exportIssues.value = [
      { kind: 'error', message: 'データを作れませんでした。もう一度お試しください。' },
    ];
    exportStatus.value = 'idle';
  }
}

function renderNamed(
  sticker: ExtractedSticker | null,
  name: string,
  toLayout: (content: { width: number; height: number }) => ImageLayout,
): ExportedImage | null {
  if (!sticker) return null;
  const bytes = renderSticker(sticker, toLayout(sticker.region.contentBounds));
  return bytes ? { name, bytes } : null;
}
