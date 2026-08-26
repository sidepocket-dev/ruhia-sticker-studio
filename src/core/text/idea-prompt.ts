import { STICKER_CATEGORIES } from './categories.js';
import type { CategoryId } from './categories.js';
import { COMPOSITION_LABELS } from './poses.js';
import type { StickerPlan } from './plan.js';
import { findPreset } from './presets.js';
import type { Tone, UsePresetId } from './presets.js';
import { TONE_LABELS } from './presets/types.js';

/**
 * セリフをChatGPTに書き直してもらうためのプロンプトを組み立てる。
 *
 * 「45種類考えて」と丸投げしない。枠をこちらで決めて、1枠につき1件だけ書かせる。
 *
 * さらに「同じ種類の枠が5つあり、その5つは全部違う言い方にする」ことを明示する。
 * 枠のポーズだけを伝えて実際に試したところ、お礼の5枠すべてが
 * 「ありがとうございます」になった。AIは枠の種類を推測できても、
 * 「同じ種類どうしで重複するな」という制約は言わないと守らない。
 */
export function buildIdeaPrompt(
  plans: StickerPlan[],
  presetId: UsePresetId,
  tone: Tone,
): string {
  const preset = findPreset(presetId);
  const labels = new Map(STICKER_CATEGORIES.map((category) => [category.id, category.label]));

  const slotLines = plans.map((plan) => {
    const label = labels.get(plan.category) ?? '';
    const composition = COMPOSITION_LABELS[plan.pose.composition];
    return `${plan.id}. 【${label}】${plan.action}（${composition}）`;
  });

  // 同じ種類の枠がどれとどれかを明示する
  const byCategory = new Map<CategoryId, number[]>();
  for (const plan of plans) {
    byCategory.set(plan.category, [...(byCategory.get(plan.category) ?? []), plan.id]);
  }

  const groupLines: string[] = [];
  for (const [category, ids] of byCategory) {
    const label = labels.get(category) ?? '';
    if (ids.length < 2) continue;
    groupLines.push(
      `・【${label}】は ${ids.join('、')} 番の${ids.length}個です。${ids.length}個とも違う言い方にしてください。`,
    );
  }

  return [
    `LINEスタンプに入れる短い日本語のセリフを、${plans.length}個考えてください。`,
    '',
    `用途：${preset.label}（${preset.description}）`,
    `言葉づかい：${TONE_LABELS[tone]}`,
    '',
    'いちばん大事な条件',
    `・${plans.length}個すべて違う言葉にしてください`,
    '・同じ言葉を2つ以上の番号で使わないでください',
    '・「ありがとうございます」のようなよく使う言葉ほど、1回だけにしてください',
    '',
    '同じ種類の枠がいくつかあります。種類ごとに言い方を変えてください。',
    ...groupLines,
    '',
    '下の枠それぞれに、ぴったり合うセリフを1つずつ書いてください。',
    '枠の番号は変えないでください。',
    '',
    ...slotLines,
    '',
    'そのほかの条件',
    '・1つのセリフは8文字以内を目安にする',
    '・実際のトークでそのまま送れる言葉にする',
    '・説明や見出しは書かない',
    '',
    '出力の形式',
    '',
    '1. セリフ',
    '2. セリフ',
    `${plans.length}. セリフ`,
    '',
    `1番から${plans.length}番まで、順番どおりに${plans.length}行書いてください。`,
  ].join('\n');
}
