import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { waitForStickers } from './helpers.js';

const FIXTURE = resolve(process.cwd(), 'tests/fixtures/sheet-1.png');

// 共有シートは指で操作する端末でだけ使う。パソコンではダウンロードのまま
test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

/**
 * 共有シートが使える端末では、ダウンロードではなく共有で渡す。
 *
 * スマートフォンでダウンロードすると、どこへ入ったのか分からないという
 * 問題が実際に起きた。共有シートなら行き先をユーザーが選べる。
 *
 * 実機の共有シートは自動では出せないので、共有の呼び出しが
 * 正しく行われるか（押した流れのまま、ファイル付きで）を確認する。
 */
async function stubShare(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    const calls: { name: string; type: string; size: number }[] = [];
    (window as unknown as { __shared: typeof calls }).__shared = calls;

    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: (data?: { files?: File[] }) => Array.isArray(data?.files) && data.files.length > 0,
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data?: { files?: File[] }) => {
        for (const file of data?.files ?? []) {
          calls.push({ name: file.name, type: file.type, size: file.size });
        }
      },
    });
  });
}

const shared = (page: import('@playwright/test').Page): Promise<{ name: string; type: string; size: number }[]> =>
  page.evaluate(() => (window as unknown as { __shared: { name: string; type: string; size: number }[] }).__shared);

test('LINE用データを共有で渡せる', async ({ page }) => {
  await stubShare(page);
  await page.goto('/');
  await page.setInputFiles('input[type="file"]:not([accept*="zip"])', [FIXTURE]);
  await waitForStickers(page, 9);

  // 共有が使える端末では文言が変わる
  const button = page.getByRole('button', { name: 'LINE用データを作成・保存' });
  await expect(button).toBeVisible();

  await button.click();

  await expect(page.getByText('LINE_UPLOAD.zip を渡しました。', { exact: false })).toBeVisible({
    timeout: 30_000,
  });

  const files = await shared(page);
  expect(files).toHaveLength(1);
  expect(files[0]?.name).toBe('LINE_UPLOAD.zip');
  expect(files[0]?.type).toBe('application/zip');
  expect(files[0]?.size ?? 0).toBeGreaterThan(10_000);
});

test('作業内容を共有で渡せる', async ({ page }) => {
  await stubShare(page);
  await page.goto('/');
  await page.setInputFiles('input[type="file"]:not([accept*="zip"])', [FIXTURE]);
  await waitForStickers(page, 9);

  await page.getByRole('button', { name: '作業内容を保存・共有' }).click();

  await expect(page.getByText('PROJECT_PACKAGE.zip を渡しました。', { exact: false })).toBeVisible({
    timeout: 30_000,
  });

  const files = await shared(page);
  expect(files.map((file) => file.name)).toContain('PROJECT_PACKAGE.zip');
});

test('共有を閉じても、勝手にダウンロードしない', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => {
        throw new DOMException('cancelled', 'AbortError');
      },
    });
  });
  await page.goto('/');
  await page.setInputFiles('input[type="file"]:not([accept*="zip"])', [FIXTURE]);
  await waitForStickers(page, 9);

  let downloaded = false;
  page.on('download', () => {
    downloaded = true;
  });

  await page.getByRole('button', { name: 'LINE用データを作成・保存' }).click();
  await page.waitForTimeout(1500);

  expect(downloaded, '閉じたのにダウンロードされた').toBe(false);
  // 押せる状態に戻っている
  await expect(page.getByRole('button', { name: 'LINE用データを作成・保存' })).toBeEnabled();
});

test('共有が使えない環境では、保存先を案内する', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  });
  await page.goto('/');
  await page.setInputFiles('input[type="file"]:not([accept*="zip"])', [FIXTURE]);
  await waitForStickers(page, 9);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'LINE用データを作成' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('LINE_UPLOAD.zip');

  // どこへ入ったか分からない状態にしない
  await expect(page.getByText('ファイル」アプリや、ブラウザのダウンロード一覧', { exact: false })).toBeVisible();
});

/** パソコンでは共有シートを出さない。ダウンロードを期待した人が戸惑うため。 */
test.describe('パソコン', () => {
  test.use({ hasTouch: false, viewport: { width: 1280, height: 900 } });

  test('共有できる環境でも、パソコンではダウンロードする', async ({ page }) => {
    await stubShare(page);
    await page.goto('/');
    await page.setInputFiles('input[type="file"]:not([accept*="zip"])', [FIXTURE]);
    await waitForStickers(page, 9);

    // 文言も変わらない
    const button = page.getByRole('button', { name: 'LINE用データを作成', exact: true });
    await expect(button).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
    expect(download.suggestedFilename()).toBe('LINE_UPLOAD.zip');
    expect(await shared(page), '共有が呼ばれてしまった').toEqual([]);
  });
});
