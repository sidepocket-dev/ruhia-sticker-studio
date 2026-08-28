import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { unzipSync } from 'fflate';
import { decode } from 'fast-png';
import { LINE_STATIC_STICKER_SPEC, stickerFileName } from '../../src/config/line-spec.js';
import { PNG_COLOR_TYPE_RGBA, readPngInfo } from '../../src/core/line/png-info.js';

const FIXTURE = resolve(process.cwd(), 'tests/fixtures/sheet-a.png');
const SPEC = LINE_STATIC_STICKER_SPEC;
const TARGET = 8;

/** TC04–TC07: 読み込みからZIPまで、実際に通して中身を確かめる。 */
test('シートからLINE提出用ZIPを作れる', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.setInputFiles('input[type="file"]', FIXTURE);
  await expect(page.getByRole('heading', { name: '9個のスタンプを見つけました' })).toBeVisible({
    timeout: 15_000,
  });

  // 9候補のうち8個が自動で選ばれ、そのまま書き出せる状態になっている
  await expect(page.getByText(`${TARGET} / ${TARGET} 選択済み`)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'LINE用データを作成' }).click(),
  ]);

  expect(download.suggestedFilename()).toBe(SPEC.zipName);
  const zipPath = await download.path();
  const zipBytes = readFileSync(zipPath);

  // TC07: ZIPが展開できる
  const files = unzipSync(new Uint8Array(zipBytes));
  const names = Object.keys(files).sort();

  // 余計なファイルが入っていない（PRODUCT_SPEC.md §48）
  const expectedNames = [
    SPEC.fileNames.main,
    SPEC.fileNames.tab,
    ...Array.from({ length: TARGET }, (_, i) => stickerFileName(i + 1)),
  ].sort();
  expect(names).toEqual(expectedNames);

  expect(zipBytes.byteLength).toBeLessThanOrEqual(SPEC.zipMaxBytes);

  // TC05 / TC06: main と tab は寸法がぴったり
  const main = files[SPEC.fileNames.main];
  const tab = files[SPEC.fileNames.tab];
  expect(main).toBeDefined();
  expect(tab).toBeDefined();
  if (!main || !tab) return;

  expect(readPngInfo(main)).toMatchObject({ width: SPEC.main.width, height: SPEC.main.height });
  expect(readPngInfo(tab)).toMatchObject({ width: SPEC.tab.width, height: SPEC.tab.height });

  // TC04: スタンプ8枚がすべてLINEの規格を満たす
  for (let i = 1; i <= TARGET; i++) {
    const name = stickerFileName(i);
    const bytes = files[name];
    expect(bytes, name).toBeDefined();
    if (!bytes) continue;

    const info = readPngInfo(bytes);
    expect(info, `${name} がPNGとして読めない`).not.toBeNull();
    if (!info) continue;

    expect(info.colorType, `${name} のカラータイプ`).toBe(PNG_COLOR_TYPE_RGBA);
    expect(info.bitDepth, `${name} のビット深度`).toBe(8);
    expect(info.width % 2, `${name} の幅が偶数`).toBe(0);
    expect(info.height % 2, `${name} の高さが偶数`).toBe(0);
    expect(info.width, `${name} の幅`).toBeLessThanOrEqual(SPEC.sticker.maxWidth);
    expect(info.height, `${name} の高さ`).toBeLessThanOrEqual(SPEC.sticker.maxHeight);
    expect(bytes.byteLength, `${name} の容量`).toBeLessThanOrEqual(SPEC.sticker.maxBytes);

    // 背景が本当に透明であること
    const png = decode(bytes);
    expect(png.channels, `${name} のチャンネル数`).toBe(4);
    const alpha = png.data;
    let transparent = 0;
    for (let p = 3; p < alpha.length; p += 4) if (alpha[p] === 0) transparent++;
    expect(transparent, `${name} に透明な画素がある`).toBeGreaterThan(0);
  }

  expect(errors).toEqual([]);
});

/**
 * タブ画像の調整が、提出データに反映されること。
 *
 * 画面のプレビューだけ変わって tab.png が変わらないと、
 * 調整したつもりのまま提出してしまう。見た目のテストでは気づけない。
 */
test('タブ画像の大きさを変えると、提出するtab.pngも変わる', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type="file"]', FIXTURE);
  await expect(page.getByRole('heading', { name: '9個のスタンプを見つけました' })).toBeVisible({
    timeout: 15_000,
  });

  const exportZip = async (): Promise<Record<string, Uint8Array>> => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'LINE用データを作成' }).click(),
    ]);
    return unzipSync(new Uint8Array(readFileSync(await download.path())));
  };

  const before = (await exportZip())[SPEC.fileNames.tab];
  await page.locator('.tab-adjuster__zoom input').fill('2.5');
  const after = (await exportZip())[SPEC.fileNames.tab];

  expect(before).toBeDefined();
  expect(after).toBeDefined();
  if (!before || !after) return;

  // 中身が変わっていること。寸法は変わらない
  expect(Buffer.from(after).equals(Buffer.from(before))).toBe(false);
  expect(readPngInfo(after)).toMatchObject({ width: SPEC.tab.width, height: SPEC.tab.height });
});

/** 体格差が保たれていること（1枚ずつ最大化していないこと）。 */
test('スタンプの大小関係が元のシートと同じ', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type="file"]', FIXTURE);
  await expect(page.getByRole('heading', { name: '9個のスタンプを見つけました' })).toBeVisible({
    timeout: 15_000,
  });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'LINE用データを作成' }).click(),
  ]);
  const files = unzipSync(new Uint8Array(readFileSync(await download.path())));

  const heights: number[] = [];
  for (let i = 1; i <= TARGET; i++) {
    const bytes = files[stickerFileName(i)];
    if (!bytes) continue;
    heights.push(readPngInfo(bytes)?.height ?? 0);
  }

  // すべてが同じ高さなら、1枚ずつ最大化してしまっている
  expect(new Set(heights).size).toBeGreaterThan(1);
  // 一番大きいものは上限まで使い切っている
  expect(Math.max(...heights)).toBe(SPEC.sticker.maxHeight);
});

/** 自由配置シート（ステッカー機能の出力）でも同じ流れが通ること。 */
test('自由配置シートからもZIPを作れる', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.setInputFiles('input[type="file"]', resolve(process.cwd(), 'tests/fixtures/sheet-b.png'));
  await expect(page.getByRole('heading', { name: '9個のスタンプを見つけました' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('.sticker-card__warning')).toHaveCount(0);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'LINE用データを作成' }).click(),
  ]);

  const files = unzipSync(new Uint8Array(readFileSync(await download.path())));
  expect(Object.keys(files)).toHaveLength(TARGET + 2);

  for (let i = 1; i <= TARGET; i++) {
    const bytes = files[stickerFileName(i)];
    expect(bytes, stickerFileName(i)).toBeDefined();
    if (!bytes) continue;
    const info = readPngInfo(bytes);
    expect(info?.colorType).toBe(PNG_COLOR_TYPE_RGBA);
    expect((info?.width ?? 1) % 2).toBe(0);
    expect((info?.height ?? 1) % 2).toBe(0);
    expect(info?.width ?? 0).toBeLessThanOrEqual(SPEC.sticker.maxWidth);
    expect(info?.height ?? 0).toBeLessThanOrEqual(SPEC.sticker.maxHeight);
    expect(bytes.byteLength).toBeLessThanOrEqual(SPEC.sticker.maxBytes);
  }

  expect(errors).toEqual([]);
});
