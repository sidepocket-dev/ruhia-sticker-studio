import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * ネットワークへ出ていく通信だけを記録する。
 *
 * blob: と data: はメモリ内の参照であって通信ではない（プレビュー画像や
 * 内蔵Workerがこれを使う）。file: は自分自身の読み込み。
 * 監視したいのは、外部サーバーへ本当にリクエストが飛んでいないかどうか。
 */
export function trackNetworkRequests(page: Page): string[] {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/^(https?|wss?):/i.test(request.url())) requests.push(request.url());
  });
  return requests;
}

/**
 * 読み込んだシートの解析が終わるのを待つ。
 *
 * 待ち時間は**枚数から決める**。1枚あたり約1.6MBを解析するので、
 * 5枚は1枚の5倍かかる。ここを固定値で書くと、機械が混んでいるときに
 * いちばん重い試験だけが落ちる（実際に落ちた）。
 *
 * 落ちたときに何を待っていたか分かるよう、メッセージを付ける。
 */
export async function waitForStickers(page: Page, found: number): Promise<void> {
  const sheets = Math.ceil(found / 9);
  const budget = 20_000 + sheets * 20_000;

  // 待ち時間だけ伸ばしても、テスト自体の上限（既定30秒 / test.slow() で90秒）が
  // 先に来て落ちる。実測でそれが起きた（5枚の解析が90秒を超えた）。
  // 予算に合わせてテストの上限も伸ばす。
  test.setTimeout(budget + 30_000);

  await expect(
    page.getByRole('heading', { name: `${found}個のスタンプを見つけました` }),
    `シート${sheets}枚の解析が${budget / 1000}秒で終わらなかった`,
  ).toBeVisible({ timeout: budget });
}
