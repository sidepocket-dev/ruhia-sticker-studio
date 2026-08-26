import type { Bytes } from '../core/bytes.js';
import { encodePng } from '../core/image/png.js';
import type { ImageLayout } from '../core/line/layout.js';
import type { PixelBuffer, Rect } from '../core/image/types.js';
import type { LoadedSheet } from './decode.js';

/**
 * シートの一部を、指定した設計どおりに描き出す。
 *
 * キャンバスは初期状態で透明なので、描いた部分以外は透明のまま残る。
 * これがLINEの求める「背景が透明」を満たす。
 *
 * excludeRects は、切り出し範囲に入り込んだ別のスタンプの画素。
 * 元の解像度で消してから縮小する。縮小後に消すと、
 * 縮小でにじんだ相手の色が残る。
 */
export function renderToPixels(
  sheet: LoadedSheet,
  source: Rect,
  layout: ImageLayout,
  excludeRects: readonly Rect[] = [],
): PixelBuffer {
  const canvas = new OffscreenCanvas(layout.canvas.width, layout.canvas.height);
  // 画素をそのまま読み出すので、はじめからCPU側に置いてもらう
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('画像を作れませんでした');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  if (excludeRects.length === 0) {
    context.drawImage(
      sheet.bitmap,
      source.x,
      source.y,
      source.width,
      source.height,
      layout.draw.x,
      layout.draw.y,
      layout.draw.width,
      layout.draw.height,
    );
  } else {
    context.drawImage(cleanedSource(sheet, source, excludeRects), 0, 0, source.width, source.height, layout.draw.x, layout.draw.y, layout.draw.width, layout.draw.height);
  }

  const imageData = context.getImageData(0, 0, layout.canvas.width, layout.canvas.height);
  return { data: imageData.data, width: layout.canvas.width, height: layout.canvas.height };
}

/** 元の大きさのまま切り出し、別のスタンプの画素を消したものを作る。 */
function cleanedSource(
  sheet: LoadedSheet,
  source: Rect,
  excludeRects: readonly Rect[],
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(source.width, source.height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('画像を作れませんでした');

  context.drawImage(
    sheet.bitmap,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    source.width,
    source.height,
  );

  for (const rect of excludeRects) {
    context.clearRect(rect.x - source.x, rect.y - source.y, rect.width, rect.height);
  }

  return canvas;
}

export function renderToPng(
  sheet: LoadedSheet,
  source: Rect,
  layout: ImageLayout,
  excludeRects: readonly Rect[] = [],
): Bytes {
  return encodePng(renderToPixels(sheet, source, layout, excludeRects));
}
