import { unzipSync } from 'fflate';
import { asBytes } from '../core/bytes.js';
import type { Bytes } from '../core/bytes.js';
import { PROJECT_VERSION } from '../core/project.js';
import type { ProjectSnapshot, StoredSheet } from '../core/project.js';
import type { DetectionStrategy, StickerRegion } from '../core/image/types.js';
import type { CropAdjustment } from '../core/line/layout.js';
import type { Tone, UsePresetId } from '../core/text/presets.js';
import { createZip } from './zip.js';

export const PROJECT_PACKAGE_NAME = 'PROJECT_PACKAGE.zip';
const PROJECT_FILE = 'project.json';
const SOURCES_DIRECTORY = 'sources/';

/** project.json の中身。画像は sources/ に置き、ここではファイル名だけ持つ。 */
interface ProjectFile {
  version: number;
  savedAt: string;
  targetCount: number;
  preset: UsePresetId;
  tone: Tone;
  textOverrides: Record<number, string>;
  selectedIds: string[];
  mainId: string | null;
  tabId: string | null;
  tabAdjustment: CropAdjustment;
  sheets: {
    id: number;
    name: string;
    strategy: DetectionStrategy;
    regions: StickerRegion[];
    file: string;
  }[];
}

function sourceName(index: number): string {
  return `${SOURCES_DIRECTORY}sheet-${String(index + 1).padStart(2, '0')}.png`;
}

/**
 * 作業内容を1つのZIPにまとめる（PRODUCT_SPEC.md §49）。
 *
 * 自動保存が使えない環境で作業を持ち運ぶための手段でもあるため、
 * 読み込んだ画像そのものを含める。
 */
export function buildProjectPackage(
  snapshot: ProjectSnapshot,
  texts: { txt: string; json: string },
): Bytes {
  const project: ProjectFile = {
    version: PROJECT_VERSION,
    savedAt: snapshot.savedAt,
    targetCount: snapshot.targetCount,
    preset: snapshot.preset,
    tone: snapshot.tone,
    textOverrides: snapshot.textOverrides,
    selectedIds: snapshot.selectedIds,
    mainId: snapshot.mainId,
    tabId: snapshot.tabId,
    tabAdjustment: snapshot.tabAdjustment,
    sheets: snapshot.sheets.map((sheet, index) => ({
      id: sheet.id,
      name: sheet.name,
      strategy: sheet.strategy,
      regions: sheet.regions,
      file: sourceName(index),
    })),
  };

  const encoder = new TextEncoder();
  const entries = [
    { name: PROJECT_FILE, bytes: asBytes(encoder.encode(`${JSON.stringify(project, null, 2)}\n`)) },
    { name: 'texts.txt', bytes: asBytes(encoder.encode(texts.txt)) },
    { name: 'texts.json', bytes: asBytes(encoder.encode(texts.json)) },
  ];

  for (const [index, sheet] of snapshot.sheets.entries()) {
    entries.push({
      name: sourceName(index),
      bytes: asBytes(new Uint8Array(sheet.image.bytes)),
    });
  }

  return createZip(entries);
}

export type ReadResult =
  | { ok: true; snapshot: ProjectSnapshot }
  | { ok: false; message: string };

/** 書き出したZIPを読み戻す。 */
export async function readProjectPackage(file: File): Promise<ReadResult> {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return { ok: false, message: 'このファイルは読み込めませんでした。' };
  }

  const projectBytes = files[PROJECT_FILE];
  if (!projectBytes) {
    return { ok: false, message: 'このツールで保存したファイルではないようです。' };
  }

  let project: ProjectFile;
  try {
    project = JSON.parse(new TextDecoder().decode(projectBytes)) as ProjectFile;
  } catch {
    return { ok: false, message: '保存された内容を読み取れませんでした。' };
  }

  if (project.version !== PROJECT_VERSION) {
    return { ok: false, message: 'このファイルは、いまのバージョンでは読み込めません。' };
  }

  const sheets: StoredSheet[] = [];
  for (const sheet of project.sheets ?? []) {
    const bytes = files[sheet.file];
    if (!bytes) continue;
    sheets.push({
      id: sheet.id,
      name: sheet.name,
      strategy: sheet.strategy,
      regions: sheet.regions,
      image: { bytes: asBytes(bytes).buffer, type: 'image/png' },
    });
  }

  if (sheets.length === 0) {
    return { ok: false, message: '画像が入っていませんでした。' };
  }

  return {
    ok: true,
    snapshot: {
      version: PROJECT_VERSION,
      savedAt: project.savedAt,
      targetCount: project.targetCount,
      preset: project.preset,
      tone: project.tone,
      textOverrides: project.textOverrides ?? {},
      sheets,
      selectedIds: project.selectedIds ?? [],
      mainId: project.mainId ?? null,
      tabId: project.tabId ?? null,
      tabAdjustment: project.tabAdjustment,
    },
  };
}
