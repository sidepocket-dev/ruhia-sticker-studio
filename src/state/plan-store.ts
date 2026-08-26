import { computed, signal } from '@preact/signals';
import { describeDuplicates, findDuplicates } from '../core/text/duplicates.js';
import { buildIdeaPrompt } from '../core/text/idea-prompt.js';
import { buildPlans, groupBySheet } from '../core/text/plan.js';
import type { StickerPlan } from '../core/text/plan.js';
import { describeParseResult, parsePastedText } from '../core/text/parser.js';
import type { FailedLine } from '../core/text/parser.js';
import { USE_PRESETS, findPreset } from '../core/text/presets.js';
import type { Tone, UsePresetId } from '../core/text/presets.js';
import { buildAllStickerPrompts, buildBatchStickerPrompt } from '../core/text/sticker-prompt.js';
import type { StylePresetId } from '../core/text/styles.js';
import { candidateCount, targetCount } from './project.js';

export const presetId = signal<UsePresetId>('daily');
export const tone = signal<Tone>('casual');

/** 全体の仕上がり設定（追加仕様 §6）。標準はAIにまかせる */
export const stylePreset = signal<StylePresetId>('auto');

/**
 * 生成の頼み方（追加仕様 §1）。
 *
 * まとめて頼むとシリーズ感が揃いやすいが、モデルによっては複数枚を返せない。
 * そのため1枚ずつのモードを必ず残す。
 */
export type GenerationMode = 'one-by-one' | 'batch';
export const generationMode = signal<GenerationMode>('one-by-one');

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

export const stickerPrompts = computed(() =>
  buildAllStickerPrompts(planSheets.value, stylePreset.value),
);

/** すべてのシートを1回で頼むプロンプト。 */
export const batchPrompt = computed(() =>
  buildBatchStickerPrompt(planSheets.value, stylePreset.value),
);

export const ideaPrompt = computed(() =>
  buildIdeaPrompt(plans.value, presetId.value, tone.value),
);

export interface DuplicateNotice {
  text: string;
  /** 重なっている枠の番号（1始まり） */
  numbers: number[];
  kind: 'same' | 'contained';
}

/**
 * 似ているセリフがあれば知らせる（PRODUCT_SPEC.md §29）。
 *
 * 用意した表は確認済みなので、書き換えられたときだけ見る。
 * 件数だけでなく、どの番号がどう重なっているかまで出す。
 * 実際のAI出力では「ありがとうございます」が5つの枠に入っていたため、
 * 番号が分からないと直しようがない。
 */
export const duplicateGroups = computed<DuplicateNotice[]>(() => {
  if (Object.keys(textOverrides.value).length === 0) return [];

  const list = plans.value;
  return findDuplicates(list.map((plan) => plan.text)).map((group) => ({
    text: group.indexes.map((index) => list[index]?.text ?? '').join(' / '),
    numbers: group.indexes.map((index) => list[index]?.id ?? index + 1),
    kind: group.kind,
  }));
});

export const duplicateNotice = computed(() => {
  if (Object.keys(textOverrides.value).length === 0) return '';
  return describeDuplicates(findDuplicates(plans.value.map((plan) => plan.text)));
});

/**
 * まったく同じになっているセリフを、用意した表のものへ戻す。
 *
 * 全部戻すとAIに書かせた意味がなくなるので、重なっている枠だけを直す。
 * 同じ言葉が複数の枠に入っている場合、最初の1つは残して残りを戻す。
 *
 * 1回では終わらない。戻した先のセリフが別の枠と重なることがあるため、
 * 完全一致が無くなるまで繰り返す。
 *
 * 「似ている」だけの組（「ありがとう」と「ほんとにありがとう」など）は戻さない。
 * 用意した表にも意図した使い分けとして入っており、消し切れないため。
 */
export function revertDuplicates(): void {
  const base = buildPlans({
    preset: presetId.value,
    tone: tone.value,
    targetCount: targetCount.value,
  });
  const baseById = new Map(base.map((plan) => [plan.id, plan.text]));
  const ids = base.map((plan) => plan.id);

  let current = { ...textOverrides.value };
  const textsOf = (overrides: Record<number, string>): string[] =>
    ids.map((id) => overrides[id] ?? baseById.get(id) ?? '');

  // 戻した結果がまた重なることがあるので、変化しなくなるまで回す
  for (let pass = 0; pass < ids.length; pass++) {
    const exact = findDuplicates(textsOf(current)).filter((group) => group.kind === 'same');
    if (exact.length === 0) break;

    const next = { ...current };
    for (const group of exact) {
      // 最初の1つは残す
      for (const index of group.indexes.slice(1)) {
        const id = ids[index];
        if (id === undefined) continue;
        const original = baseById.get(id);
        if (original !== undefined) next[id] = original;
      }
    }

    const changed = ids.some((id) => next[id] !== current[id]);
    if (!changed) break;
    current = next;
  }

  textOverrides.value = current;
}

export function choosePreset(id: UsePresetId): void {
  presetId.value = id;
  tone.value = findPreset(id).defaultTone;
  clearOverrides();
}

export function chooseStyle(next: StylePresetId): void {
  stylePreset.value = next;
}

export function chooseGenerationMode(next: GenerationMode): void {
  generationMode.value = next;
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
