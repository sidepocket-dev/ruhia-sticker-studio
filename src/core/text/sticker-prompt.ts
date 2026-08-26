import { COMPOSITION_LABELS } from './poses.js';
import type { StickerPlan } from './plan.js';
import { findStyle } from './styles.js';
import type { StylePresetId } from './styles.js';

/**
 * 画像生成プロンプトを組み立てる。
 *
 * 必ず入れる条件は、どれも実測に裏づけがある。
 *
 * ・「幅広で完全に透明な隙間」「背景・影なし」
 *     隙間の広いシートは単純分割で取り出せ、そうでないシートは
 *     高度な解析が必要になる（PRODUCT_SPEC.md §10 / §77.4）。
 *
 * ・「キャラクターを1体だけ」
 *     相手が必要な動作を指示したとき、2体描かれたことがある（§77.15）。
 *
 * ・「白い縁を付ける」
 *     見た目が良くなるうえ、白い縁が本体・文字・装飾をつないで
 *     1つの連結領域にするため、抽出が安定する（§77.21）。
 *     縁を後から描き足そうとしてはいけない。背景が不透明な画像では、
 *     白い縁と白い背景は同じ色でつながっており、色だけでは区別できない。
 *
 * この文面が必ず成功すると表現してはならない。あくまで推奨（§34）。
 */

/** 1行のスタンプ指定。 */
function stickerLine(plan: StickerPlan, index: number): string {
  return `${index + 1}. 「${plan.text}」／${plan.action}／${COMPOSITION_LABELS[plan.pose.composition]}`;
}

/** キャラクターの扱い。参照画像を正とし、特定のキャラクターの特徴は書かない。 */
function characterRules(sheetCount: number): string[] {
  const lines = [
    '添付画像のキャラクターをそのまま使用してください。',
    '参照画像で確認できる外見、衣装、体の特徴を維持してください。',
    '各ステッカーにはキャラクターを1体だけ描いてください。',
  ];
  if (sheetCount > 1) {
    lines.splice(2, 0, `${sheetCount}枚すべてで同一キャラクターとして統一してください。`);
  }
  return lines;
}

/** 見た目の共通条件。 */
function designRules(styleId: StylePresetId, sheetCount: number): string[] {
  const lines = [
    'セリフは日本語として正確で、はっきり読みやすく描いてください。',
    'ステッカーらしく、各ステッカー全体の外周には白い縁を設けてください。',
    '文字のレイアウトや感情を補助する表現は、各セリフとポーズに自然に合うものを使ってください。',
  ];
  if (sheetCount > 1) {
    lines.push(
      `${sheetCount}枚すべてを同じシリーズとして、キャラクターの描き方、質感、文字表現、`,
      '仕上がりに統一感を持たせてください。',
      `${sheetCount}枚の間で別の画風や別シリーズのデザインにならないようにしてください。`,
    );
  }
  return [...lines, ...findStyle(styleId).lines];
}

/** 並べ方の共通条件。抽出の成否に直結する。 */
const LAYOUT_RULES = [
  'ステッカー同士の間には、幅広い完全透明の隙間を設けてください。',
  '各ステッカーは完全に独立させ、隣のステッカーと接触・重複させないでください。',
  '背景、床、背景装飾、背景色、影は追加しないでください。',
];

/** シート1枚ぶんのプロンプト。 */
export function buildStickerPrompt(
  plans: StickerPlan[],
  styleId: StylePresetId = 'auto',
): string {
  return [
    '添付したキャラクターで、ステッカーシートを1枚作ってください。',
    '',
    '3×3のグリッドに9種類の異なるステッカーを配置した、',
    '正方形（1:1）の完全透明背景のステッカーシートを1枚作成してください。',
    '',
    '各ステッカーには以下のセリフをそれぞれ1つだけ使い、',
    '指定した表情・ポーズ・見せ方で描いてください。',
    '',
    ...plans.map(stickerLine),
    '',
    '【キャラクター】',
    ...characterRules(1),
    '',
    '【デザイン】',
    ...designRules(styleId, 1),
    '',
    '【レイアウト】',
    ...LAYOUT_RULES,
  ].join('\n');
}

/**
 * 複数シートを1回の依頼でまとめて作るプロンプト（追加仕様 §1.2 / §2）。
 *
 * まとめて頼むと、1枚ずつ頼むよりシリーズ感が揃いやすい傾向が確認されている
 * （追加仕様 §8）。ただしモデルによっては複数枚を返せないため、
 * 1枚ずつのモードは必ず残す。
 *
 * **1枚のコラージュにまとめられてしまうのが最大の失敗**なので、
 * 冒頭と末尾の2か所で禁止を明示する（追加仕様 §2 / §6.3）。
 */
export function buildBatchStickerPrompt(
  sheets: StickerPlan[][],
  styleId: StylePresetId = 'auto',
): string {
  const count = sheets.length;
  const sheetBlocks = sheets.flatMap((plans, index) => [
    `# シート${index + 1}`,
    ...plans.map(stickerLine),
    '',
  ]);

  return [
    `添付したキャラクターを使って、独立したステッカーシートを${count}枚生成してください。`,
    '',
    '【最重要】',
    `${count}セットを1枚の巨大な画像やコラージュにまとめないでください。`,
    '',
    `以下の「シート1」〜「シート${count}」を、`,
    `それぞれ別々の正方形（1:1）画像として合計${count}枚生成してください。`,
    '',
    '各画像はそれぞれ、',
    '- 3×3グリッド',
    '- 9種類のステッカー',
    '- 正方形（1:1）',
    '- 完全透明背景',
    '',
    'の独立したステッカーシートにしてください。',
    '',
    '【キャラクター】',
    ...characterRules(count),
    '',
    '【デザイン】',
    ...designRules(styleId, count),
    '',
    '【レイアウト】',
    ...LAYOUT_RULES,
    `${count}枚とも完全透明背景の正方形ステッカーシートとして別々に出力してください。`,
    '',
    ...sheetBlocks,
    `シート1からシート${count}までを、それぞれ独立した画像として合計${count}枚生成してください。`,
    `${count * 9}種類を1枚の画像にまとめないでください。`,
  ].join('\n');
}

/** すべてのシートぶんのプロンプトを、シート番号つきで返す。 */
export function buildAllStickerPrompts(
  sheets: StickerPlan[][],
  styleId: StylePresetId = 'auto',
): { sheet: number; prompt: string }[] {
  return sheets.map((plans, index) => ({
    sheet: index + 1,
    prompt: buildStickerPrompt(plans, styleId),
  }));
}
