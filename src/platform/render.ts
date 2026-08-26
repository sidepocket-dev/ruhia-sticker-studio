import type { Bytes } from '../core/bytes.js';
import { encodePng } from '../core/image/png.js';
import type { ImageLayout } from '../core/line/layout.js';
import type { PixelBuffer, Rect } from '../core/image/types.js';
import type { LoadedSheet } from './decode.js';

/**
 * シートの一部を、指定した設計どおりのPNGへ描き出す。
 *
 * キャンバスは初期状態で透明なので、描いた部分以外は透明のまま残る。
 * これがLINEの求める「背景が透明」を満たす。
 *
 * PNGへの変換はブラウザ任せにせず自前で行う（core/image/png.ts 参照）。
 * ブラウザの変換は環境によって1枚あたり1秒近くかかることがあり、
 * 40個セットの書き出しが実用に耐えなかった。
 */
export function renderToPng(sheet: LoadedSheet, source: Rect, layout: ImageLayout): Bytes {
  return encodePng(renderToPixels(sheet, source, layout));
}

export function renderToPixels(
  sheet: LoadedSheet,
  source: Rect,
  layout: ImageLayout,
): PixelBuffer {
  const canvas = new OffscreenCanvas(layout.canvas.width, layout.canvas.height);
  // 画素をそのまま読み出すので、はじめからCPU側に置いてもらう
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('画像を作れませんでした');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
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

  const imageData = context.getImageData(0, 0, layout.canvas.width, layout.canvas.height);
  return { data: imageData.data, width: layout.canvas.width, height: layout.canvas.height };
}

/** 同じ内容を、画面表示用のURLとして得る。 */
export function renderToObjectUrl(sheet: LoadedSheet, source: Rect, layout: ImageLayout): string {
  const bytes = renderToPng(sheet, source, layout);
  return URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
}
