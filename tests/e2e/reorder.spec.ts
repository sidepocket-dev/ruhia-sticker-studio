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

/**
 * 要素の中心の画面座標。
 *
 * page.mouse は画面座標で動くため、先に表示範囲へ入れてから座標を取る。
 * 取ってからスクロールすると、狙った位置とずれる。
 */
async function centerOf(
  locator: import('@playwright/test').Locator,
): Promise<{ x: number; y: number }> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 };
}

/** つまみを掴んで、指定した場所で離す。 */
async function dragHandleTo(
  page: import('@playwright/test').Page,
  fromIndex: number,
  target: { x: number; y: number },
): Promise<void> {
  const from = await centerOf(page.locator('.reorder__handle').nth(fromIndex));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 12 });
  await page.mouse.up();
}

/** 離したあとにマウスを動かしても、並びが変わらないことを確かめる。 */
async function expectDragEnded(page: import('@playwright/test').Page): Promise<void> {
  const afterRelease = await order(page);

  for (const index of [5, 1, 3]) {
    const point = await centerOf(page.locator('.reorder__handle').nth(index));
    await page.mouse.move(point.x, point.y, { steps: 4 });
  }

  expect(await order(page), '指を離したのに、まだくっついてきている').toEqual(afterRelease);
  await expect(page.locator('.reorder__item--dragging')).toHaveCount(0);
}

test('つまみをドラッグして並び順を入れ替えられる', async ({ page }) => {
  const before = await order(page);

  await dragHandleTo(page, 0, await centerOf(page.locator('.reorder__handle').nth(2)));

  const after = await order(page);
  expect(after[2]).toBe(before[0]);
  expect(after).not.toEqual(before);
  // 枚数も中身も変わっていない
  expect([...after].sort()).toEqual([...before].sort());
  await expectDragEnded(page);
});

test('カードの絵の上で離してもドラッグが終わる', async ({ page }) => {
  // つまみの上で離さないとドラッグが終わらない不具合があった。
  // 並び替えでDOMの要素が動くと、ポインタのつかみが外れるため
  const before = await order(page);
  await dragHandleTo(page, 0, await centerOf(page.locator('.reorder__item .reorder__image').nth(2)));

  expect(await order(page)).not.toEqual(before);
  await expectDragEnded(page);
});

test('カードとカードの隙間で離してもドラッグが終わる', async ({ page }) => {
  const second = await centerOf(page.locator('.reorder__item').nth(2));
  const third = await centerOf(page.locator('.reorder__item').nth(3));

  await dragHandleTo(page, 0, { x: (second.x + third.x) / 2, y: second.y });
  await expectDragEnded(page);
});

test('Escapeキーでドラッグをやめられる', async ({ page }) => {
  const from = await centerOf(page.locator('.reorder__handle').nth(0));
  const target = await centerOf(page.locator('.reorder__handle').nth(2));

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });

  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expectDragEnded(page);
});

test('ボタン一つで使いやすい順に並ぶ', async ({ page }) => {
  const labels = () => page.locator('.reorder__text').allTextContents();

  // 作った順では、あいさつが1番目と…に散らばっている
  await expect(page.locator('.reorder__text').first()).toHaveText('おはよう');
  const before = await labels();
  expect(before[1]).toBe('りょーかい');

  await page.getByRole('button', { name: '使いやすい順に並べる' }).click();

  const after = await labels();
  // 8個セットなので、あいさつ→返事→お礼…の順で1個ずつ
  expect(after[0]).toBe('おはよう');
  expect(after[1]).toBe('りょーかい');
  // 枚数も中身も変わらない
  expect([...after].sort()).toEqual([...before].sort());

  await page.getByRole('button', { name: '作った順に戻す' }).click();
  expect(await labels()).toEqual(before);
});

test('40個でも、種類ごとにまとまって並ぶ', async ({ page }) => {
  // 5枚（各1.6MB）を解析するので時間がかかる。並列で走ると余裕が必要
  test.slow();
  await page.getByRole('button', { name: '40 個', exact: false }).first().click();
  await page.setInputFiles('input[type="file"]', [
    FIXTURE,
    resolve(process.cwd(), 'tests/fixtures/sheet-2.png'),
    resolve(process.cwd(), 'tests/fixtures/sheet-3.png'),
    FIXTURE,
    resolve(process.cwd(), 'tests/fixtures/sheet-2.png'),
  ]);
  await expect(page.getByRole('heading', { name: '45個のスタンプを見つけました' })).toBeVisible({
    timeout: 60_000,
  });

  await page.getByRole('button', { name: '使いやすい順に並べる' }).click();

  const texts = await page.locator('.reorder__text').allTextContents();
  expect(texts).toHaveLength(40);

  // 最初の5個があいさつ（日常用の1〜5周目のあいさつ）
  expect(texts.slice(0, 5)).toEqual(['おはよう', 'やっほー', 'ただいま', 'ひさしぶり！', 'おかえり']);
  // 最後がおわび
  expect(texts.slice(-4)).toEqual(['遅れてごめん', 'ほんとごめん', 'わるかった', '反省してる…']);
});

test('カードのセリフを直すと、並び替えの表示にも反映される', async ({ page }) => {
  const first = page.locator('.sticker-card__text').first();
  await expect(first).toHaveValue('おはよう');

  await first.fill('おっはよー');

  await expect(page.locator('.reorder__text').first()).toHaveText('おっはよー');
});
