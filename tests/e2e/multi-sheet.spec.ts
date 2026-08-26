import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { unzipSync } from 'fflate';
import { LINE_STATIC_STICKER_SPEC, stickerFileName } from '../../src/config/line-spec.js';
import { readPngInfo } from '../../src/core/line/png-info.js';

const fixture = (name: string): string => resolve(process.cwd(), 'tests/fixtures', name);
const SHEETS = ['sheet-a.png', 'sheet-b.png', 'sheet-c.png'].map(fixture);
const SPEC = LINE_STATIC_STICKER_SPEC;

async function chooseCount(page: import('@playwright/test').Page, count: number): Promise<void> {
  const button = page.getByRole('button', { name: `${count} 個`, exact: false }).first();
  await button.click();
  // 選べたことをここで確かめる。効いていないまま先へ進むと、
  // 失敗が後段の分かりにくい形で現れる
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

test('3枚まとめて読み込むと27個の候補になる', async ({ page }) => {
  await page.goto('/');
  await chooseCount(page, 24);
  await page.setInputFiles('input[type="file"]', SHEETS);

  await expect(page.getByRole('heading', { name: '27個のスタンプを見つけました' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('.sticker-grid .sticker-card')).toHaveCount(27);
  await expect(page.locator('.sheet-list__item')).toHaveCount(3);

  // 24個が自動で選ばれ、そのまま書き出せる
  await expect(page.getByText('24 / 24 選択済み')).toBeVisible();
  await expect(page.locator('.reorder__item')).toHaveCount(24);
});

test('TC08: 5枚から40個セットのZIPを作れる', async ({ page }) => {
  // 5枚の解析と42枚の書き出し。並列で走ると余裕が必要
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await chooseCount(page, 40);
  // 5枚分の経路を通す。同じ絵でも処理の流れは変わらない
  await page.setInputFiles('input[type="file"]', [...SHEETS, ...SHEETS.slice(0, 2)]);

  await expect(page.getByRole('heading', { name: '45個のスタンプを見つけました' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText('40 / 40 選択済み')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'LINE用データを作成' }).click(),
  ]);

  const zipBytes = readFileSync(await download.path());
  const files = unzipSync(new Uint8Array(zipBytes));

  expect(Object.keys(files).sort()).toEqual(
    [
      SPEC.fileNames.main,
      SPEC.fileNames.tab,
      ...Array.from({ length: 40 }, (_, i) => stickerFileName(i + 1)),
    ].sort(),
  );
  expect(zipBytes.byteLength).toBeLessThanOrEqual(SPEC.zipMaxBytes);

  for (let i = 1; i <= 40; i++) {
    const bytes = files[stickerFileName(i)];
    expect(bytes, stickerFileName(i)).toBeDefined();
    if (!bytes) continue;
    const info = readPngInfo(bytes);
    expect(info?.width ?? 0).toBeLessThanOrEqual(SPEC.sticker.maxWidth);
    expect(info?.height ?? 0).toBeLessThanOrEqual(SPEC.sticker.maxHeight);
    expect((info?.width ?? 1) % 2).toBe(0);
    expect((info?.height ?? 1) % 2).toBe(0);
    expect(bytes.byteLength).toBeLessThanOrEqual(SPEC.sticker.maxBytes);
  }

  expect(errors).toEqual([]);
});

test('シートの順番を入れ替えると候補の並びも変わる', async ({ page }) => {
  await page.goto('/');
  await chooseCount(page, 16);
  await page.setInputFiles('input[type="file"]', SHEETS.slice(0, 2));
  await expect(page.getByRole('heading', { name: '18個のスタンプを見つけました' })).toBeVisible({
    timeout: 30_000,
  });

  const names = () => page.locator('.sheet-list__name').allTextContents();
  const firstCandidate = () =>
    page.locator('.sticker-grid .sticker-card__image').first().getAttribute('src');

  const beforeNames = await names();
  const beforeFirst = await firstCandidate();

  await page.getByRole('button', { name: /を後へ$/ }).first().click();

  expect(await names()).toEqual([beforeNames[1], beforeNames[0]]);
  expect(await firstCandidate()).not.toBe(beforeFirst);
});

test('シートを取り除ける', async ({ page }) => {
  await page.goto('/');
  await chooseCount(page, 16);
  await page.setInputFiles('input[type="file"]', SHEETS.slice(0, 2));
  await expect(page.locator('.sheet-list__item')).toHaveCount(2);

  await page.getByRole('button', { name: /を取り除く$/ }).first().click();

  // 残り1枚。足りない分は「まだ読み込んでいません」として表示される
  await expect(page.locator('.sheet-list__item--missing')).toHaveCount(1);
  await expect(page.locator('.sticker-grid .sticker-card')).toHaveCount(9);
  await expect(page.getByText('あと7個選んでください。')).toBeVisible();
});

test('読み込めない画像があっても、他のシートは残る', async ({ page }) => {
  await page.goto('/');
  await chooseCount(page, 16);
  await page.setInputFiles('input[type="file"]', [fixture('opaque.png'), ...SHEETS.slice(0, 2)]);

  await expect(page.getByRole('heading', { name: '読み込めなかった画像があります' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('背景が透明ではありません。')).toBeVisible();

  // 残りの2枚はきちんと読み込まれている
  await expect(page.locator('.sheet-list__item')).toHaveCount(2);
  await expect(page.locator('.sticker-grid .sticker-card')).toHaveCount(18);
  await expect(page.getByText('16 / 16 選択済み')).toBeVisible();
});

test('個数を変えると必要なシート枚数の案内が変わる', async ({ page }) => {
  await page.goto('/');

  await chooseCount(page, 8);
  await expect(page.getByText('8個作るには1枚必要です。')).toBeVisible();

  await chooseCount(page, 40);
  await expect(page.getByText('40個作るには5枚必要です。')).toBeVisible();
});
