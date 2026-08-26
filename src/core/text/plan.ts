import { STICKERS_PER_SHEET, candidateCountFor, sheetCountFor } from '../../config/line-spec.js';
import { CATEGORY_COUNT, categoryAt, roundAt } from './categories.js';
import type { CategoryId } from './categories.js';
import { poseAt } from './poses.js';
import type { PoseDesign } from './poses.js';
import { findPreset } from './presets.js';
import type { Tone, UsePresetId } from './presets.js';

/**
 * スタンプ1個分の計画。
 *
 * PRODUCT_SPEC.md §30 のデータモデルに、設計の内訳（カテゴリ・ポーズ）を足したもの。
 * 内訳を持っておくことで、画像生成プロンプトに具体的な指示を書ける。
 */
export interface StickerPlan {
  /** 1始まりの通し番号 */
  id: number;
  text: string;
  /** 表情とポーズを1文にまとめたもの */
  action: string;
  /** 1始まりのシート番号 */
  sheet: number;
  /** シート内の位置（1〜9） */
  position: number;
  enabled: boolean;
  category: CategoryId;
  pose: PoseDesign;
}

export interface PlanOptions {
  preset: UsePresetId;
  tone: Tone;
  /** 作りたいスタンプの個数（8/16/24/32/40） */
  targetCount: number;
}

/**
 * 用途・言葉づかい・個数から、候補ぶんの計画を組み立てる。
 *
 * 候補数は ceil(個数 / 9) × 9。並びは「9カテゴリ × 5周」なので、
 * 何件で切っても9つのカテゴリが均等に入る。
 * 1周がそのまま1シートに対応するため、各シートは必ず9種類バラバラになる。
 */
export function buildPlans(options: PlanOptions): StickerPlan[] {
  const preset = findPreset(options.preset);
  const count = candidateCountFor(options.targetCount);
  const plans: StickerPlan[] = [];

  for (let id = 1; id <= count; id++) {
    const slot = preset.texts[id - 1];
    if (!slot) break;
    const pose = poseAt(id);

    plans.push({
      id,
      text: slot[options.tone],
      action: describePose(pose),
      sheet: roundAt(id) + 1,
      position: ((id - 1) % CATEGORY_COUNT) + 1,
      enabled: id <= options.targetCount,
      category: categoryAt(id),
      pose,
    });
  }

  return plans;
}

/**
 * ポーズ設計を、画像生成AIへ渡す1文にまとめる。
 *
 * emotion は「様子」へそのまま続く形で持っているので、機械的に「な」を足さない。
 * 「明るいな様子で」のような壊れた日本語になり、これはユーザーにもAIにも渡る。
 * 小物は pose 側の文に書き込んであるため、ここでは足さない。
 */
export function describePose(pose: PoseDesign): string {
  return `${pose.emotion}様子で${pose.pose}`;
}

/** 計画をシートごとに分ける。 */
export function groupBySheet(plans: StickerPlan[]): StickerPlan[][] {
  const sheets: StickerPlan[][] = [];
  for (const plan of plans) {
    const index = plan.sheet - 1;
    const bucket = sheets[index] ?? [];
    bucket.push(plan);
    sheets[index] = bucket;
  }
  return sheets;
}

/** 必要なシート枚数。 */
export function sheetsNeeded(targetCount: number): number {
  return sheetCountFor(targetCount);
}

export { STICKERS_PER_SHEET };
