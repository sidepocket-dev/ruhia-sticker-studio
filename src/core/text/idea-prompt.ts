import { COMPOSITION_LABELS } from './poses.js';
import type { StickerPlan } from './plan.js';
import { findPreset } from './presets.js';
import type { Tone, UsePresetId } from './presets.js';
import { TONE_LABELS } from './presets/types.js';

/**
 * セリフをChatGPTに書き直してもらうためのプロンプトを組み立てる。
 *
 * 「45種類考えて」と丸投げしない。枠をこちらで決めて、1枠につき1件だけ書かせる。
 * 自由に考えさせると、似た意味・似た言い回しが混ざることが実際に観測されている
 * （PRODUCT_SPEC.md §8）。枠を先に決めれば、重複は構造的に起きにくくなる。
 */
export function buildIdeaPrompt(
  plans: StickerPlan[],
  presetId: UsePresetId,
  tone: Tone,
): string {
  const preset = findPreset(presetId);

  const lines = plans.map(
    (plan) =>
      `${plan.id}. ${preset.label}／${plan.pose.emotion}／${plan.pose.pose}／${COMPOSITION_LABELS[plan.pose.composition]}`,
  );

  return [
    `LINEスタンプに入れる短い日本語のセリフを、${plans.length}個考えてください。`,
    '',
    `用途：${preset.label}（${preset.description}）`,
    `言葉づかい：${TONE_LABELS[tone]}`,
    '',
    '下の枠それぞれに、ぴったり合うセリフを1つずつ書いてください。',
    '枠の番号は変えないでください。',
    '',
    ...lines,
    '',
    '条件：',
    '- 1つのセリフは8文字以内を目安にする',
    '- 同じ意味・似た言い回しを繰り返さない',
    '- 実際のトークでそのまま送れる言葉にする',
    '- 説明や補足は書かない',
    '',
    '出力は次の形式だけにしてください。',
    '',
    '1. セリフ',
    '2. セリフ',
    '3. セリフ',
  ].join('\n');
}
