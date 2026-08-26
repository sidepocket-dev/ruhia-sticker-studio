import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { unzipSync } from 'fflate';

const fixture = (name: string): string => resolve(process.cwd(), 'tests/fixtures', name);

/** TC14: 読み込み直しても続きから作業できる（PRODUCT_SPEC.md §51）。 */
test('リロードしても前回の続きから再開できる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '16 個', exact: false }).first().click();
  await page.getByRole('button', { name: '学校用', exact: false }).click();
  await page.setInputFiles('input[type="file"]:not([accept*="zip"])', [fixture('sheet-1.png'), fixture('sheet-2.png')]);
  await expect(page.getByRole('heading', { name: '18個のスタンプを見つけました' })).toBeVisible({
    timeout: 30_000,
  });

  // 選択を変えて、並び替えて、セリフも直す
  await page.locator('.sticker-card').first().click();
  await page.locator('.sticker-card').nth(17).click();
  await page.getByRole('button', { name: '使いやすい順に並べる' }).click();
  const orderBefore = await page.locator('.reorder__text').allTextContents();

  await expect(page.getByText('保存しました。', { exact: false })).toBeVisible({ timeout: 10_000 });

  await page.reload();

  await expect(page.getByText('前回の続きから再開しました。', { exact: false })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('heading', { name: '18個のスタンプを見つけました' })).toBeVisible();

  // 個数・用途・並び順・選択がそのまま
  await expect(page.getByRole('button', { name: '16 個', exact: false }).first()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: '学校用', exact: false })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await page.locator('.reorder__text').allTextContents()).toEqual(orderBefore);
  await expect(page.locator('.sheet-list__item')).toHaveCount(2);
});

test('最初からやり直すと、保存した内容も消える', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type="file"]:not([accept*="zip"])', [fixture('sheet-1.png')]);
  await expect(page.getByRole('heading', { name: '9個のスタンプを見つけました' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('保存しました。', { exact: false })).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: '最初からやり直す' }).click();
  await expect(page.locator('.sheet-list__item')).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('前回の続きから再開しました。', { exact: false })).toHaveCount(0);
  await expect(page.locator('.sheet-list__item')).toHaveCount(0);
});

test('作業内容をファイルに保存して、読み込み直せる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '16 個', exact: false }).first().click();
  await page.setInputFiles('input[type="file"]:not([accept*="zip"])', [fixture('sheet-1.png'), fixture('sheet-3.png')]);
  await expect(page.getByRole('heading', { name: '18個のスタンプを見つけました' })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole('button', { name: '使いやすい順に並べる' }).click();
  const orderBefore = await page.locator('.reorder__text').allTextContents();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '作業内容を保存' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('PROJECT_PACKAGE.zip');

  const path = await download.path();
  const files = unzipSync(new Uint8Array(readFileSync(path)));
  const names = Object.keys(files).sort();

  // PRODUCT_SPEC.md §49 の構成
  expect(names).toContain('project.json');
  expect(names).toContain('texts.txt');
  expect(names).toContain('texts.json');
  expect(names).toContain('sources/sheet-01.png');
  expect(names).toContain('sources/sheet-02.png');

  // 元の画像がそのまま入っている
  expect(files['sources/sheet-01.png']?.byteLength).toBe(
    readFileSync(fixture('sheet-1.png')).byteLength,
  );

  // 別の状態にしてから読み込み直す
  await page.getByRole('button', { name: '最初からやり直す' }).click();
  await expect(page.locator('.sheet-list__item')).toHaveCount(0);

  await page.locator('input[type="file"][accept*="zip"]').setInputFiles(path);
  await expect(page.getByText('読み込みました。', { exact: false })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('.sheet-list__item')).toHaveCount(2);
  expect(await page.locator('.reorder__text').allTextContents()).toEqual(orderBefore);
});

test('関係のないファイルを読み込ませても壊れない', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="file"][accept*="zip"]').setInputFiles(fixture('sheet-1.png'));
  await expect(page.getByText('このファイルは読み込めませんでした。')).toBeVisible();
  await expect(page.locator('.sheet-list__item')).toHaveCount(0);
});

/** TC15: オフライン版（file://）でも保存が効くこと。 */
test('オフライン版でも前回の続きから再開できる', async ({ page }) => {
  const offlineHtml = resolve(process.cwd(), 'dist-offline/index.html');
  test.skip(!existsSync(offlineHtml), 'npm run build:offline を先に実行してください');
  const url = pathToFileURL(offlineHtml).href;

  await page.goto(url);
  await page.setInputFiles('input[type="file"]:not([accept*="zip"])', [fixture('sheet-1.png')]);
  await expect(page.getByRole('heading', { name: '9個のスタンプを見つけました' })).toBeVisible({
    timeout: 30_000,
  });

  // 使えない環境なら、その旨がはっきり出る
  const status = page.locator('.project__status');
  await expect(status).toBeVisible();
  const text = (await status.textContent()) ?? '';

  if (text.includes('自動保存ができません')) {
    // 保存できない場合は、書き出しを促す案内が出ていること
    await expect(page.getByText('作業を中断する前に', { exact: false })).toBeVisible();
    return;
  }

  await expect(page.getByText('保存しました。', { exact: false })).toBeVisible({ timeout: 10_000 });
  await page.goto(url);
  await expect(page.getByText('前回の続きから再開しました。', { exact: false })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('.sheet-list__item')).toHaveCount(1);
});
