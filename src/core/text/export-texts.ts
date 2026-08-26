import type { StickerPlan } from './plan.js';

/**
 * 提出したスタンプの一覧をテキストで書き出す（PRODUCT_SPEC.md §50）。
 *
 * 番号は最終的な並び順（01から始まる連番）。
 * どの画像がどのセリフだったかを、あとから確認できるようにするためのもの。
 */
export function buildTextsTxt(plans: readonly StickerPlan[]): string {
  return plans
    .map((plan, index) => `${String(index + 1).padStart(2, '0')} ${plan.text}`)
    .join('\n')
    .concat('\n');
}

export interface TextsJsonEntry {
  id: number;
  text: string;
  action: string;
}

export function buildTextsJson(plans: readonly StickerPlan[]): string {
  const entries: TextsJsonEntry[] = plans.map((plan, index) => ({
    id: index + 1,
    text: plan.text,
    action: plan.action,
  }));
  return `${JSON.stringify(entries, null, 2)}\n`;
}
