import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { trackNetworkRequests } from './helpers.js';

/** Web版（開発サーバー）で画面が立ち上がること。 */
test('Web版が表示される', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'RUHiA Sticker Studio' })).toBeVisible();
  await expect(page.getByText('画像はサーバーに送信されません。')).toBeVisible();
  expect(errors).toEqual([]);
});

/**
 * オフライン版が file:// から動くこと。PRODUCT_SPEC.md §54 / TEST_PLAN.md TC15。
 * 単一HTMLなので、外部リクエストが1件も発生しないことも確認する。
 */
test('オフライン版が file:// から表示され、外部通信をしない', async ({ page }) => {
  const offlineHtml = resolve(process.cwd(), 'dist-offline/index.html');
  test.skip(!existsSync(offlineHtml), 'npm run build:offline を先に実行してください');

  const externalRequests = trackNetworkRequests(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(pathToFileURL(offlineHtml).href);

  await expect(page.getByRole('heading', { name: 'RUHiA Sticker Studio' })).toBeVisible();
  await expect(page.getByText('画像はサーバーに送信されません。')).toBeVisible();

  // タブのアイコンがHTMLの中に入っていること。
  // 別ファイルにすると、HTML1枚で配ったときにアイコンだけ欠ける
  const icon = await page.locator('link[rel="icon"]').getAttribute('href');
  expect(icon, 'タブのアイコンがない').not.toBeNull();
  expect(icon?.startsWith('data:image/'), 'アイコンが別ファイルになっている').toBe(true);

  expect(errors).toEqual([]);
  expect(externalRequests, `外部へのリクエストが発生しました:\n${externalRequests.join('\n')}`).toEqual([]);
});

/**
 * オフライン版 (file://) で自動保存が使えるか。PRODUCT_SPEC.md §77.9。
 *
 * 実測ではChrome / WebKitとも使えたが、ブラウザのポリシーは変わりうる。
 * 失敗するようになったらフォールバック実装が必要になるため、常時監視する。
 */
test('オフライン版で保存機能が使える', async ({ page }) => {
  const offlineHtml = resolve(process.cwd(), 'dist-offline/index.html');
  test.skip(!existsSync(offlineHtml), 'npm run build:offline を先に実行してください');

  await page.goto(pathToFileURL(offlineHtml).href);

  const available = await page.evaluate(async () => {
    if (!('indexedDB' in globalThis) || indexedDB === null) return false;
    return await new Promise<boolean>((resolve) => {
      let request: IDBOpenDBRequest;
      try {
        request = indexedDB.open('ruhia-availability-probe', 1);
      } catch {
        resolve(false);
        return;
      }
      request.onsuccess = () => {
        request.result.close();
        indexedDB.deleteDatabase('ruhia-availability-probe');
        resolve(true);
      };
      request.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 3000);
    });
  });

  expect(available, 'file:// で保存が使えなくなりました。フォールバックの実装が必要です').toBe(true);
});
