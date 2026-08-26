import { computed, signal } from '@preact/signals';
import { describeDuplicates, findDuplicates } from '../core/text/duplicates.js';
import { buildIdeaPrompt } from '../core/text/idea-prompt.js';
import { buildPlans, groupBySheet } from '../core/text/plan.js';
import type { StickerPlan } from '../core/text/plan.js';
import { describeParseResult, parsePastedText } from '../core/text/parser.js';
import type { FailedLine } from '../core/text/parser.js';
import { USE_PRESETS, findPreset } from '../core/text/presets.js';
import type { Tone, UsePresetId } from '../core/text/presets.js';
import { buildAllStickerPrompts } from '../core/text/sticker-prompt.js';
import { candidateCount, targetCount } from './project.js';

export const presetId = signal<UsePresetId>('daily');
export const tone = signal<Tone>('casual');

/** ユーザーが書き換えた、またはChatGPTの回答で置き換えたセリフ。キーは通し番号。 */
export const textOverrides = signal<Record<number, string>>({});

export const pasteInput = signal<string>('');
export const pasteMessage = signal<string>('');
export const pasteFailures = signal<FailedLine[]>([]);

export const preset = computed(() => findPreset(presetId.value));

/** 用途・言葉づかい・個数から組み立てた計画に、書き換えを反映したもの。 */
export const plans = computed<StickerPlan[]>(() => {
  const base = buildPlans({
    preset: presetId.value,
    tone: tone.value,
    targetCount: targetCount.value,
  });
  const overrides = textOverrides.value;
  return base.map((plan) => {
    const override = overrides[plan.id];
    return override === undefined ? plan : { ...plan, text: override };
  });
});

export const planSheets = computed(() => groupBySheet(plans.value));

export const stickerPrompts = computed(() => buildAllStickerPrompts(planSheets.value));

export const ideaPrompt = computed(() =>
  buildIdeaPrompt(plans.value, presetId.value, tone.value),
);

/** 似ているセリフがあれば知らせる（PRODUCT_SPEC.md §29）。 */
export const duplicateNotice = computed(() => {
  const overrides = textOverrides.value;
  // 用意した表は確認済みなので、書き換えられたときだけ見る
  if (Object.keys(overrides).length === 0) return '';
  return describeDuplicates(findDuplicates(plans.value.map((plan) => plan.text)));
});

export function choosePreset(id: UsePresetId): void {
  presetId.value = id;
  tone.value = findPreset(id).defaultTone;
  clearOverrides();
}

export function chooseTone(next: Tone): void {
  tone.value = next;
  clearOverrides();
}

export function editText(id: number, text: string): void {
  textOverrides.value = { ...textOverrides.value, [id]: text };
}

export function clearOverrides(): void {
  textOverrides.value = {};
  pasteMessage.value = '';
  pasteFailures.value = [];
}

/**
 * 貼り付けられたChatGPTの回答でセリフを置き換える。
 *
 * 番号が枠の番号と対応していればその枠へ、対応が取れなければ上から順に当てる。
 * ChatGPTが番号を振り直してくることがあるため。
 */
export function applyPastedText(): void {
  const result = parsePastedText(pasteInput.value);
  const needed = candidateCount.value;

  pasteFailures.value = result.failed;
  pasteMessage.value = describeParseResult(result.entries.length, needed);

  if (result.entries.length === 0) return;

  const overrides: Record<number, string> = {};
  const numbersLookValid = result.entries.every(
    (entry) => entry.number >= 1 && entry.number <= needed,
  );

  result.entries.forEach((entry, index) => {
    const id = numbersLookValid ? entry.number : index + 1;
    if (id >= 1 && id <= needed) overrides[id] = entry.text;
  });

  textOverrides.value = overrides;
}

export { USE_PRESETS };
