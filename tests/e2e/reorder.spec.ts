import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const FIXTURE = resolve(process.cwd(), 'tests/fixtures/sheet-a.png');

/** 並び順の識別には、スタンプごとに固有の画像URLを使う。 */
async function order(page: import('@playwright/test').Page): Promise<string[]> {
  return page.locator('.reorder__item .reorder__image').evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLImageElement).src),
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type="file"]', FIXTURE);
  await expect(page.getByRole('heading', { name: '9個のスタンプを見つけました' })).toBeVisible({
    timeout: 15_000,
  });
});

test('矢印キーで並び順を入れ替えられる', async ({ page }) => {
  const before = await order(page);

  await page.locator('.reorder__handle').first().focus();
  await page.keyboard.press('ArrowRight');

  const after = await order(page);
  expect(after[0]).toBe(before[1]);
  expect(after[1]).toBe(before[0]);
  expect(after.slice(2)).toEqual(before.slice(2));
});

test('先頭で左キーを押しても順番が壊れない', async ({ page }) => {
  const before = await order(page);
  await page.locator('.reorder__handle').first().focus();
  await page.keyboard.press('ArrowLeft');
  expect(await order(page)).toEqual(before);
});

test('つまみをドラッグして並び順を入れ替えられる', async ({ page }) => {
  const before = await order(page);

  const handles = page.locator('.reorder__handle');
  // page.mouse は画面座標で動くため、対象を表示範囲へ入れてから座標を取る
  await handles.nth(0).scrollIntoViewIfNeeded();
  const from = await handles.nth(0).boundingBox();
  const to = await handles.nth(2).boundingBox();
  expect(from).not.toBeNull();
  expect(to).not.toBeNull();
  if (!from || !to) return;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();

  const after = await order(page);
  expect(after[2]).toBe(before[0]);
  expect(after).not.toEqual(before);
  // 枚数も中身も変わっていない
  expect([...after].sort()).toEqual([...before].sort());
});
