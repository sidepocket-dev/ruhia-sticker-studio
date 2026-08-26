import { describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { asBytes } from '../../src/core/bytes.js';
import { PROJECT_VERSION, isReadable, toBlob } from '../../src/core/project.js';
import type { ProjectSnapshot } from '../../src/core/project.js';
import {
  PROJECT_PACKAGE_NAME,
  buildProjectPackage,
  readProjectPackage,
} from '../../src/platform/project-package.js';

function snapshot(): ProjectSnapshot {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]).buffer;
  return {
    version: PROJECT_VERSION,
    savedAt: '2026-08-26T00:00:00.000Z',
    targetCount: 16,
    preset: 'school',
    tone: 'polite',
    textOverrides: { 1: 'おはようございます', 5: 'できました！' },
    sheets: [
      {
        id: 1,
        name: 'sheet-1.png',
        strategy: 'simple-split',
        regions: [
          {
            cellIndex: 0,
            bounds: { x: 1, y: 2, width: 3, height: 4 },
            contentBounds: { x: 1, y: 2, width: 3, height: 4 },
            confidence: 1,
          },
        ],
        image: { bytes, type: 'image/png' },
      },
      {
        id: 2,
        name: 'sheet-2.png',
        strategy: 'smart-detection',
        regions: [],
        image: { bytes: new Uint8Array([9, 9, 9]).buffer, type: 'image/png' },
      },
    ],
    selectedIds: ['1-0', '2-3'],
    mainId: '1-0',
    tabId: '2-3',
    tabAdjustment: { zoom: 1.5, offsetX: 3, offsetY: -2 },
  };
}

const texts = { txt: '01 おはよう\n', json: '[{"id":1}]\n' };

describe('プロジェクトの書き出し', () => {
  const zip = buildProjectPackage(snapshot(), texts);
  const files = unzipSync(zip);

  it('仕様どおりの構成になる', () => {
    // PRODUCT_SPEC.md §49
    expect(Object.keys(files).sort()).toEqual([
      'project.json',
      'sources/sheet-01.png',
      'sources/sheet-02.png',
      'texts.json',
      'texts.txt',
    ]);
  });

  it('読み込んだ画像がそのまま入る', () => {
    expect(Array.from(files['sources/sheet-01.png'] ?? [])).toEqual([
      0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4,
    ]);
  });

  it('セリフ一覧も入る', () => {
    expect(new TextDecoder().decode(files['texts.txt'])).toBe(texts.txt);
    expect(new TextDecoder().decode(files['texts.json'])).toBe(texts.json);
  });

  it('画像はproject.jsonに埋め込まれない', () => {
    const project = new TextDecoder().decode(files['project.json']);
    expect(project).toContain('sources/sheet-01.png');
    expect(project.length).toBeLessThan(4000);
  });
});

describe('プロジェクトの読み込み', () => {
  const toFile = (bytes: Uint8Array): File =>
    new File([asBytes(bytes)], PROJECT_PACKAGE_NAME, { type: 'application/zip' });

  it('書き出した内容をそのまま読み戻せる', async () => {
    const original = snapshot();
    const result = await readProjectPackage(toFile(buildProjectPackage(original, texts)));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const back = result.snapshot;
    expect(back.targetCount).toBe(original.targetCount);
    expect(back.preset).toBe(original.preset);
    expect(back.tone).toBe(original.tone);
    expect(back.textOverrides).toEqual(original.textOverrides);
    expect(back.selectedIds).toEqual(original.selectedIds);
    expect(back.mainId).toBe(original.mainId);
    expect(back.tabId).toBe(original.tabId);
    expect(back.tabAdjustment).toEqual(original.tabAdjustment);
    expect(back.sheets).toHaveLength(2);
    expect(back.sheets[0]?.regions).toEqual(original.sheets[0]?.regions);
    expect(Array.from(new Uint8Array(back.sheets[0]?.image.bytes ?? new ArrayBuffer(0)))).toEqual([
      0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4,
    ]);
  });

  it('読み戻した内容がそのまま保存できる形になっている', async () => {
    const result = await readProjectPackage(toFile(buildProjectPackage(snapshot(), texts)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(isReadable(result.snapshot)).toBe(true);
  });

  it('ZIPでないファイルを断る', async () => {
    const result = await readProjectPackage(toFile(new Uint8Array([1, 2, 3, 4, 5])));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain('読み込めませんでした');
  });

  it('別のZIPを断る', async () => {
    const other = buildProjectPackage(
      { ...snapshot(), sheets: [] },
      texts,
    );
    const stripped = unzipSync(other);
    delete stripped['project.json'];
    const { zipSync } = await import('fflate');
    const result = await readProjectPackage(toFile(zipSync(stripped)));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain('このツールで保存したファイルではない');
  });

  it('画像が入っていないZIPを断る', async () => {
    const result = await readProjectPackage(
      toFile(buildProjectPackage({ ...snapshot(), sheets: [] }, texts)),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain('画像が入っていません');
  });
});

describe('保存した画像の扱い', () => {
  it('バイト列からBlobへ戻せる', () => {
    const image = { bytes: new Uint8Array([1, 2, 3]).buffer, type: 'image/png' };
    const blob = toBlob(image);
    expect(blob.size).toBe(3);
    expect(blob.type).toBe('image/png');
  });

  it('古い形式や壊れた内容は読めないと判定する', () => {
    expect(isReadable(null)).toBe(false);
    expect(isReadable({ version: 0, sheets: [], selectedIds: [], targetCount: 8 })).toBe(false);
    expect(isReadable({ version: PROJECT_VERSION })).toBe(false);
  });
});
