import { effect, signal } from '@preact/signals';
import { PROJECT_VERSION, isReadable } from '../core/project.js';
import type { ProjectSnapshot, StoredSheet } from '../core/project.js';
import { getProjectStore } from '../platform/storage/index.js';
import {
  mainId,
  selectedIds,
  tabAdjustment,
  tabId,
} from './export-store.js';
import { presetId, textOverrides, tone } from './plan-store.js';
import { targetCount } from './project.js';
import { getSheetImage, restoreSheets, sheets } from './sheet-store.js';

/** 保存の間隔。操作のたびに書き込まない。 */
const SAVE_DELAY_MS = 800;

export type SaveState = 'unknown' | 'unavailable' | 'idle' | 'saving' | 'saved';

export const saveState = signal<SaveState>('unknown');
/** 前回の続きから再開したか */
export const restored = signal(false);

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

/** いまの状態を、保存できる形にまとめる。 */
export function captureSnapshot(): ProjectSnapshot {
  const storedSheets: StoredSheet[] = [];
  for (const sheet of sheets.value) {
    const image = getSheetImage(sheet.id);
    if (!image) continue;
    storedSheets.push({
      id: sheet.id,
      name: sheet.name,
      strategy: sheet.strategy,
      regions: sheet.stickers.map((sticker) => sticker.region),
      image,
      backgroundRemoved: sheet.backgroundRemoved,
    });
  }

  return {
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    targetCount: targetCount.value,
    preset: presetId.value,
    tone: tone.value,
    textOverrides: { ...textOverrides.value },
    sheets: storedSheets,
    selectedIds: [...selectedIds.value],
    mainId: mainId.value,
    tabId: tabId.value,
    tabAdjustment: { ...tabAdjustment.value },
  };
}

/**
 * 保存しておいた内容へ戻す。
 *
 * シートを先に戻す。選択やメイン画像はシートがあって初めて意味を持つため。
 * シートを入れると選択を整え直す仕組みが動くので、そのあとで上書きする。
 */
export async function applySnapshot(snapshot: ProjectSnapshot): Promise<void> {
  targetCount.value = snapshot.targetCount;
  presetId.value = snapshot.preset;
  tone.value = snapshot.tone;
  textOverrides.value = { ...snapshot.textOverrides };

  await restoreSheets(snapshot.sheets);

  const available = new Set(sheets.value.flatMap((sheet) => sheet.stickers.map((s) => s.id)));
  const kept = snapshot.selectedIds.filter((id) => available.has(id));
  if (kept.length > 0) selectedIds.value = kept;
  if (snapshot.mainId && available.has(snapshot.mainId)) mainId.value = snapshot.mainId;
  if (snapshot.tabId && available.has(snapshot.tabId)) tabId.value = snapshot.tabId;
  tabAdjustment.value = { ...snapshot.tabAdjustment };
}

/**
 * 自動保存を始める。
 *
 * 40個の制作は長時間になる。ブラウザを閉じたら消える作りにはしない
 * （PRODUCT_SPEC.md §51）。保存が使えない環境ではその旨を伝え、
 * プロジェクトの書き出しで持ち運んでもらう。
 */
export async function startPersistence(): Promise<void> {
  if (started) return;
  started = true;

  const store = await getProjectStore();
  if (!store.available) {
    saveState.value = 'unavailable';
    return;
  }

  try {
    const found = await store.load();
    if (found && isReadable(found) && found.sheets.length > 0) {
      await applySnapshot(found);
      restored.value = true;
    }
  } catch (cause) {
    console.error('[RUHiA Sticker Studio] 前回の続きを読み込めませんでした', cause);
  }

  saveState.value = 'idle';

  effect(() => {
    // 依存として拾うため、保存する値をすべてここで読む
    const watched = [
      sheets.value,
      selectedIds.value,
      mainId.value,
      tabId.value,
      tabAdjustment.value,
      textOverrides.value,
      presetId.value,
      tone.value,
      targetCount.value,
    ];
    if (watched.length === 0) return;

    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void writeNow(store);
    }, SAVE_DELAY_MS);
  });
}

async function writeNow(store: Awaited<ReturnType<typeof getProjectStore>>): Promise<void> {
  const snapshot = captureSnapshot();
  if (snapshot.sheets.length === 0) return;

  saveState.value = 'saving';
  try {
    await store.save(snapshot);
    saveState.value = 'saved';
  } catch (cause) {
    console.error('[RUHiA Sticker Studio] 保存できませんでした', cause);
    saveState.value = 'unavailable';
  }
}

/** 保存しておいた内容を消す。最初からやり直すとき。 */
export async function clearSaved(): Promise<void> {
  if (saveTimer !== null) clearTimeout(saveTimer);
  const store = await getProjectStore();
  await store.clear();
  restored.value = false;
  if (store.available) saveState.value = 'idle';
}
