import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const FIXTURE = resolve(process.cwd(), 'tests/fixtures/sheet-a.png');

test('用途を選ぶとセリフが入れ替わる', async ({ page }) => {
  await page.goto('/');

  const first = page.locator('.plan-list__text').first();
  await expect(first).toHaveValue('おはよう');

  await page.getByRole('button', { name: 'ビジネス用', exact: false }).click();
  await expect(first).toHaveValue('おはようございます');

  // ビジネス用は「ていねい」が初期値になる
  await expect(page.getByRole('button', { name: 'ていねい' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('言葉づかいを変えるとセリフが変わる', async ({ page }) => {
  await page.goto('/');
  const third = page.locator('.plan-list__text').nth(2);
  await expect(third).toHaveValue('ありがとう');

  await page.getByRole('button', { name: 'ていねい' }).click();
  await expect(third).toHaveValue('ありがとうございます');
});

test('個数を変えると必要なシート枚数ぶんセリフが並ぶ', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.plan-list__text')).toHaveCount(9);
  await expect(page.locator('.plan-list__sheet')).toHaveCount(1);

  await page.getByRole('button', { name: '40 個', exact: false }).first().click();
  await expect(page.locator('.plan-list__text')).toHaveCount(45);
  await expect(page.locator('.plan-list__sheet')).toHaveCount(5);
  await expect(page.getByText('うすい色の5個は予備です。', { exact: false })).toBeVisible();
});

test('セリフを書き換えられる', async ({ page }) => {
  await page.goto('/');
  const first = page.locator('.plan-list__text').first();
  await first.fill('おっはー');
  await expect(first).toHaveValue('おっはー');

  // 画像生成プロンプトにも反映される
  await page.locator('.sheet-prompts__item summary').first().click();
  await expect(page.locator('.sheet-prompts__body textarea').first()).toHaveValue(
    /おっはー/,
  );
});

test('シートごとの画像生成プロンプトが作られる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '24 個', exact: false }).first().click();
  await expect(page.locator('.sheet-prompts__item')).toHaveCount(3);

  await page.locator('.sheet-prompts__item summary').first().click();
  const prompt = page.locator('.sheet-prompts__body textarea').first();

  // 抽出しやすくするための指示が必ず入っている
  await expect(prompt).toHaveValue(/幅広で完全に透明な隙間/);
  await expect(prompt).toHaveValue(/背景、背景装飾、影は追加しないでください/);
  await expect(prompt).toHaveValue(/衣装や体の特徴を変えないでください/);
});

test('ChatGPTの回答を貼り付けてセリフを差し替えられる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'セリフをChatGPTに考えてもらう', exact: false }).click();

  const answer = [
    'もちろんです！以下をご提案します。',
    '',
    '### グループ1',
    ...Array.from({ length: 9 }, (_, i) => `${i + 1}. テスト${i + 1}`),
    '',
    'ご確認ください。',
  ].join('\n');

  await page.locator('.idea__paste').fill(answer);
  await page.getByRole('button', { name: 'このセリフを使う' }).click();

  await expect(page.getByText('9件読み込みました')).toBeVisible();
  await expect(page.locator('.plan-list__text').first()).toHaveValue('テスト1');
  await expect(page.locator('.plan-list__text').nth(8)).toHaveValue('テスト9');

  await page.getByRole('button', { name: 'もとに戻す' }).click();
  await expect(page.locator('.plan-list__text').first()).toHaveValue('おはよう');
});

test('読み取れない行を知らせる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'セリフをChatGPTに考えてもらう', exact: false }).click();
  await page.locator('.idea__paste').fill('1. おはよう\n2.\n3. ありがとう');
  await page.getByRole('button', { name: 'このセリフを使う' }).click();

  await expect(page.getByText('2件読み込みました。あと7件必要です。')).toBeVisible();
  await expect(page.getByText('2行目：', { exact: false })).toBeVisible();
});

test('抽出したスタンプに、想定しているセリフが表示される', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type="file"]', FIXTURE);
  await expect(page.getByRole('heading', { name: '9個のスタンプを見つけました' })).toBeVisible({
    timeout: 15_000,
  });

  const texts = await page.locator('.sticker-card__text').allTextContents();
  expect(texts).toHaveLength(9);
  expect(texts[0]).toBe('おはよう');
});

test('セリフ一覧を保存できる', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type="file"]', FIXTURE);
  await expect(page.getByRole('heading', { name: '9個のスタンプを見つけました' })).toBeVisible({
    timeout: 15_000,
  });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'セリフ一覧を保存（texts.txt）' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('texts.txt');
});
