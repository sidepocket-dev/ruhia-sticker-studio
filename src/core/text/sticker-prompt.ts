import { COMPOSITION_LABELS } from './poses.js';
import type { StickerPlan } from './plan.js';

/**
 * シート1枚ぶんの画像生成プロンプトを組み立てる。
 *
 * 「幅広で完全に透明な隙間」「背景・影・重なりなし」は必ず入れる。
 * これは好みの問題ではなく、実測で抽出の成否に直結することが分かっている
 * （隙間の広いシートは単純分割で取り出せ、そうでないシートは
 * 高度な解析が必要になる。PRODUCT_SPEC.md §10 / §77.4）。
 *
 * この文面が必ず成功すると表現してはならない。あくまで推奨（§34）。
 */
export function buildStickerPrompt(plans: StickerPlan[]): string {
  const lines = plans.map(
    (plan, index) =>
      `${index + 1}. 「${plan.text}」／${plan.action}／${COMPOSITION_LABELS[plan.pose.composition]}`,
  );

  return [
    '添付したキャラクターで、ステッカーシートを1枚作ってください。',
    '',
    '3×3のグリッドに9種類の異なるステッカーを配置した、',
    '正方形（1:1）の透明なステッカーシートを1枚作成してください。',
    '',
    '各ステッカーには以下のセリフをそれぞれ1つだけ使い、',
    '指定した表情・ポーズ・見せ方で描いてください。',
    '',
    ...lines,
    '',
    'キャラクターの見た目は添付画像のとおりにしてください。',
    '衣装や体の特徴を変えないでください。',
    '',
    'ステッカーの間には、幅広で完全に透明な隙間を設けてください。',
    '各ステッカーはそれぞれ独立させ、',
    '隣のステッカーと接触または重ならないようにしてください。',
    '背景、背景装飾、影は追加しないでください。',
  ].join('\n');
}

/** すべてのシートぶんのプロンプトを、シート番号つきで返す。 */
export function buildAllStickerPrompts(sheets: StickerPlan[][]): { sheet: number; prompt: string }[] {
  return sheets.map((plans, index) => ({ sheet: index + 1, prompt: buildStickerPrompt(plans) }));
}
