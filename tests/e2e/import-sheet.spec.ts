import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { trackNetworkRequests } from './helpers.js';

const FIXTURE = resolve(process.cwd(), 'tests/fixtures/sheet-a.png');

/** TC01 をブラウザ上の実際の操作で確認する。 */
test('シートを読み込むと9個のスタンプが表示される', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.setInputFiles('input[type="file"]', FIXTURE);

  await expect(page.getByRole('heading', { name: '9個のスタンプを見つけました' })).toBeVisible({
    timeout: 15_000,
  });

  const images = page.getByRole('listitem').locator('img');
  await expect(images).toHaveCount(9);

  // すべてのプレビューが実際に描画されている（幅が0でない）
  for (let i = 0; i < 9; i++) {
    const width = await images.nth(i).evaluate((img) => (img as HTMLImageElement).naturalWidth);
    expect(width, `スタンプ ${i + 1} のプレビュー`).toBeGreaterThan(0);
  }

  // 正しく取れているので「要確認」は1つも出ない
  await expect(page.getByText('要確認')).toHaveCount(0);
  expect(errors).toEqual([]);
});

/** オフライン版でも同じ流れが動くこと（Workerを内蔵しているか）。 */
test('オフライン版でもシートを読み込める', async ({ page }) => {
  const offlineHtml = resolve(process.cwd(), 'dist-offline/index.html');
  test.skip(!existsSync(offlineHtml), 'npm run build:offline を先に実行してください');

  const externalRequests = trackNetworkRequests(page);

  await page.goto(pathToFileURL(offlineHtml).href);
  await page.setInputFiles('input[type="file"]', FIXTURE);

  await expect(page.getByRole('heading', { name: '9個のスタンプを見つけました' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('listitem').locator('img')).toHaveCount(9);
  expect(externalRequests, '外部へのリクエストが発生しました').toEqual([]);
});
