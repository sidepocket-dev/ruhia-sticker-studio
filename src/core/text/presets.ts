import { BUSINESS_PRESET } from './presets/business.js';
import { COUPLE_PRESET } from './presets/couple.js';
import { DAILY_PRESET } from './presets/daily.js';
import { FAMILY_PRESET } from './presets/family.js';
import { FRIENDS_PRESET } from './presets/friends.js';
import { SCHOOL_PRESET } from './presets/school.js';
import type { UsePreset, UsePresetId } from './presets/types.js';

/**
 * 用途プリセット。
 *
 * 増やすときはこの配列にファイルを足すだけでよい。
 * 45件そろっているか、セリフが重複していないかはテストが検証する。
 */
export const USE_PRESETS: readonly UsePreset[] = [
  DAILY_PRESET,
  FRIENDS_PRESET,
  FAMILY_PRESET,
  SCHOOL_PRESET,
  BUSINESS_PRESET,
  COUPLE_PRESET,
];

export function findPreset(id: UsePresetId): UsePreset {
  const found = USE_PRESETS.find((preset) => preset.id === id);
  if (!found) throw new Error(`用途 ${id} がありません`);
  return found;
}

export type { SlotText, Tone, UsePreset, UsePresetId } from './presets/types.js';
export { TONE_LABELS } from './presets/types.js';
