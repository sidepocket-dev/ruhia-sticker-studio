import { LINE_STATIC_STICKER_SPEC } from '../../config/line-spec.js';
import type { Rect } from '../image/types.js';

export interface Size {
  width: number;
  height: number;
}

/** 1枚の書き出し設計。canvas の中の draw の位置へ内容を描く。 */
export interface ImageLayout {
  canvas: Size;
  draw: Rect;
  scale: number;
}

export interface StickerSetLayout {
  layouts: ImageLayout[];
  /** セット全体に適用した共通の倍率 */
  scale: number;
  /** 元の解像度より拡大したか（拡大するとぼやけるため警告の材料になる） */
  upscaled: boolean;
}

/** LINEは幅・高さともに偶数を求める。 */
export function toEven(value: number): number {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded + 1;
}

/**
 * スタンプ画像の書き出し設計を、セット全体でまとめて決める。
 *
 * 1枚ずつ最大化しないのは、キャラクターの体格が崩れるため。
 * しゃがんだポーズと立ったポーズを別々に最大化すると、LINE上で同じ大きさに
 * 表示されてしまう。セット全体を共通の倍率で縮小し、一番大きいスタンプが
 * ちょうど収まるようにすることで、相対的な大小関係を保ったまま
 * 最大限大きく表示できる（PRODUCT_SPEC.md §42 / §77.8）。
 */
export function computeStickerSetLayout(
  contents: Size[],
  marginPx: number,
): StickerSetLayout {
  const { maxWidth, maxHeight } = LINE_STATIC_STICKER_SPEC.sticker;
  const availableWidth = maxWidth - marginPx * 2;
  const availableHeight = maxHeight - marginPx * 2;

  if (contents.length === 0) return { layouts: [], scale: 1, upscaled: false };

  const largestWidth = Math.max(...contents.map((c) => c.width));
  const largestHeight = Math.max(...contents.map((c) => c.height));

  // 拡大はしない。元の解像度を超えて引き伸ばすとぼやけるため。
  const scale = Math.min(availableWidth / largestWidth, availableHeight / largestHeight, 1);

  const layouts = contents.map((content) => fitInto(content, scale, marginPx, maxWidth, maxHeight));
  const upscaled = availableWidth / largestWidth > 1 && availableHeight / largestHeight > 1;

  return { layouts, scale, upscaled };
}

/** 決まったサイズのキャンバスへ、内容を収まるだけ大きく中央配置する。 */
export function computeFixedLayout(content: Size, canvas: Size, marginPx: number): ImageLayout {
  const availableWidth = Math.max(2, canvas.width - marginPx * 2);
  const availableHeight = Math.max(2, canvas.height - marginPx * 2);
  const scale = Math.min(availableWidth / content.width, availableHeight / content.height);

  const drawWidth = Math.max(1, Math.round(content.width * scale));
  const drawHeight = Math.max(1, Math.round(content.height * scale));

  return {
    canvas,
    draw: {
      x: Math.round((canvas.width - drawWidth) / 2),
      y: Math.round((canvas.height - drawHeight) / 2),
      width: drawWidth,
      height: drawHeight,
    },
    scale,
  };
}

/** タブ画像のように、拡大率と位置をユーザーが決める場合の配置。 */
export interface CropAdjustment {
  /** 1 = ちょうど収まる大きさ */
  zoom: number;
  /** キャンバス中心からのずれ（キャンバスの画素数） */
  offsetX: number;
  offsetY: number;
}

export const NEUTRAL_CROP: CropAdjustment = { zoom: 1, offsetX: 0, offsetY: 0 };

export function computeAdjustedLayout(
  content: Size,
  canvas: Size,
  adjustment: CropAdjustment,
): ImageLayout {
  const baseScale = Math.min(canvas.width / content.width, canvas.height / content.height);
  const scale = baseScale * adjustment.zoom;

  const drawWidth = Math.max(1, Math.round(content.width * scale));
  const drawHeight = Math.max(1, Math.round(content.height * scale));

  return {
    canvas,
    draw: {
      x: Math.round((canvas.width - drawWidth) / 2 + adjustment.offsetX),
      y: Math.round((canvas.height - drawHeight) / 2 + adjustment.offsetY),
      width: drawWidth,
      height: drawHeight,
    },
    scale,
  };
}

function fitInto(
  content: Size,
  scale: number,
  marginPx: number,
  maxWidth: number,
  maxHeight: number,
): ImageLayout {
  const drawWidth = Math.max(1, Math.round(content.width * scale));
  const drawHeight = Math.max(1, Math.round(content.height * scale));

  const canvas: Size = {
    width: Math.min(maxWidth, toEven(drawWidth + marginPx * 2)),
    height: Math.min(maxHeight, toEven(drawHeight + marginPx * 2)),
  };

  return {
    canvas,
    draw: {
      x: Math.round((canvas.width - drawWidth) / 2),
      y: Math.round((canvas.height - drawHeight) / 2),
      width: drawWidth,
      height: drawHeight,
    },
    scale,
  };
}
