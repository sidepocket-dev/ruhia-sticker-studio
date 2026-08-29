import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { waitForStickers } from './helpers.js';

const fixture = (name: string): string => resolve(process.cwd(), 'tests/fixtures', name);
const sheetInput = 'input[type="file"]:not([accept*="zip"])';

/**
 * 背景透過処理（PRODUCT_SPEC.md §9）。
 *
 * 真の透過ができないモデルもあり、透過しているように見えるだけの画像が来る。
 * その場合に背景を抜いて先へ進めるようにする。
 */
test('透過されていないシートは、その場で断って理由を伝える', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles(sheetInput, [fixture('sheet-1-white.png')]);

  await expect(page.getByText('背景が透明ではありません。')).toBeVisible({ timeout: 30_000 });
  // 勝手に抜かない。ユーザーが指示したときだけ抜く
  await expect(page.getByRole('button', { name: '背景を抜いてみる' })).toBeVisible();
  await expect(page.locator('.sheet-list__item')).toHaveCount(0);
});

test('白背景のシートから、背景を抜いて9個取り出せる', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles(sheetInput, [fixture('sheet-1-white.png')]);
  await expect(page.getByRole('button', { name: '背景を抜いてみる' })).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole('button', { name: '背景を抜いてみる' }).click();

  await waitForStickers(page, 9);
  await expect(page.locator('.sheet-grid, .sticker-grid .sticker-card')).toHaveCount(9);
  // 抜いたことが分かるようにする
  await expect(page.getByText('背景を抜きました', { exact: false })).toBeVisible();
});

test('市松模様の偽の透過も抜ける', async ({ page }) => {
  // 透過に見せかけた模様が描かれている画像。真の透過ができないモデルで起きる
  await page.goto('/');
  await page.setInputFiles(sheetInput, [fixture('sheet-1-checker.png')]);
  await page.getByRole('button', { name: '背景を抜いてみる' }).click();

  await waitForStickers(page, 9);
});

test('背景を抜いたシートから、LINE提出用ZIPまで作れる', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles(sheetInput, [fixture('sheet-1-white.png')]);
  await page.getByRole('button', { name: '背景を抜いてみる' }).click();
  await waitForStickers(page, 9);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'LINE用データを作成' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('LINE_UPLOAD.zip');
});

test('背景を抜いた状態が、読み込み直しても保たれる', async ({ page }) => {
  // 抜いた結果は保存せず、元画像だけを保存して復元時にやり直す（§9.4）
  await page.goto('/');
  await page.setInputFiles(sheetInput, [fixture('sheet-1-white.png')]);
  await page.getByRole('button', { name: '背景を抜いてみる' }).click();
  await waitForStickers(page, 9);
  await expect(page.getByText('保存しました。', { exact: false })).toBeVisible({ timeout: 15_000 });

  await page.reload();

  await expect(page.getByText('前回の続きから再開しました。', { exact: false })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('背景を抜きました', { exact: false })).toBeVisible();
  await expect(page.locator('.sticker-grid .sticker-card')).toHaveCount(9);
});
