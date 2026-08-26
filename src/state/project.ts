import { computed, signal } from '@preact/signals';
import {
  LINE_STATIC_STICKER_SPEC,
  STICKERS_PER_SHEET,
  candidateCountFor,
  sheetCountFor,
} from '../config/line-spec.js';

/** 作るスタンプの個数。LINEが受け付ける数だけを選べる。 */
export const targetCount = signal<number>(LINE_STATIC_STICKER_SPEC.allowedCounts[0] ?? 8);

/** 必要なシート枚数（1枚 = 9個） */
export const requiredSheets = computed(() => sheetCountFor(targetCount.value));

/** 用意できる候補の数 */
export const candidateCount = computed(() => candidateCountFor(targetCount.value));

/** 候補のうち、使わずに済ませられる数 */
export const spareCount = computed(() => candidateCount.value - targetCount.value);

export function setTargetCount(count: number): void {
  targetCount.value = count;
}

export { STICKERS_PER_SHEET };
