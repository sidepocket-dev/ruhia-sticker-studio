import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const FIXTURE = resolve(process.cwd(), 'tests/fixtures/sheet-a.png');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type="file"]', FIXTURE);
  await expect(page.getByRole('heading', { name: '9個のスタンプを見つけました' })).toBeVisible({
    timeout: 15_000,
  });
});

test('個数が足りないと書き出せず、あと何個かを教える', async ({ page }) => {
  const exportButton = page.getByRole('button', { name: 'LINE用データを作成' });
  await expect(exportButton).toBeEnabled();

  // 実際のユーザーと同じくカードをクリックして選択を外す
  await page.locator('.sticker-card').first().click();
  await expect(page.locator('.sticker-card input').first()).not.toBeChecked();

  await expect(page.getByText('あと1個選んでください。')).toBeVisible();
  await expect(exportButton).toBeDisabled();
  await expect(page.locator('.reorder__item')).toHaveCount(7);
});

test('別のスタンプを選び直せる', async ({ page }) => {
  const cards = page.locator('.sticker-card');
  await cards.nth(0).click();
  await cards.nth(8).click();

  await expect(page.getByText('8 / 8 選択済み')).toBeVisible();
  await expect(page.getByRole('button', { name: 'LINE用データを作成' })).toBeEnabled();
  await expect(page.locator('.reorder__item')).toHaveCount(8);
});

test('多く選ぶと、あと何個外すかを教える', async ({ page }) => {
  await page.locator('.sticker-card').nth(8).click();

  await expect(page.getByText('あと1個外してください。')).toBeVisible();
  await expect(page.getByRole('button', { name: 'LINE用データを作成' })).toBeDisabled();
});

test('タブ画像の大きさを変えられる', async ({ page }) => {
  const actual = page.locator('.tab-adjuster__actual img');
  await expect(actual).toBeVisible();
  const before = await actual.getAttribute('src');

  await page.locator('.tab-adjuster__zoom input').fill('2.5');
  await expect(actual).not.toHaveAttribute('src', before ?? '');

  // 実際の大きさの表示は 96 × 74 のまま
  const box = await page.locator('.tab-adjuster__actual').boundingBox();
  expect(box?.width).toBeCloseTo(96, 0);
  expect(box?.height).toBeCloseTo(74, 0);
});
