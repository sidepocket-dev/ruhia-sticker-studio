/** 言葉づかい。 */
export type Tone = 'polite' | 'casual';

export const TONE_LABELS: Record<Tone, string> = {
  polite: 'ていねい',
  casual: 'カジュアル',
};

export interface SlotText {
  polite: string;
  casual: string;
}

export type UsePresetId = 'daily' | 'business' | 'friends' | 'couple' | 'school' | 'family';

export interface UsePreset {
  id: UsePresetId;
  label: string;
  /** どんな場面向けかの一言説明。UIに出す。 */
  description: string;
  /** どちらの言葉づかいを最初に見せるか。 */
  defaultTone: Tone;
  /**
   * 45件のセリフ。位置1〜45に対応する。
   * 並びは「9カテゴリ × 5周」（categories.ts 参照）。
   */
  texts: readonly SlotText[];
}
