import { toAlphaMask, transparentRatio } from './alpha-mask.js';
import { DEFAULT_BACKGROUND_OPTIONS, removeBackground } from './background.js';
import type { BackgroundOptions, BackgroundResult } from './background.js';
import { DEFAULT_DETECT_OPTIONS, detectStickers } from './detect.js';
import type { DetectOptions, DetectOutcome } from './detect.js';
import type { PixelBuffer } from './types.js';

/**
 * 背景を抜く必要があるか判断し、必要なら抜いてから抽出する（PRODUCT_SPEC.md §9）。
 *
 * 白いステッカー縁は、ここでは復元しない。生成時のプロンプトで付けてもらう。
 * 背景が不透明な画像では白い縁と白い背景が同じ色でつながっており、
 * 色だけでは区別できないため（sticker-prompt.ts / PRODUCT_SPEC.md §10）。
 */
export interface PrepareOptions {
  detect: DetectOptions;
  background: BackgroundOptions;
  /** 背景を抜いてよいか。ユーザーが指示したときだけ true にする */
  allowBackgroundRemoval: boolean;
  /** これ未満の透明率なら、透過されていないと判断する */
  minTransparentRatio: number;
}

export const DEFAULT_PREPARE_OPTIONS: PrepareOptions = {
  detect: DEFAULT_DETECT_OPTIONS,
  background: DEFAULT_BACKGROUND_OPTIONS,
  allowBackgroundRemoval: false,
  minTransparentRatio: 0.02,
};

export type PrepareStatus =
  | 'ready'
  | 'needs-background-removal'
  | 'failed';

export interface PrepareResult {
  status: PrepareStatus;
  /** 抽出に使った画素。背景を抜いた場合は抜いたあとのもの */
  buffer: PixelBuffer;
  outcome: DetectOutcome | null;
  /** 背景を抜いた場合の詳細 */
  background: BackgroundResult | null;
}

export function prepareSheet(
  buffer: PixelBuffer,
  options: PrepareOptions = DEFAULT_PREPARE_OPTIONS,
): PrepareResult {
  const mask = toAlphaMask(buffer, options.detect.alphaThreshold);
  const hasTransparency = transparentRatio(mask) >= options.minTransparentRatio;

  if (hasTransparency) {
    return {
      status: 'ready',
      buffer,
      outcome: detectStickers(buffer, options.detect),
      background: null,
    };
  }

  if (!options.allowBackgroundRemoval) {
    return {
      status: 'needs-background-removal',
      buffer,
      outcome: null,
      background: null,
    };
  }

  const background = removeBackground(buffer, options.background);
  const outcome = detectStickers(background.buffer, options.detect);

  return {
    status: outcome.ok ? 'ready' : 'failed',
    buffer: background.buffer,
    outcome,
    background,
  };
}
