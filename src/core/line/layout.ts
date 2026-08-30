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
 * スタンプ画像の書き出し設計を決める。
 *
 * **1枚ずつ、上限まで大きくする。**
 *
 * 以前はセット全体で同じ倍率を使い、シートでの大小関係を保っていた。
 * だが**その大小はポーズの副産物**で、作者が意図した演出ではない。
 * お辞儀して縮こまった絵が小さくなっていただけだった。
 *
 * 一方で、LINEでは上限に近いほうが有利という制作者の経験則がある
 * （小さいと一覧でぼやける／視認性でリジェクトされる）。
 * 公式は「最大370×320。サイズはバラバラでも可」としか言っておらず、
 * **アップロードした画像がどう表示されるかは確かめられていない。**
 *
 * そこで、表示の仕組みが分からなくても不利にならない側を選ぶ。
 * 1枚ずつ上限いっぱいにすれば、実寸で並ぶ場合も枠に合わせる場合も
 * キャラクターがいちばん大きく出る（PRODUCT_SPEC.md §77.8）。
 *
 * **拡大はしない。** 元の解像度を超えて引き伸ばすとぼやけるため、
 * 倍率は 1 で頭打ちにする。実シートは1枚1200px前後あるので、
 * 実際には全部が縮小の範囲に収まる。
 *
 * 縦長のキャラクターでは高さが先に頭打ちになるため、
 * **揃うのは高さだけで、幅は絵の形しだいで散らばる。**
 */
export function computeStickerSetLayout(
  contents: Size[],
  marginPx: number,
): StickerSetLayout {
  const { maxWidth, maxHeight } = LINE_STATIC_STICKER_SPEC.sticker;
  const availableWidth = maxWidth - marginPx * 2;
  const availableHeight = maxHeight - marginPx * 2;

  if (contents.length === 0) return { layouts: [], scale: 1, upscaled: false };

  /** 1枚ぶんの倍率。上限に触れるまで。ただし拡大はしない */
  const scaleFor = (content: Size): number =>
    Math.min(availableWidth / content.width, availableHeight / content.height, 1);

  const layouts = contents.map((content) =>
    fitInto(content, scaleFor(content), marginPx, maxWidth, maxHeight),
  );

  // 代表値。倍率は1枚ずつ違うので、いちばん小さいもの（いちばん縮めたもの）を返す
  const scale = Math.min(...contents.map(scaleFor));
  // 1枚でも上限に届かなかった（元が小さすぎた）なら、引き伸ばしていない印
  const upscaled = contents.some((content) => scaleFor(content) === 1
    && content.width < availableWidth && content.height < availableHeight);

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
