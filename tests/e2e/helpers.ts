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
