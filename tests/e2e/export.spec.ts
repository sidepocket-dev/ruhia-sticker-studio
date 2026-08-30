import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { unzipSync } from 'fflate';
import { decode } from 'fast-png';
import { LINE_STATIC_STICKER_SPEC, stickerFileName } from '../../src/config/line-spec.js';
import { PNG_COLOR_TYPE_RGBA, readPngInfo } from '../../src/core/line/png-info.js';
import { waitForStickers } from './helpers.js';

const FIXTURE = resolve(process.cwd(), 'tests/fixtures/sheet-a.png');
const SPEC = LINE_STATIC_STICKER_SPEC;
const TARGET = 8;

/** TC04–TC07: 読み込みからZIPまで、実際に通して中身を確かめる。 */
test('シートからLINE提出用ZIPを作れる', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.setInputFiles('input[type="file"]', FIXTURE);
  await waitForStickers(page, 9);

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
  await waitForStickers(page, 9);

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

/**
 * 1枚ずつ上限まで大きくしていること（§77.8）。
 *
 * LINEがアップロードした画像をどう表示するかは確かめられていない。
 * 上限いっぱいにしておけば、実寸で並ぶ場合も枠に合わせる場合も不利にならない。
 */
test('スタンプは1枚ずつ上限まで大きくなる', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type="file"]', FIXTURE);
  await waitForStickers(page, 9);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'LINE用データを作成' }).click(),
  ]);
  const files = unzipSync(new Uint8Array(readFileSync(await download.path())));

  const sizes: { w: number; h: number }[] = [];
  for (let i = 1; i <= TARGET; i++) {
    const bytes = files[stickerFileName(i)];
    if (!bytes) continue;
    const info = readPngInfo(bytes);
    sizes.push({ w: info?.width ?? 0, h: info?.height ?? 0 });
  }
  expect(sizes).toHaveLength(TARGET);

  // どれも幅か高さのどちらかが上限に触れている
  for (const { w, h } of sizes) {
    const touches = w >= SPEC.sticker.maxWidth - 1 || h >= SPEC.sticker.maxHeight - 1;
    expect(touches, `${w}×${h} が上限に触れていない`).toBe(true);
  }

  // 縦長のキャラクターなので、揃うのは高さだけ。幅は散らばる
  expect(new Set(sizes.map((s) => s.h)).size, '高さは揃う').toBe(1);
  expect(new Set(sizes.map((s) => s.w)).size, '幅は揃わない').toBeGreaterThan(1);
});

/**
 * LINEのタグ設定を手伝う欄（§77.23）。
 *
 * タグは一覧から選ぶ形式なので、言葉をコピーしてページ内検索で探す。
 * コピーできなければ意味がないため、実際に貼れることまで確かめる。
 */
test('タグの手がかりをコピーできる', async ({ page, context, browserName }) => {
  await page.goto('/');
  await page.setInputFiles('input[type="file"]', FIXTURE);
  await waitForStickers(page, 9);

  // 既定ではたたまれている。40個ぶん並ぶため
  const toggle = page.getByRole('button', { name: 'LINEでタグを付けるときの手がかり' });
  await expect(page.locator('.tag-helper__list')).toHaveCount(0);
  await toggle.click();

  // 選んだ個数ぶん出る
  await expect(page.locator('.tag-helper__item')).toHaveCount(TARGET);

  // 一覧から選ぶ形式であることと、探し方を伝える
  await expect(page.getByText('一覧から選ぶ形式', { exact: false })).toBeVisible();
  await expect(page.getByText('ページ内検索', { exact: false })).toBeVisible();

  // 番号は提出順。01.png のタグを付けるときに迷わない
  const first = page.locator('.tag-helper__item').first();
  await expect(first.locator('.tag-helper__number')).toHaveText('01');

  // 言葉そのものがボタンになっていて、押すとコピーできる
  const chip = first.locator('.tag-helper__words .button').first();
  const word = await chip.innerText();
  await chip.click();
  await expect(page.getByText('コピーしました')).toBeVisible();

  // 中身までは、クリップボードを読み出せるブラウザだけで確かめる
  if (browserName !== 'chromium') return;
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await chip.click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(word);
});
