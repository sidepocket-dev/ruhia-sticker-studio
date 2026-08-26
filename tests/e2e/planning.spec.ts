import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FIXTURE = resolve(process.cwd(), 'tests/fixtures/sheet-a.png');

/** セリフ一覧は既定でたたまれている。中身を見るテストでは開く。 */
async function openPlanList(page: import('@playwright/test').Page): Promise<void> {
  const toggle = page.getByRole('button', { name: 'セリフを見る・直す' });
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
}

test('用途を選ぶとセリフが入れ替わる', async ({ page }) => {
  await page.goto('/');

  await openPlanList(page);
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
  await openPlanList(page);
  const third = page.locator('.plan-list__text').nth(2);
  await expect(third).toHaveValue('ありがとう');

  await page.getByRole('button', { name: 'ていねい' }).click();
  await expect(third).toHaveValue('ありがとうございます');
});

test('個数を変えると必要なシート枚数ぶんセリフが並ぶ', async ({ page }) => {
  await page.goto('/');
  await openPlanList(page);
  await expect(page.locator('.plan-list__text')).toHaveCount(9);
  await expect(page.locator('.plan-list__sheet')).toHaveCount(1);

  await page.getByRole('button', { name: '40 個', exact: false }).first().click();
  await expect(page.locator('.plan-list__text')).toHaveCount(45);
  await expect(page.locator('.plan-list__sheet')).toHaveCount(5);
  await expect(page.getByText('うすい色の5個は予備です。', { exact: false })).toBeVisible();
});

test('セリフを書き換えられる', async ({ page }) => {
  await page.goto('/');
  await openPlanList(page);
  const first = page.locator('.plan-list__text').first();
  await first.fill('おっはー');
  await expect(first).toHaveValue('おっはー');

  // 画像生成プロンプトにも反映される
  await page.getByRole('button', { name: '文章を見る' }).first().click();
  await expect(page.locator('.sheet-prompts__item textarea').first()).toHaveValue(/おっはー/);
});

test('シートごとの画像生成プロンプトが作られる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '24 個', exact: false }).first().click();
  await expect(page.locator('.sheet-prompts__item')).toHaveCount(3);

  await page.getByRole('button', { name: '文章を見る' }).first().click();
  const prompt = page.locator('.sheet-prompts__item textarea').first();

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
  await openPlanList(page);
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

  // セリフはその場で直せるよう入力欄になっている
  const texts = page.locator('.sticker-card__text');
  await expect(texts).toHaveCount(9);
  await expect(texts.first()).toHaveValue('おはよう');
  await expect(texts.nth(8)).toHaveValue('またね');

  // 絵と文字が合っていないときに直せる
  await texts.first().fill('おっはよー');
  await expect(texts.first()).toHaveValue('おっはよー');
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

/** 実際のChatGPTの回答（重複だらけ）を貼ったときの流れ。 */
test('重複しているセリフを、番号つきで知らせて直せる', async ({ page }) => {
  const answer = readFileSync(
    resolve(process.cwd(), 'tests/fixtures/chatgpt-answer-business.txt'),
    'utf8',
  );

  await page.goto('/');
  await page.getByRole('button', { name: '40 個', exact: false }).first().click();
  await page.getByRole('button', { name: 'ビジネス用', exact: false }).click();
  await page.getByRole('button', { name: 'セリフをChatGPTに考えてもらう', exact: false }).click();

  await page.locator('.idea__paste').fill(answer);
  await page.getByRole('button', { name: 'このセリフを使う' }).click();

  await expect(page.getByText('45件読み込みました')).toBeVisible();

  // どの番号が重なっているかまで見せる
  const notice = page.locator('.plan-list__notice');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('同じセリフが');
  await expect(notice).toContainText('03、12、21、30、36、39番');

  // 同じになっている分だけ、もとのセリフへ戻せる
  await page.getByRole('button', { name: '同じになっている分を、もとのセリフに戻す' }).click();

  // まったく同じセリフは無くなる
  await expect(notice).not.toContainText('同じセリフが');
  // 「似ている」だけの組は残りうる（用意した表にも意図した使い分けとして入っている）

  // AIが書いた分は残っている
  await expect(page.locator('.plan-list__text').first()).toHaveValue('よろしくお願いします');
  // 重なっていた枠は用意したセリフに戻っている
  await expect(page.locator('.plan-list__text').nth(11)).toHaveValue('助かります');

  // 45件のうち大半はAIが書いたものが残る
  const values = await page.locator('.plan-list__text').evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLInputElement).value),
  );
  expect(values.filter((value) => value === 'ありがとうございます')).toHaveLength(1);
});

test('開かなくてもプロンプトをコピーできる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '24 個', exact: false }).first().click();

  // コピーボタンは最初から見えている（開く操作を必要としない）
  const copyButtons = page.getByRole('button', { name: 'プロンプトをコピー' });
  await expect(copyButtons).toHaveCount(3);
  for (let i = 0; i < 3; i++) await expect(copyButtons.nth(i)).toBeVisible();

  // 文章そのものは、見たいときだけ開く
  await expect(page.locator('.sheet-prompts__item textarea')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '文章を見る' }).first()).toHaveAttribute(
    'aria-expanded',
    'false',
  );

  await page.getByRole('button', { name: '文章を見る' }).first().click();
  await expect(page.locator('.sheet-prompts__item textarea')).toHaveCount(1);
  await expect(page.getByRole('button', { name: '文章を見る' }).first()).toHaveAttribute(
    'aria-expanded',
    'true',
  );
});

test('コピーすると、その場で結果を知らせる', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'プロンプトをコピー' }).first().click();

  // 失敗したときは「手で選んでコピーしてください」と出る作りなので、
  // 成功の文言が出ることを確かめる
  await expect(page.getByText('コピーしました')).toBeVisible();
  await expect(page.getByText('コピーできませんでした', { exact: false })).toHaveCount(0);
});

test('コピーした中身が画像生成プロンプトになっている', async ({ page, context, browserName }) => {
  // クリップボードの読み出しに対応しているブラウザだけで中身まで確かめる。
  // 見た目の動作は上のテストが全ブラウザで見ている
  test.skip(browserName !== 'chromium', 'クリップボードの読み出しに未対応');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.goto('/');
  await page.getByRole('button', { name: 'プロンプトをコピー' }).first().click();

  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('幅広で完全に透明な隙間');
  expect(copied).toContain('背景、背景装飾、影は追加しないでください');
  expect(copied).toContain('「おはよう」');
  expect(copied).toContain('「またね」');
});
